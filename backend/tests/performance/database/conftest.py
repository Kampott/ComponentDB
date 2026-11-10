import datetime
import sys
import random
import statistics
import os
from pathlib import Path

_backend_root = Path(__file__).resolve().parents[3]
if str(_backend_root) not in sys.path:
    sys.path.append(str(_backend_root))

import pytest
import pandas as pd
from sqlalchemy import text
from sqlalchemy.dialects.postgresql import insert as pg_insert

from app.db.database import async_session
from app.models.core import Instances, Objects, Types
from app.crud.core.dfs import recalculate_tree

try:
    from pytest_asyncio import fixture as async_fixture
except ImportError:
    async_fixture = pytest.fixture


def log(msg):
    t = datetime.datetime.now().strftime("%H:%M:%S.%f")[:-3]
    print(f"[{t}] {msg}", flush=True)


BENCHMARK_TOTAL_TREES = int(os.environ.get("BENCHMARK_TOTAL_TREES", "10000"))
BENCHMARK_INSERT_BATCH = int(os.environ.get("BENCHMARK_INSERT_BATCH", str(BENCHMARK_TOTAL_TREES)))

_CHUNK_SIZE = 50000  # rows per raw-VALUES INSERT chunk

benchmark_results: list[dict] = []


def pytest_configure(config):
    config.addinivalue_line("markers", "benchmark: performance benchmark test")


def pytest_sessionfinish(session, exitstatus):
    if not benchmark_results:
        return
    df = pd.DataFrame(benchmark_results)
    df.to_csv("benchmark_results.csv", index=False)
    print("\n" + "=" * 100)
    print("BENCHMARK RESULTS")
    print("=" * 100)
    print(df.to_string(index=False))
    print("=" * 100)


_REQUIRED_INSTANCE_INDEXES = [
    "CREATE INDEX IF NOT EXISTS ix_instances_parent_id ON instances(parent_id)",
    "CREATE INDEX IF NOT EXISTS ix_instances_tin ON instances(tin)",
    "CREATE INDEX IF NOT EXISTS ix_instances_tout ON instances(tout)",
    "CREATE INDEX IF NOT EXISTS ix_instances_root_id ON instances(root_id)",
]
_ALL_INSTANCE_INDEXES = _REQUIRED_INSTANCE_INDEXES + [
    "CREATE INDEX IF NOT EXISTS idx_instances_root_parent_inst ON instances(root_id, parent_id)",
    "CREATE INDEX IF NOT EXISTS idx_rootid_tin_tout_inst ON instances(root_id, tin, tout)",
]
_ALL_INSTANCE_INDEX_NAMES = [
    "ix_instances_parent_id", "ix_instances_tin", "ix_instances_tout",
    "ix_instances_root_id",
    "idx_instances_root_parent_inst", "idx_rootid_tin_tout_inst",
]

# ---------------------------------------------------------------------------
# Shared benchmark helpers (imported by test_benchmark*.py)
# ---------------------------------------------------------------------------
_PRODUCTION_INDEXES = {
    "root_tin_tout":  ("idx_bench_d",  "CREATE INDEX IF NOT EXISTS idx_bench_d ON instances(root_id, tin, tout)"),
    "root_parent":    ("idx_bench_e",  "CREATE INDEX IF NOT EXISTS idx_bench_e ON instances(root_id, parent_id)"),
}


async def _create_index(session, variant: str):
    single = {
        "A": "CREATE INDEX IF NOT EXISTS idx_bench_a ON instances(tin, tout, tree_size)",
        "B": "CREATE INDEX IF NOT EXISTS idx_bench_b ON instances(root_id)",
        "C": "CREATE INDEX IF NOT EXISTS idx_bench_c ON instances(parent_id)",
        "D": "CREATE INDEX IF NOT EXISTS idx_bench_d ON instances(root_id, tin, tout)",
        "E": "CREATE INDEX IF NOT EXISTS idx_bench_e ON instances(root_id, parent_id)",
    }
    if variant == "ALL":
        for _, stmt in _PRODUCTION_INDEXES.values():
            await session.execute(text(stmt))
    else:
        await session.execute(text(single[variant]))
    await session.commit()


