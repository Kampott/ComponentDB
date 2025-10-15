import asyncio
import csv
import statistics
import time
import random
from datetime import datetime
from typing import Optional, List, Dict, Any

from sqlalchemy import text, select, delete
from sqlalchemy.ext.asyncio import AsyncSession

# импортируем с ваших модулей
from app.db.database import async_session  # sessionmaker([...], class_=AsyncSession)
from app.models.core import Types, Objects, Instances
from app.schemas.core import InstancesCreate
from app.crud.core.instances import create_instance as crud_create_instance, delete_instance as crud_delete_instance

# CONFIG — подставьте нужные значения
CSV_OUT = f"benchmark_results_{datetime.utcnow().strftime('%Y%m%dT%H%M%SZ')}.csv"
REPEATS = 100
# Осторожно: большие значения создают миллионы строк. Подбирайте под вашу машину.
SAMPLE_COUNTS = [100, 1000, 10000]  # пример. Можно [100, 1000, 10000] если хватит ресурсов
BRANCHING = (1, 10, 100, 100)  # уровни: root, 10, 10*100=1000, 1000*100=100000
MAX_LEVEL = len(BRANCHING)  # 4

# ---------- Utilities ----------
async def get_db_size_mb(session: AsyncSession, dbname: Optional[str] = None) -> float:
    if dbname is None:
        r = await session.execute(text("SELECT current_database()"))
        dbname = r.scalar()
    r = await session.execute(text("SELECT pg_database_size(:db)"), {"db": dbname})
    size = r.scalar()
    return (size or 0) / 1024.0 / 1024.0


async def get_table_size_mb(session: AsyncSession, table_name: str) -> float:
    r = await session.execute(text("SELECT pg_total_relation_size(:tbl)"), {"tbl": table_name})
    size = r.scalar()
    return (size or 0) / 1024.0 / 1024.0


async def create_indexes(session: AsyncSession):
    # Композитный индекс по (parent_id, root_id)
    await session.execute(
        text("CREATE INDEX IF NOT EXISTS idx_instances_parent_root ON instances(parent_id, root_id)")
    )
    await session.commit()


async def drop_indexes(session: AsyncSession):
    await session.execute(
        text("DROP INDEX IF EXISTS idx_instances_parent_root")
    )
    await session.commit()

# ---------- Create Objects/Types tree ----------
async def create_types_and_objects(session: AsyncSession):
    """
    Создаёт дерево типов/объектов для теста в соответствии с BRANCHING.
    Возвращает root_object_id.
    """
    print("Creating Types/Objects skeleton...")

    # Root type / object (простая версия: используем только объекты; типы минимально)
    root_type = Types(name="root_type", parent_id=None, root_id=None, index_of_layer=1)
    session.add(root_type)
    await session.flush()
    root_type.root_id = root_type.id
    await session.flush()

    root_obj = Objects(name="root_obj", type_id=root_type.id, parent_id=None, root_id=None, index_of_layer=1)
    session.add(root_obj)
    await session.flush()
    root_obj.root_id = root_obj.id
    await session.flush()

    # level 1: BRANCHING[1] children of root
    lvl1 = []
    for i in range(BRANCHING[1]):
        o = Objects(name=f"o_l1_{i}", type_id=root_type.id, parent_id=root_obj.id, root_id=root_obj.root_id, index_of_layer=2)
        session.add(o)
        lvl1.append(o)
    await session.flush()

    # level 2: each lvl1 has BRANCHING[2] children
    lvl2 = []
    for parent in lvl1:
        for j in range(BRANCHING[2]):
            o = Objects(name=f"o_l2_{parent.id}_{j}", type_id=root_type.id, parent_id=parent.id, root_id=root_obj.root_id, index_of_layer=3)
            session.add(o)
            lvl2.append(o)
    await session.flush()

    # level 3: each lvl2 has BRANCHING[3] children
    lvl3 = []
    for parent in lvl2:
        for k in range(BRANCHING[3]):
            o = Objects(name=f"o_l3_{parent.id}_{k}", type_id=root_type.id, parent_id=parent.id, root_id=root_obj.root_id, index_of_layer=4)
            session.add(o)
            lvl3.append(o)
    await session.flush()

    await session.commit()
    print("Objects tree created.")
    return root_obj.id


