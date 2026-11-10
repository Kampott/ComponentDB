import sys
import time
import statistics
from pathlib import Path

_db_dir = str(Path(__file__).resolve().parent)
if _db_dir not in sys.path: sys.path.insert(0, _db_dir)

import pytest
from sqlalchemy import text
from sqlalchemy.dialects.postgresql import insert as pg_insert

from app.models.core import Instances, Objects, Types
from app.crud.core.dfs import recalculate_tree

import os

from conftest import (
    benchmark_results,
    log,
    async_fixture,
    _insert_trees_bulk,
    _insert_one_tree,
    BENCHMARK_TOTAL_TREES,
    BENCHMARK_INSERT_BATCH,
    _CHUNK_SIZE,
    _ALL_INSTANCE_INDEX_NAMES,
    _REQUIRED_INSTANCE_INDEXES,
    _create_index,
    _drop_composite_prod_indexes,
    _drop_index,
    _measure_table_sizes,
    _bench_delete,
    _bench_select_dfs,
    _bench_select_root_id,
    _bench_select_cte,
    _make_result,
)

BENCHMARK_DEEP_TOTAL_TREES = int(os.environ.get("BENCHMARK_DEEP_TOTAL_TREES", "10000"))


def _build_deep_tree():
    """10-layer tree: 1 root, 2 nodes at level 1, then 2 nodes per level 2-9."""
    nodes = []
    def create(parent_idx, level):
        idx = len(nodes)
        node = {"idx": idx, "parent_idx": parent_idx, "tin": None, "tout": None, "tree_size": None, "level": level}
        nodes.append(node)
        return idx

    root_idx = create(-1, 0)
    prev = [create(root_idx, 1) for _ in range(2)]
    for level in range(2, 10):
        prev = [create(p, level) for p in prev]

    counter = [0]
    def dfs_assign(idx):
        n = nodes[idx]
        n["tin"] = counter[0]; counter[0] += 1
        children = [x for x in nodes if x["parent_idx"] == idx]
        for c in children:
            dfs_assign(c["idx"])
        n["tout"] = counter[0]; counter[0] += 1
        n["tree_size"] = (n["tout"] - n["tin"] + 1) // 2

    dfs_assign(root_idx)
    return nodes


@async_fixture(scope="module")
async def synthetic_data_deep(db_session):
    session = db_session
    log("=" * 60)
    log("DEEP TREE SYNTHETIC DATA GENERATION")
    log("=" * 60)

    await session.execute(text("TRUNCATE types, objects, instances RESTART IDENTITY CASCADE"))
    await session.commit()
    log("DB truncated (clean slate).")

    rel_nodes = _build_deep_tree()
    tree_range = 2 * len(rel_nodes)
    total_trees = BENCHMARK_DEEP_TOTAL_TREES
    log(f"Deep tree: {len(rel_nodes)} nodes, tree_range={tree_range}")

    log("Creating type tree (1 Types row)...")
    root_type = Types(name="bench_deep_root_type")
    session.add(root_type)
    await session.flush()
    await session.commit()
    log(f"Type tree committed. root_type.id={root_type.id}")

    log("Creating object tree...")
    obj_result = await session.execute(
        pg_insert(Objects).values([
            {"name": f"obj_{n['idx']}", "type_id": root_type.id, "parent_id": None, "root_id": None}
            for n in rel_nodes
        ]).returning(Objects.id))
    object_ids = list(obj_result.scalars().all())

    for i, n in enumerate(rel_nodes):
        if n["parent_idx"] >= 0:
            await session.execute(text("UPDATE objects SET parent_id=:pid WHERE id=:id"),
                {"pid": object_ids[n["parent_idx"]], "id": object_ids[i]})
    root_obj_id = object_ids[0]
    await session.execute(text("UPDATE objects SET root_id=:rid WHERE id=:rid"), {"rid": root_obj_id})
    if len(object_ids) > 1:
        await session.execute(text("UPDATE objects SET root_id=:rid WHERE id=ANY(:ids)"),
            {"rid": root_obj_id, "ids": object_ids[1:]})
    await recalculate_tree(session, Objects, root_obj_id)
    await session.commit()
    log(f"Object tree committed. {len(object_ids)} objects, root={root_obj_id}.")

    log("Dropping all non-PK indexes...")
    for name in _ALL_INSTANCE_INDEX_NAMES:
        await session.execute(text(f"DROP INDEX IF EXISTS {name}"))
    await session.commit()

    data = {"rel_nodes": rel_nodes, "object_ids": object_ids, "tree_range": tree_range}
    tree_indices = list(range(total_trees))

    log(f"Inserting {total_trees} instance trees in a single batch...")
    log(f"Total rows: {total_trees * len(rel_nodes)} ({total_trees} trees × {len(rel_nodes)} nodes)")
    await _insert_trees_bulk(session, data, tree_indices, verbose=True)
    log("All instance trees inserted and committed.")

    log("Recreating single-column indexes...")
    for stmt in _REQUIRED_INSTANCE_INDEXES:
        await session.execute(text(stmt))
    await session.commit()

    result = await session.execute(text("SELECT id FROM instances WHERE parent_id IS NULL ORDER BY id"))
    root_ids = list(result.scalars().all())

    import random as _random
    subtrees = []
    for t in range(total_trees):
        offset = t * tree_range
        node = _random.choice(rel_nodes)
        subtrees.append((offset + node["tin"], offset + node["tout"], root_ids[t]))

    result = await session.execute(text("SELECT id FROM instances ORDER BY RANDOM() LIMIT 100"))
    random_node_ids = list(result.scalars().all())

    data["total_trees"] = total_trees
    data["root_ids"] = root_ids
    data["subtrees"] = subtrees
    data["random_node_ids"] = random_node_ids

    log(f"Synthetic data complete: {total_trees} trees, {total_trees * len(rel_nodes)} rows")
    log("=" * 60)

    yield data

    log("Teardown: CASCADE delete type root...")
    await session.execute(text("DELETE FROM types WHERE id=:id"), {"id": root_type.id})
    await session.commit()
    log("Teardown complete.")