async def _drop_composite_prod_indexes(session):
    for name in ["idx_instances_root_parent_inst", "idx_rootid_tin_tout_inst"]:
        await session.execute(text(f"DROP INDEX IF EXISTS {name}"))
    await session.commit()


async def _drop_index(session, variant: str):
    single = {
        "A": "idx_bench_a", "B": "idx_bench_b", "C": "idx_bench_c",
        "D": "idx_bench_d", "E": "idx_bench_e",
    }
    if variant == "ALL":
        for name, _ in _PRODUCTION_INDEXES.values():
            await session.execute(text(f"DROP INDEX IF EXISTS {name}"))
    else:
        await session.execute(text(f"DROP INDEX IF EXISTS {single[variant]}"))
    await session.commit()


async def _measure_table_sizes(session) -> dict:
    r = await session.execute(text("""
        SELECT
            pg_total_relation_size('instances') / 1048576.0 AS total_mb,
            pg_indexes_size('instances') / 1048576.0 AS indexes_mb,
            pg_relation_size('instances') / 1048576.0 AS table_mb
    """))
    row = r.one()
    return {
        "table_mb": round(row.table_mb, 2),
        "indexes_mb": round(row.indexes_mb, 2),
        "total_mb": round(row.total_mb, 2),
    }


async def _bench_delete(session, root_id: int):
    await session.execute(
        text("DELETE FROM instances WHERE id = :rid"), {"rid": root_id}
    )
    await session.commit()


async def _bench_select_dfs(session, data: dict):
    tin, tout, root_id = random.choice(data["subtrees"])
    await session.execute(
        text("SELECT * FROM instances WHERE tin >= :tin AND tout <= :tout AND root_id = :root_id ORDER BY tin"),
        {"tin": tin, "tout": tout, "root_id": root_id},
    )


async def _bench_select_root_id(session, data: dict):
    root_id = random.choice(data["root_ids"])
    await session.execute(
        text("SELECT * FROM instances WHERE root_id = :root_id"),
        {"root_id": root_id},
    )


async def _bench_select_cte(session, data: dict):
    node_id = random.choice(data["random_node_ids"])
    await session.execute(
        text("""
            WITH RECURSIVE tree AS (
                SELECT * FROM instances WHERE id = :root_id
                UNION ALL
                SELECT i.* FROM instances i JOIN tree t ON i.parent_id = t.id
            )
            SELECT * FROM tree
        """),
        {"root_id": node_id},
    )


def _make_result(variant: str, operation: str, samples: list[float]) -> dict:
    return {
        "index_variant": variant,
        "operation": operation,
        "mean_ms": round(statistics.mean(samples), 3),
        "stddev_ms": round(statistics.pstdev(samples), 3),
        "min_ms": round(min(samples), 3),
        "max_ms": round(max(samples), 3),
        "iterations": len(samples),
    }


@async_fixture(scope="module")
async def db_session():
    s = async_session()
    for name in [f"idx_bench_{v}" for v in ("a","b","c","d","e")]:
        await s.execute(text(f"DROP INDEX IF EXISTS {name}"))
    await s.commit()
    return s