# ---------- Generate instances using CRUD ----------
async def generate_instances_for_tree(session: AsyncSession, root_object_id: int, n_instances: int):
    """
    Для заданного root_object_id создаёт n_instances instance-деревьев.
    Использует crud_create_instance (которая сама делает commit/refresh).
    """
    # load objects ordered by layer so parents are before children
    r = await session.execute(select(Objects).where(Objects.root_id == root_object_id).order_by(Objects.index_of_layer))
    objects = r.scalars().all()

    # map parent -> children objects
    obj_children: Dict[Optional[int], List[Objects]] = {}
    for o in objects:
        obj_children.setdefault(o.parent_id, []).append(o)

    # recursive creation that uses CRUD
    async def create_subtree(parent_obj: Objects, parent_inst_id: Optional[int], suffix: str):
        inst_data = InstancesCreate(
            name=f"{parent_obj.name}_inst{suffix}",
            object_id=parent_obj.id,
            parent_id=parent_inst_id,
            is_active=True
        )
        inst = await crud_create_instance(session, inst_data)
        # create children
        for ch in obj_children.get(parent_obj.id, []):
            await create_subtree(ch, inst.id, suffix)
        return inst

    roots = [o for o in objects if o.parent_id is None]
    if not roots:
        raise RuntimeError("No root object found for given root_object_id")
    root_obj = roots[0]

    # create n_instances trees
    for k in range(n_instances):
        await create_subtree(root_obj, None, f"_{k}")

    # NOTE: crud_create_instance commits internally; no need to commit here.
    return True


# ---------- Measurement helpers ----------
async def measure_operation_coro(coro_func, repeats=REPEATS):
    times = []
    for _ in range(repeats):
        t0 = time.perf_counter()
        await coro_func()
        t1 = time.perf_counter()
        times.append((t1 - t0) * 1000.0)
    return times


async def run_bench_for_count(session: AsyncSession, root_obj_id: int, count: int, indexed: bool, csv_writer):
    print(f"=== BENCH count={count}, indexed={indexed} ===")
    
    # set index state
    if indexed:
        await create_indexes(session)
    else:
        await drop_indexes(session)

    # sizes before
    db_before = await get_db_size_mb(session)
    tbl_before = await get_table_size_mb(session, "instances")

    # prepare objects list to pick targets by level
    r = await session.execute(select(Objects).where(Objects.root_id == root_obj_id).order_by(Objects.index_of_layer))
    all_objects = r.scalars().all()
    pick_by_level = {}
    for o in all_objects:
        pick_by_level.setdefault(o.index_of_layer, []).append(o)  # теперь все объекты уровня

    # ---------------- INSERT measurement ----------------
    for level, objs in pick_by_level.items():
        for target_obj in objs[:1]:  # можно ограничить одним объектом на уровень
            parent_for_new = None
            if level > 1:
                parent_obj_id = target_obj.parent_id
                if parent_obj_id is not None:
                    q = await session.execute(select(Instances).where(Instances.object_id == parent_obj_id).limit(1))
                    p = q.scalars().first()
                    parent_for_new = p.id if p else None

            async def insert_single():
                inst_data = InstancesCreate(
                    name=f"bench_insert_{target_obj.id}",
                    object_id=target_obj.id,
                    parent_id=parent_for_new,
                    is_active=True
                )
                inst = await crud_create_instance(session, inst_data)
                await crud_delete_instance(session, inst.id)

            times = await measure_operation_coro(insert_single, repeats=REPEATS)
            csv_writer.writerow([
                "insert", level, count, statistics.mean(times), statistics.pstdev(times),
                min(times), max(times), db_before, tbl_before,
                await get_db_size_mb(session), await get_table_size_mb(session, "instances"),
                indexed
            ])
            print(f"insert level {level}: mean {statistics.mean(times):.2f} ms")

    # ---------------- SELECT by id ----------------
    lookup_inst = await crud_create_instance(session, InstancesCreate(
        name="lookup_inst", object_id=all_objects[0].id, parent_id=None, is_active=True
    ))

    async def select_single():
        await session.execute(select(Instances).where(Instances.id == lookup_inst.id))

    times = await measure_operation_coro(select_single, repeats=REPEATS)
    csv_writer.writerow([
        "select_by_id", 0, count, statistics.mean(times), statistics.pstdev(times),
        min(times), max(times), db_before, tbl_before,
        await get_db_size_mb(session), await get_table_size_mb(session, "instances"),
        indexed
    ])
    await crud_delete_instance(session, lookup_inst.id)
    print(f"select_by_id: mean {statistics.mean(times):.2f} ms")

    # ---------------- SELECT children (уровни 2 и 3) ----------------
    for level in [2, 3]:
        for target_obj in pick_by_level.get(level, [])[:1]:  # берем первый объект уровня
            # найти родительскую инстанцию
            parent_obj_id = target_obj.parent_id
            if parent_obj_id is None:
                continue
            q = await session.execute(select(Instances).where(Instances.object_id == parent_obj_id).limit(1))
            parent_inst = q.scalars().first()
            if parent_inst is None:
                continue

            async def select_children():
                await session.execute(select(Instances).where(Instances.parent_id == parent_inst.id))

            times = await measure_operation_coro(select_children, repeats=REPEATS)
            csv_writer.writerow([
                f"select_children_lvl{level}", level, count, statistics.mean(times), statistics.pstdev(times),
                min(times), max(times), db_before, tbl_before,
                await get_db_size_mb(session), await get_table_size_mb(session, "instances"),
                indexed
            ])
            print(f"select_children level {level}: mean {statistics.mean(times):.2f} ms")

    # ---------------- DELETE measurement ----------------
    delete_times = []
    for _ in range(REPEATS):
        inst = await crud_create_instance(session, InstancesCreate(
            name="tmp_for_delete", object_id=all_objects[-1].id, parent_id=None, is_active=True
        ))
        t0 = time.perf_counter()
        await crud_delete_instance(session, inst.id)
        t1 = time.perf_counter()
        delete_times.append((t1 - t0) * 1000.0)

    csv_writer.writerow([
        "delete", 0, count, statistics.mean(delete_times), statistics.pstdev(delete_times),
        min(delete_times), max(delete_times), db_before, tbl_before,
        await get_db_size_mb(session), await get_table_size_mb(session, "instances"),
        indexed
    ])
    print(f"delete: mean {statistics.mean(delete_times):.2f} ms")

    # ---------------- final sizes ----------------
    db_final = await get_db_size_mb(session)
    tbl_final = await get_table_size_mb(session, "instances")
    print(f"Sizes: db_before={db_before:.2f}MB table_before={tbl_before:.2f}MB -> db_final={db_final:.2f}MB table_final={tbl_final:.2f}MB")


