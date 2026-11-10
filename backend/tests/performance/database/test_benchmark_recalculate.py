import sys
import time
import statistics
from pathlib import Path
from sqlalchemy import text
from sqlalchemy.dialects.postgresql import insert as pg_insert
import pytest

_db_dir = str(Path(__file__).resolve().parent)
if _db_dir not in sys.path:
    sys.path.insert(0, _db_dir)

from app.models.core import Instances, Objects, Types
from app.crud.core.dfs import recalculate_tree

from conftest import benchmark_results, _build_tree, _insert_one_tree


# ---------------------------------------------------------------------------
# recalculate_tree cost benchmark
# ---------------------------------------------------------------------------
@pytest.mark.benchmark
@pytest.mark.asyncio
async def test_benchmark_recalculate(db_session):
    session = db_session

    root_type = Types(name="recalc_bench_type")
    session.add(root_type)
    await session.flush()

    for depth in [2, 3, 4, 5, 6, 7, 8]:
        rel_nodes = _build_tree(depth=depth, children_range=(2, 3), seed=42)
        tree_size = len(rel_nodes)
        tree_range = 2 * tree_size

        obj_result = await session.execute(
            pg_insert(Objects)
            .values([
                {
                    "name": f"ro_d{depth}_{n['idx']}",
                    "type_id": root_type.id,
                    "parent_id": None,
                    "root_id": None,
                }
                for n in rel_nodes
            ])
            .returning(Objects.id)
        )
        object_ids: list[int] = list(obj_result.scalars().all())

        data = {
            "rel_nodes": rel_nodes,
            "object_ids": object_ids,
            "tree_range": tree_range,
        }

        root_id = await _insert_one_tree(session, data, 0, commit=True)

        await recalculate_tree(session, Instances, root_id)

        samples: list[float] = []
        for _ in range(15):
            t0 = time.perf_counter()
            await recalculate_tree(session, Instances, root_id)
            t1 = time.perf_counter()
            samples.append((t1 - t0) * 1000.0)

        benchmark_results.append({
            "index_variant": "recalc",
            "operation": f"recalculate_tree_{tree_size}_nodes",
            "mean_ms": round(statistics.mean(samples), 3),
            "stddev_ms": round(statistics.pstdev(samples), 3),
            "min_ms": round(min(samples), 3),
            "max_ms": round(max(samples), 3),
            "iterations": len(samples),
        })

        await session.execute(
            text("DELETE FROM instances WHERE root_id = :rid"),
            {"rid": root_id},
        )
        await session.execute(
            text("DELETE FROM objects WHERE type_id = :tid"),
            {"tid": root_type.id},
        )
        await session.commit()

    await session.execute(
        text("DELETE FROM types WHERE id = :tid"),
        {"tid": root_type.id},
    )
    await session.commit()

    # Print summary of tree sizes tested
    result_rows = [r for r in benchmark_results
                   if r.get("index_variant") == "recalc"]
    result_rows.sort(key=lambda r: int(
        r["operation"].replace("recalculate_tree_", "").replace("_nodes", "")
    ))
    print("\n--- recalculate_tree cost curve ---")
    for r in result_rows:
        nodes = r["operation"].replace("recalculate_tree_", "").replace("_nodes", "")
        print(f"  {nodes:>5} nodes  |  {r['mean_ms']:>8.3f} ms  "
              f"± {r['stddev_ms']:.3f} ms  [{r['min_ms']:.3f} – {r['max_ms']:.3f}]")
