import sys
import time
from pathlib import Path

_db_dir = str(Path(__file__).resolve().parent)
if _db_dir not in sys.path: sys.path.insert(0, _db_dir)

import pytest
import statistics
from sqlalchemy import text

from conftest import (
    benchmark_results,
    _insert_one_tree,
    _insert_trees_bulk,
    BENCHMARK_INSERT_BATCH,
    log,
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


@pytest.mark.benchmark
@pytest.mark.asyncio
@pytest.mark.parametrize("index_variant", ["A", "B", "C", "D", "E", "ALL"])
async def test_benchmark_index_variant(
    db_session, synthetic_data, index_variant: str
):
    next_idx = [synthetic_data["total_trees"]]

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
        "index_variant": index_variant,
        "operation": "db_size_with_index",
        "mean_ms": 0, "stddev_ms": 0, "min_ms": 0, "max_ms": 0, "iterations": 1,
        **sizes,
    })
    log(f"[{index_variant}] Table: {sizes['total_mb']}MB total, {sizes['indexes_mb']}MB indexes, {sizes['table_mb']}MB data")

    try:
        log(f"[{index_variant}] INSERT benchmark: 10 batches of {min(BENCHMARK_INSERT_BATCH,100)} trees...")
        insert_batch_size = min(BENCHMARK_INSERT_BATCH, 100)
        samples: list[float] = []
        for i in range(10):
            batch_indices = list(range(next_idx[0], next_idx[0] + insert_batch_size))
            t0 = time.perf_counter()
            await _insert_trees_bulk(db_session, synthetic_data, batch_indices)
            t1 = time.perf_counter()
            next_idx[0] += insert_batch_size
            per_tree_ms = (t1 - t0) * 1000.0 / insert_batch_size
            samples.append(per_tree_ms)
            log(f"  INSERT batch {i+1}/10: {insert_batch_size} trees in {(t1-t0)*1000:.0f}ms ({per_tree_ms:.2f}ms/tree)")
        benchmark_results.append(_make_result(index_variant, "insert", samples))

        log(f"[{index_variant}] DELETE benchmark: 100 trees (single insert, then delete)...")
        samples.clear()
        for i in range(100):
            root_id = await _insert_one_tree(
                db_session, synthetic_data, next_idx[0], commit=True
            )
            next_idx[0] += 1
            t0 = time.perf_counter()
            await _bench_delete(db_session, root_id)
            t1 = time.perf_counter()
            samples.append((t1 - t0) * 1000.0)
            if (i + 1) % 25 == 0:
                log(f"  DELETE {i+1}/100...")
        benchmark_results.append(_make_result(index_variant, "delete", samples))
        log(f"  DELETE avg: {statistics.mean(samples):.2f}ms")

        log(f"[{index_variant}] SELECT DFS benchmark: 100 queries...")
        samples.clear()
        for _ in range(100):
            t0 = time.perf_counter()
            await _bench_select_dfs(db_session, synthetic_data)
            t1 = time.perf_counter()
            samples.append((t1 - t0) * 1000.0)
        benchmark_results.append(_make_result(index_variant, "select_dfs", samples))
        log(f"  DFS avg: {statistics.mean(samples):.2f}ms")

        log(f"[{index_variant}] SELECT root_id benchmark: 100 queries...")
        samples.clear()
        for _ in range(100):
            t0 = time.perf_counter()
            await _bench_select_root_id(db_session, synthetic_data)
            t1 = time.perf_counter()
            samples.append((t1 - t0) * 1000.0)
        benchmark_results.append(_make_result(index_variant, "select_root_id", samples))
        log(f"  root_id avg: {statistics.mean(samples):.2f}ms")

        log(f"[{index_variant}] SELECT recursive CTE benchmark: 100 queries...")
        samples.clear()
        for _ in range(100):
            t0 = time.perf_counter()
            await _bench_select_cte(db_session, synthetic_data)
            t1 = time.perf_counter()
            samples.append((t1 - t0) * 1000.0)
        benchmark_results.append(_make_result(index_variant, "select_recursive_cte", samples))
        log(f"  CTE avg: {statistics.mean(samples):.2f}ms")

    finally:
        log(f"[{index_variant}] Cleanup: deleting INSERT-benchmark trees...")
        t0 = time.perf_counter()
        cleanup_start = synthetic_data["total_trees"] * synthetic_data["tree_range"]
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