@pytest.mark.benchmark
@pytest.mark.asyncio
@pytest.mark.parametrize("index_variant", ["A", "B", "C", "D", "E", "ALL"])
async def test_benchmark_deep(db_session, synthetic_data_deep, index_variant: str):
    data = synthetic_data_deep
    next_idx = [data["total_trees"]]

    log(f"[{index_variant}] ========================================")
    log(f"[{index_variant}] Dropping composite production indexes...")
    await _drop_composite_prod_indexes(db_session)

    log(f"[{index_variant}] Creating index...")
    t0 = time.perf_counter()
    await _create_index(db_session, index_variant)
    t1 = time.perf_counter()
    log(f"[{index_variant}] Index created in {(t1-t0)*1000:.0f}ms.")

    sizes = await _measure_table_sizes(db_session)
    benchmark_results.append({
        "index_variant": f"DEEP_{index_variant}",
        "operation": "db_size_with_index",
        "mean_ms": 0, "stddev_ms": 0, "min_ms": 0, "max_ms": 0, "iterations": 1,
        **sizes,
    })
    log(f"[{index_variant}] Table: {sizes['total_mb']}MB total, {sizes['indexes_mb']}MB indexes, {sizes['table_mb']}MB data")

    try:
        log(f"[{index_variant}] INSERT benchmark: 10 batches of {min(BENCHMARK_INSERT_BATCH, 100)} trees...")
        insert_batch_size = min(BENCHMARK_INSERT_BATCH, 100)
        samples = []
        for i in range(10):
            batch = list(range(next_idx[0], next_idx[0] + insert_batch_size))
            t0 = time.perf_counter()
            await _insert_trees_bulk(db_session, data, batch)
            t1 = time.perf_counter()
            next_idx[0] += insert_batch_size
            per_tree_ms = (t1 - t0) * 1000.0 / insert_batch_size
            samples.append(per_tree_ms)
            log(f"  INSERT batch {i+1}/10: {insert_batch_size} trees in {(t1-t0)*1000:.0f}ms ({per_tree_ms:.2f}ms/tree)")
        benchmark_results.append(_make_result(f"DEEP_{index_variant}", "insert", samples))

        log(f"[{index_variant}] DELETE benchmark: 100 trees...")
        samples.clear()
        for i in range(100):
            root_id = await _insert_one_tree(db_session, data, next_idx[0], commit=True)
            next_idx[0] += 1
            t0 = time.perf_counter()
            await _bench_delete(db_session, root_id)
            t1 = time.perf_counter()
            samples.append((t1 - t0) * 1000.0)
            if (i + 1) % 25 == 0:
                log(f"  DELETE {i+1}/100...")
        benchmark_results.append(_make_result(f"DEEP_{index_variant}", "delete", samples))
        log(f"  DELETE avg: {statistics.mean(samples):.2f}ms")

        log(f"[{index_variant}] SELECT DFS benchmark: 100 queries...")
        samples.clear()
        for _ in range(100):
            t0 = time.perf_counter()
            await _bench_select_dfs(db_session, data)
            t1 = time.perf_counter()
            samples.append((t1 - t0) * 1000.0)
        benchmark_results.append(_make_result(f"DEEP_{index_variant}", "select_dfs", samples))
        log(f"  DFS avg: {statistics.mean(samples):.2f}ms")

        log(f"[{index_variant}] SELECT root_id benchmark: 100 queries...")
        samples.clear()
        for _ in range(100):
            t0 = time.perf_counter()
            await _bench_select_root_id(db_session, data)
            t1 = time.perf_counter()
            samples.append((t1 - t0) * 1000.0)
        benchmark_results.append(_make_result(f"DEEP_{index_variant}", "select_root_id", samples))
        log(f"  root_id avg: {statistics.mean(samples):.2f}ms")

        log(f"[{index_variant}] SELECT recursive CTE benchmark: 100 queries...")
        samples.clear()
        for _ in range(100):
            t0 = time.perf_counter()
            await _bench_select_cte(db_session, data)
            t1 = time.perf_counter()
            samples.append((t1 - t0) * 1000.0)
        benchmark_results.append(_make_result(f"DEEP_{index_variant}", "select_recursive_cte", samples))
        log(f"  CTE avg: {statistics.mean(samples):.2f}ms")

    finally:
        log(f"[{index_variant}] Cleanup: deleting INSERT-benchmark trees...")
        t0 = time.perf_counter()
        cleanup_start = data["total_trees"] * data["tree_range"]
        await db_session.execute(
            text("DELETE FROM instances WHERE tin >= :start AND parent_id IS NOT NULL"),
            {"start": cleanup_start},
        )
        await db_session.execute(
            text("DELETE FROM instances WHERE tin >= :start"),
            {"start": cleanup_start},
        )
        await db_session.commit()
        await _drop_index(db_session, index_variant)
        t1 = time.perf_counter()
        log(f"[{index_variant}] Cleanup done in {(t1-t0)*1000:.0f}ms.")