# ---------- Top-level runner ----------
async def main():
    with open(CSV_OUT, "w", newline="") as csvfile:
        writer = csv.writer(csvfile)
        writer.writerow(["operation", "level", "n_instances", "mean_ms", "std_ms", "min_ms", "max_ms", "db_size_before_mb", "table_size_before_mb", "db_size_after_mb", "table_size_after_mb", "indexed"])

        async with async_session() as session:
            # 1) ensure base objects
            root_object_id = await create_types_and_objects(session)

            for count in SAMPLE_COUNTS:
                print(f"Generating {count} instance-trees (this may be slow)...")
                await generate_instances_for_tree(session, root_object_id, 1)
                print("Generation done.")

                # bench without indexes
                await run_bench_for_count(session, root_object_id, count, indexed=False, csv_writer=writer)
                # bench with indexes
                await run_bench_for_count(session, root_object_id, count, indexed=True, csv_writer=writer)

                # cleanup instances for next run: delete only instances that belong to our root_object_id
                await session.execute(delete(Instances).where(Instances.root_id == Instances.id).where(Instances.object_id.in_(
                    select(Objects.id).where(Objects.root_id == root_object_id)
                )))  # conservative cleanup if root tracking inconsistent
                # Simpler/safer: delete by matching root_id to any instance whose object belongs to our objects
                await session.execute(delete(Instances).where(Instances.root_id == Instances.root_id).where(Instances.object_id.in_(
                    select(Objects.id).where(Objects.root_id == root_object_id)
                )))
                # But strictly prefer:
                await session.commit()
                # If above cleanup is undesirably broad, use direct:
                # await session.execute(delete(Instances).where(Instances.root_id == root_object_id))
                # await session.commit()

                print(f"Cleanup after count={count} done.")

    print(f"Benchmark finished. Results saved to {CSV_OUT}")


if __name__ == "__main__":
    asyncio.run(main())