def _build_tree(depth=3, children_range=(2, 3), seed=42):
    rng = random.Random(seed)
    nodes: list[dict] = []
    counter = [0]
    def create(parent_idx, level):
        idx = len(nodes)
        tin = counter[0]; counter[0] += 1
        node = {"idx":idx,"parent_idx":parent_idx,"tin":None,"tout":None,"tree_size":None,"level":level}
        nodes.append(node)
        if level < depth:
            for _ in range(rng.randint(*children_range)):
                create(idx, level+1)
        tout = counter[0]; counter[0] += 1
        node.update({"tin":tin,"tout":tout,"tree_size":(tout-tin+1)//2})
        return idx
    create(-1, 0)
    return nodes


async def _insert_one_tree(session, data, tree_idx, commit=False):
    rel_nodes = data["rel_nodes"]; object_ids = data["object_ids"]; tree_range = data["tree_range"]
    offset = tree_idx * tree_range
    levels: dict[int,list[dict]] = {}
    for n in rel_nodes:
        levels.setdefault(n["level"],[]).append(n)
    id_map: dict[int,int] = {}
    root_id = None
    for level in sorted(levels):
        rows = []
        for node in levels[level]:
            parent_id = id_map.get(node["parent_idx"]) if node["parent_idx"]>=0 else None
            rows.append({"name":f"t{tree_idx}_n{node['idx']}","object_id":object_ids[node["idx"]],
                "parent_id":parent_id,"root_id":root_id,"is_active":True,
                "tin":offset+node["tin"],"tout":offset+node["tout"],"tree_size":node["tree_size"]})
        result = await session.execute(pg_insert(Instances).values(rows).returning(Instances.id,Instances.tin))
        for actual_id, actual_tin in result.all():
            rel_tin = actual_tin % tree_range
            for n in levels[level]:
                if n["tin"]==rel_tin:
                    id_map[n["idx"]] = actual_id
                    if n["idx"]==0: root_id = actual_id
                    break
        if level==0 and root_id is not None:
            await session.execute(text("UPDATE instances SET root_id=:rid WHERE id=:rid"),{"rid":root_id})
    if commit: await session.commit()
    return root_id


def _sql_val(v):
    if v is None: return "NULL"
    if isinstance(v, bool): return "TRUE" if v else "FALSE"
    if isinstance(v, str): return "'" + v.replace("'", "''") + "'"
    return str(v)

_INSERT_COLS = ("name","object_id","parent_id","root_id","is_active","tin","tout","tree_size")


async def _insert_trees_bulk(session, data, tree_indices, verbose=False):
    if not tree_indices: return
    rel_nodes = data["rel_nodes"]; object_ids = data["object_ids"]; tree_range = data["tree_range"]
    levels: dict[int,list[dict]] = {}
    for n in rel_nodes: levels.setdefault(n["level"],[]).append(n)

    id_map: dict[int,dict[int,int]] = {}

    for level in sorted(levels):
        level_nodes = levels[level]
        tin_to_node = {n["tin"]:n for n in level_nodes}
        n_trees = len(tree_indices)
        n_nodes = len(level_nodes)
        total_rows = n_trees * n_nodes

        if verbose:
            log(f"  Level {level}: building {total_rows} rows ({n_trees} trees × {n_nodes} nodes)...")

        rows = []
        for t in tree_indices:
            offset = t * tree_range
            tree_map = id_map.setdefault(t, {})
            root_id = tree_map.get(0)
            for node in level_nodes:
                rows.append({
                    "name":f"t{t}_n{node['idx']}","object_id":object_ids[node["idx"]],
                    "parent_id":tree_map.get(node["parent_idx"]) if node["parent_idx"]>=0 else None,
                    "root_id":root_id,"is_active":True,
                    "tin":offset+node["tin"],"tout":offset+node["tout"],"tree_size":node["tree_size"]})

        num_chunks = (total_rows + _CHUNK_SIZE - 1)//_CHUNK_SIZE
        if verbose:
            log(f"  Level {level}: INSERTing {total_rows} rows in {num_chunks} chunks (chunk_size={_CHUNK_SIZE})...")
        for chunk_start in range(0,total_rows,_CHUNK_SIZE):
            chunk = rows[chunk_start:chunk_start+_CHUNK_SIZE]
            vals = ",".join(
                "(" + ",".join(_sql_val(r[c]) for c in _INSERT_COLS) + ")"
                for r in chunk
            )
            sql = ("INSERT INTO instances (name,object_id,parent_id,root_id,is_active,tin,tout,tree_size) "
                   "VALUES " + vals + " RETURNING id,tin")
            result = await session.execute(text(sql))
            for actual_id, actual_tin in result.all():
                t = actual_tin // tree_range
                rel_tin = actual_tin % tree_range
                id_map[t][tin_to_node[rel_tin]["idx"]] = actual_id

        if level==0:
            root_ids = [id_map[t][0] for t in tree_indices if t in id_map and id_map[t].get(0) is not None]
            if root_ids:
                await session.execute(text("UPDATE instances SET root_id=id WHERE id=ANY(:ids)"),{"ids":root_ids})

    await session.commit()


@async_fixture(scope="module")
async def synthetic_data(db_session):
    session = db_session
    log("=" * 60)
    log("SYNTHETIC DATA GENERATION")
    log("=" * 60)

    await session.execute(text("TRUNCATE types, objects, instances RESTART IDENTITY CASCADE"))
    await session.commit()
    log("DB truncated (clean slate).")

    rel_nodes = _build_tree(depth=3, children_range=(2,3), seed=42)
    tree_range = 2*len(rel_nodes)
    total_trees = BENCHMARK_TOTAL_TREES
    log(f"Reference tree: {len(rel_nodes)} nodes, tree_range={tree_range}")

    log("Creating type tree (1 Types row)...")
    root_type = Types(name="bench_root_type")
    session.add(root_type)
    await session.flush()
    await session.commit()
    log(f"Type tree committed. root_type.id={root_type.id}")

    log("Creating object tree...")
    obj_result = await session.execute(
        pg_insert(Objects).values([
            {"name":f"obj_{n['idx']}","type_id":root_type.id,"parent_id":None,"root_id":None}
            for n in rel_nodes
        ]).returning(Objects.id))
    object_ids = list(obj_result.scalars().all())
    for i,n in enumerate(rel_nodes):
        if n["parent_idx"]>=0:
            await session.execute(text("UPDATE objects SET parent_id=:pid WHERE id=:id"),
                {"pid":object_ids[n["parent_idx"]],"id":object_ids[i]})
    root_obj_id = object_ids[0]
    await session.execute(text("UPDATE objects SET root_id=:rid WHERE id=:rid"),{"rid":root_obj_id})
    if len(object_ids)>1:
        await session.execute(text("UPDATE objects SET root_id=:rid WHERE id=ANY(:ids)"),
            {"rid":root_obj_id,"ids":object_ids[1:]})
    await recalculate_tree(session, Objects, root_obj_id)
    await session.commit()
    log(f"Object tree committed. {len(object_ids)} objects, root={root_obj_id}.")

    log("Dropping all non-PK indexes for fastest bulk insert...")
    for name in _ALL_INSTANCE_INDEX_NAMES:
        await session.execute(text(f"DROP INDEX IF EXISTS {name}"))
    await session.commit()
    log("Indexes dropped.")

    data = {"rel_nodes":rel_nodes,"object_ids":object_ids,"tree_range":tree_range}
    tree_indices = list(range(total_trees))
    batch_size = min(BENCHMARK_INSERT_BATCH, total_trees)

    log(f"Inserting {total_trees} instance trees in a single batch of {batch_size}...")
    log(f"Total rows: {total_trees * len(rel_nodes)} ({total_trees} trees × {len(rel_nodes)} nodes)")

    await _insert_trees_bulk(session, data, tree_indices, verbose=True)
    log("All instance trees inserted and committed.")

    log("Recreating single-column indexes (parent_id, tin, tout, root_id)...")
    for stmt in _REQUIRED_INSTANCE_INDEXES:
        await session.execute(text(stmt))
    await session.commit()
    log("Indexes recreated.")

    result = await session.execute(text("SELECT id FROM instances WHERE parent_id IS NULL ORDER BY id"))
    root_ids = list(result.scalars().all())

    import random as _random
    subtrees = []
    for t in range(total_trees):
        offset = t * tree_range
        node = _random.choice(rel_nodes)
        subtrees.append((offset+node["tin"], offset+node["tout"], root_ids[t]))

    result = await session.execute(text("SELECT id FROM instances ORDER BY RANDOM() LIMIT 100"))
    random_node_ids = list(result.scalars().all())

    data["total_trees"] = total_trees
    data["root_ids"] = root_ids
    data["subtrees"] = subtrees
    data["random_node_ids"] = random_node_ids

    log(f"Synthetic data complete: {total_trees} trees, {total_trees*len(rel_nodes)} rows")
    log("=" * 60)

    yield data

    log("Teardown: CASCADE delete type root...")
    await session.execute(text("DELETE FROM types WHERE id=:id"),{"id":root_type.id})
    await session.commit()
    log("Teardown complete.")
