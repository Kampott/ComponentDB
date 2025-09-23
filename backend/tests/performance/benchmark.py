import asyncio
import random
import time
import sys
import csv
from statistics import mean
from sqlalchemy import select, delete, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import async_session
from app.models.core import Types, Objects, Instances
from app.crud.core.instances import create_instance
from app.schemas.core import InstancesCreate
from tests.performance.generate_data import generate_types_and_objects, generate_instances


CSV_FILE = "benchmarks.csv"


async def benchmark(n_instances: int, n_measurements: int = 1000):
    async with async_session() as session:
        # ---------- Data generation ----------
        print(f"\n=== Generating dataset with {n_instances} instances ===")
        root_object_id = await generate_types_and_objects(session)
        await generate_instances(session, root_object_id, n_instances)
        await session.commit()

        # ---------- Get table size ----------
        result = await session.execute(
            text("SELECT pg_total_relation_size('instances')")
        )
        table_size_bytes = result.scalar()
        print(f"Table Instances size: {table_size_bytes} bytes")

        # ---------- Write table size to CSV ----------
        with open(CSV_FILE, mode="a", newline="") as f:
            writer = csv.writer(f)
            writer.writerow([n_instances, "TABLE_SIZE", "", table_size_bytes])

        # ---------- SELECT benchmarks ----------
        root_times = []
        children_times = []

        for _ in range(n_measurements):
            # root instances
            t0 = time.perf_counter()
            result = await session.execute(
                select(Instances).where(Instances.parent_id.is_(None))
            )
            roots = result.scalars().all()
            t1 = time.perf_counter()
            root_times.append(t1 - t0)

            # children of root
            t0 = time.perf_counter()
            result = await session.execute(
                select(Instances).where(Instances.parent_id.in_([r.id for r in roots]))
            )
            children = result.scalars().all()
            t1 = time.perf_counter()
            children_times.append(t1 - t0)

        # ---------- INSERT + DELETE benchmarks ----------
        insert_times = []
        delete_times = []

        result = await session.execute(select(Instances))
        all_instances = result.scalars().all()
        parent_ids = [inst.id for inst in all_instances]

        for _ in range(n_measurements):
            parent_id = random.choice(parent_ids)
            # insert transistor
            t0 = time.perf_counter()
            inst = await create_instance(session, InstancesCreate(
                name="Extra_Transistor",
                object_id=all_instances[0].object_id,
                parent_id=parent_id,
                is_active=True
            ))
            await session.flush()
            t1 = time.perf_counter()
            insert_times.append(t1 - t0)

            # delete transistor
            t0 = time.perf_counter()
            await session.execute(delete(Instances).where(Instances.id == inst.id))
            await session.flush()
            t1 = time.perf_counter()
            delete_times.append(t1 - t0)

        # ---------- Write results to CSV ----------
        with open(CSV_FILE, mode="a", newline="") as f:
            writer = csv.writer(f)
            writer.writerow([n_instances, "TABLE_SIZE", "", table_size_bytes])
            writer.writerow([n_instances, "SELECT_ROOT", mean(root_times), ""])
            writer.writerow([n_instances, "SELECT_CHILDREN", mean(children_times), ""])
            writer.writerow([n_instances, "INSERT", mean(insert_times), ""])
            writer.writerow([n_instances, "DELETE", mean(delete_times), ""])

        # ---------- Cleanup ----------
        await session.execute(delete(Types).where(Types.parent_id.is_(None)))
        await session.commit()
        print(f"Cleanup done for {n_instances} dataset ✅")


async def main():
    # Header for CSV
    with open(CSV_FILE, mode="w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["dataset_size", "operation", "avg_time_sec", "avg_size_bytes"])

    for n in [100, 1000, 10000]:
        await benchmark(n)


if __name__ == "__main__":
    asyncio.run(main())
