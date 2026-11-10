# pytest Benchmark Suite (recommended)

Pytest-based performance benchmarks for tree-structured data in `instances` table
using nested sets (`tin`/`tout`), `root_id`, and `parent_id` index variants.

## Files

- `conftest.py` — shared fixtures: async DB session, 100-tree synthetic data generation
- `test_benchmark.py` — 3 parametrized tests (index variants A/B/C), each running
  5 benchmark operations × 100 iterations

## Quick Start

```bash
# 1. Start services (make sure DB is up)
docker compose up -d db

# 2. Run only the benchmark tests
docker compose exec backend pytest tests/performance/database/test_benchmark.py -v

# 3. Or run ALL tests excluding benchmarks
docker compose exec backend pytest tests/ -v -m "not benchmark"

# 4. Filter by marker
docker compose exec backend pytest tests/ -v -m benchmark

# 5. Run a single index variant
docker compose exec backend pytest tests/performance/database/test_benchmark.py -v -k "A"
```

## Results

After completion, `benchmark_results.csv` is written to the working directory
(inside the container: `/app/`) with columns:

```
index_variant, operation, mean_ms, stddev_ms, min_ms, max_ms, iterations
```

A formatted summary is also printed to stdout at the end of the session.

---

# Legacy script (old)

The old standalone script `instances_index.py` is kept for reference but is
superseded by the pytest suite above.
