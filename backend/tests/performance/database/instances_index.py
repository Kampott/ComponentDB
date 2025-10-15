import asyncio
import csv
import statistics
import time
import random
from datetime import datetime
from typing import Optional, List, Dict, Any

from sqlalchemy import text, select, delete, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import async_session  # sessionmaker([...], class_=AsyncSession)
from app.models.core import Types, Objects, Instances
from app.schemas.core import InstancesCreate
from app.crud.core.instances import create_instance as crud_create_instance, delete_instance as crud_delete_instance


CSV_OUT = f"benchmark_results_{datetime.utcnow().strftime('%Y%m%dT%H%M%SZ')}.csv"
SAMPLE_COUNTS = [10000]
BRANCHING = (1, 10, 100, 100)  # уровни: root, 10, 10*100=1000, 1000*100=100000
INSTANCE_NUMBER = [10, 100, 1000]
MAX_LEVEL = len(BRANCHING)  # 4
ROOT_IDS_CACHE: list[int] = []

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



async def create_indexes(session: AsyncSession, mode: int) -> str:
    """
    Creating index for Instances depending on mode
    mode:
        0 — no index
        1 — separate indeces (root_id and parent_id)
        2 — composite (parent_id, root_id)
        3 — separate index, but reverse order (root_id and parent_id reversed)
        4 — composite (root_id, parent_id)
    """
    await drop_all_indexes(session)  # to not double

    if mode == 0:
        idx_name = "no_index"

    elif mode == 1:
        await session.execute(text("CREATE INDEX IF NOT EXISTS idx_instances_root ON instances(root_id)"))
        await session.execute(text("CREATE INDEX IF NOT EXISTS idx_instances_parent ON instances(parent_id)"))
        idx_name = "separate_root_parent"

    elif mode == 2:
        await session.execute(text("CREATE INDEX IF NOT EXISTS idx_instances_parent_root ON instances(parent_id, root_id)"))
        idx_name = "composite_parent_root"

    elif mode == 3:
        # порядок тот же, но названия меняем, чтобы не конфликтовало
        await session.execute(text("CREATE INDEX IF NOT EXISTS idx_instances_parent2 ON instances(parent_id)"))
        await session.execute(text("CREATE INDEX IF NOT EXISTS idx_instances_root2 ON instances(root_id)"))
        idx_name = "separate_parent_root_reversed"

    elif mode == 4:
        await session.execute(text("CREATE INDEX IF NOT EXISTS idx_instances_root_parent ON instances(root_id, parent_id)"))
        idx_name = "composite_root_parent"

    else:
        raise ValueError(f"Unknown indexation mode: {mode}")

    await session.commit()
    print(f"[SUCCESS] Index created: {idx_name}")
    return idx_name


async def drop_all_indexes(session: AsyncSession):
    """Deleting all test indeces if they exist"""
    await session.execute(text("DROP INDEX IF EXISTS idx_instances_root"))
    await session.execute(text("DROP INDEX IF EXISTS idx_instances_parent"))
    await session.execute(text("DROP INDEX IF EXISTS idx_instances_parent_root"))
    await session.execute(text("DROP INDEX IF EXISTS idx_instances_root_parent"))
    await session.execute(text("DROP INDEX IF EXISTS idx_instances_root2"))
    await session.execute(text("DROP INDEX IF EXISTS idx_instances_parent2"))
    await session.commit()

# ---------- Create Objects/Types tree ----------
async def create_types_and_objects(session: AsyncSession):
    """
    Создаёт дерево типов/объектов для теста в соответствии с BRANCHING.
    Возвращает root_object_id.
    """
    print("Creating Types/Objects skeleton...")

    # Root type / object (простая версия: используем только объекты; типы минимально)
    root_type = Types(name="root_type", parent_id=None, root_id=None)
    session.add(root_type)
    await session.flush()
    root_type.root_id = root_type.id
    await session.flush()

    root_obj = Objects(name="root_obj", type_id=root_type.id, parent_id=None, root_id=None)
    session.add(root_obj)
    await session.flush()
    root_obj.root_id = root_obj.id
    await session.flush()

    # level 1: BRANCHING[1] children of root
    lvl1 = []
    for i in range(BRANCHING[1]):
        o = Objects(name=f"o_l1_{i}", type_id=root_type.id, parent_id=root_obj.id, root_id=root_obj.root_id)
        session.add(o)
        lvl1.append(o)
    await session.flush()

    # level 2: each lvl1 has BRANCHING[2] children
    lvl2 = []
    for parent in lvl1:
        for j in range(BRANCHING[2]):
            o = Objects(name=f"o_l2_{parent.id}_{j}", type_id=root_type.id, parent_id=parent.id, root_id=root_obj.root_id)
            session.add(o)
            lvl2.append(o)
    await session.flush()

    # level 3: each lvl2 has BRANCHING[3] children
    lvl3 = []
    for parent in lvl2:
        for k in range(BRANCHING[3]):
            o = Objects(name=f"o_l3_{parent.id}_{k}", type_id=root_type.id, parent_id=parent.id, root_id=root_obj.root_id)
            session.add(o)
            lvl3.append(o)
    await session.flush()

    await session.commit()
    print("Objects tree created.")
    return root_obj.id


# ---------- Generate instances using CRUD ----------
async def generate_instances_for_tree(session: AsyncSession, root_object_id: int, n_instances: int):
    """
    Creates n_instances copies of a tree of objects for a given root_object_id.
    Uses bulk-insert for optimization. Root_id is set correctly.
    """

    print(f"Generating {n_instances} instance-trees (bulk mode)...")

    # Загружаем объекты дерева
    r = await session.execute(
        select(Objects).where(Objects.root_id == root_object_id).order_by(Objects.id)
    )
    objects = r.scalars().all()

    # parent_id -> children map
    obj_children: Dict[Optional[int], List[Objects]] = {}
    for o in objects:
        obj_children.setdefault(o.parent_id, []).append(o)

    root_obj = next((o for o in objects if o.parent_id is None), None)
    if root_obj is None:
        raise RuntimeError("No object root found")

    all_instances = []
    temp_parent_links = []  # remembering pairs (child_idx, parent_obj_id)

    # Создаём все инстансы без parent_id и root_id
    for k in range(n_instances):
        print(f"Generating instance number {k}")
        stack = [(root_obj, None)]
        suffix = f"_{k}"

        while stack:
            obj, parent_obj = stack.pop()
            inst = Instances(
                name=f"{obj.name}_inst{suffix}",
                object_id=obj.id,
                parent_id=None,
                root_id=None,   # will set later
                is_active=True
            )
            all_instances.append(inst)

            if parent_obj:
                temp_parent_links.append((len(all_instances) - 1, parent_obj.id, suffix))

            for ch in obj_children.get(obj.id, []):
                stack.append((ch, obj))

    # Bulk add
    session.add_all(all_instances)
    await session.flush()  # присвоены все id

    # Создаём карту: suffix -> object_id -> instance.id
    instance_map = {}
    for inst in all_instances:
        *_, suffix = inst.name.split("_inst")
        instance_map.setdefault(suffix, {})[inst.object_id] = inst.id

    # Обновляем parent_id
    for idx, parent_obj_id, suffix in temp_parent_links:
        parent_id = instance_map[suffix][parent_obj_id]
        all_instances[idx].parent_id = parent_id

    # Устанавливаем root_id: у корня root_id = id, у всех остальных берём root_id родителя
    id_to_instance = {inst.id: inst for inst in all_instances}
    for inst in all_instances:
        if inst.parent_id is None:
            inst.root_id = inst.id
        else:
            inst.root_id = id_to_instance[inst.parent_id].root_id

    # Коммитим разом
    print("Committing results. This might be slow!")
    await session.commit()
    print(f"Created {len(all_instances)} instances (bulk insert complete).")


# ---------- Measurement helpers ----------
async def measure_operation_coro(coro_func, repeats):
    times = []
    for _ in range(repeats):
        t0 = time.perf_counter()
        await coro_func()
        t1 = time.perf_counter()
        times.append((t1 - t0) * 1000.0)
    return times


async def run_bench_for_count(session: AsyncSession, root_obj_id: int, count: int, index_mode: int, csv_writer):
    # set index state
    index_type = await create_indexes(session, index_mode)
    print(f"=== BENCH count={count}, indexed={index_type} ===")

    # sizes before
    db_before = await get_db_size_mb(session)
    tbl_before = await get_table_size_mb(session, "instances")

    # Получаем все инстансы с заданным root_obj_id
    r = await session.execute(
        select(Instances).where(Instances.root_id == root_obj_id).order_by(Instances.id)
    )
    all_instances = r.scalars().all()
    if not all_instances:
        print("Нет инстансов для операций — пропускаем тест")
        return

    inst_to_use = all_instances[0]

    # parent_map и функция depth
    parent_map = {inst.id: inst.parent_id for inst in all_instances}

    def get_depth(inst_id, cache={}):
        if inst_id in cache:
            return cache[inst_id]
        parent_id = parent_map.get(inst_id)
        if parent_id is None:
            depth = 0
        else:
            depth = 1 + get_depth(parent_id, cache)
        cache[inst_id] = depth
        return depth

    # группируем по уровням
    pick_by_level = {}
    for inst in all_instances:
        lvl = get_depth(inst.id)
        pick_by_level.setdefault(lvl, []).append(inst)

    # ---------------- INSERT measurement ----------------
    for level, objs in pick_by_level.items():
        for target_inst in objs[:1]:  # ограничение одним на уровень
            parent_for_new = target_inst.parent_id

            async def insert_single():
                inst_data = InstancesCreate(
                    name=f"bench_insert_{target_inst.id}",
                    object_id=target_inst.object_id,
                    parent_id=parent_for_new,
                    is_active=True
                )
                inst = await crud_create_instance(session, inst_data)
                await crud_delete_instance(session, inst.id)

            times = await measure_operation_coro(insert_single, repeats=count)
            csv_writer.writerow([
                "insert", level, count, statistics.mean(times), statistics.pstdev(times),
                min(times), max(times), db_before, tbl_before,
                "-----", "-----",
                index_type
            ])
            print(f"insert level {level}: mean {statistics.mean(times):.2f} ms")

    # ---------------- SELECT by id ----------------
    lookup_inst = await crud_create_instance(session, InstancesCreate(
        name="lookup_inst", object_id=inst_to_use.object_id, parent_id=None, is_active=True
    ))

    async def select_single():
        await session.execute(select(Instances).where(Instances.id == lookup_inst.id))

    times = await measure_operation_coro(select_single, repeats=count)
    csv_writer.writerow([
        "select_by_id", 0, count, statistics.mean(times), statistics.pstdev(times),
        min(times), max(times), db_before, tbl_before,
        "-----", "-----",
        index_type
    ])
    await crud_delete_instance(session, lookup_inst.id)
    print(f"select_by_id: mean {statistics.mean(times):.2f} ms")

    # ---------------- SELECT children (уровни 2 и 3) ----------------
    for level in [2, 3]:
        for parent_inst in pick_by_level.get(level, [])[:1]:
            parent_id = parent_inst.id
            target_root_id = parent_inst.root_id

            async def select_children():
                await session.execute(
                    select(Instances).where(
                        (Instances.parent_id == parent_id) &
                        (Instances.root_id == target_root_id)
                    )
                )

            times = await measure_operation_coro(select_children, repeats=count)
            csv_writer.writerow([
                f"select_children_lvl{level}", level, count, statistics.mean(times), statistics.pstdev(times),
                min(times), max(times), db_before, tbl_before,
                "-----", "-----",
                index_type
            ])
            print(f"select_children level {level}: mean {statistics.mean(times):.2f} ms")

    # ---------------- OLD SELECT children (уровни 2 и 3) ----------------
    for level in [2, 3]:
        for parent_inst in pick_by_level.get(level, [])[:1]:
            parent_id = parent_inst.id
            target_root_id = parent_inst.root_id

            async def select_children():
                await session.execute(
                    select(Instances).where(
                        (Instances.parent_id == parent_id)
                    )
                )

            times = await measure_operation_coro(select_children, repeats=count)
            csv_writer.writerow([
                f"old_select_children_lvl{level}", level, count, statistics.mean(times), statistics.pstdev(times),
                min(times), max(times), db_before, tbl_before,
                "-----", "-----",
                index_type
            ])
            print(f"old_select_children level {level}: mean {statistics.mean(times):.2f} ms")

    # ---------------- DELETE measurement ----------------
    delete_times = []
    for _ in range(count):
        inst = await crud_create_instance(session, InstancesCreate(
            name="tmp_for_delete", object_id=inst_to_use.object_id, parent_id=None, is_active=True
        ))
        t0 = time.perf_counter()
        await crud_delete_instance(session, inst.id)
        t1 = time.perf_counter()
        delete_times.append((t1 - t0) * 1000.0)

    csv_writer.writerow([
        "delete", 0, count, statistics.mean(delete_times), statistics.pstdev(delete_times),
        min(delete_times), max(delete_times), db_before, tbl_before,
        "-----", "-----",
        index_type
    ])
    print(f"delete: mean {statistics.mean(delete_times):.2f} ms")

    # ---------------- final sizes ----------------
    db_final = await get_db_size_mb(session)
    tbl_final = await get_table_size_mb(session, "instances")
    csv_writer.writerow([
        "-----", "-----", "-----", "-----", "-----", "-----", "-----", db_before, tbl_before,
        db_final, tbl_final,
        index_type
    ])
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
                await generate_instances_for_tree(session, root_object_id, 2)
                print("Generation done.")

                for mode in range(5): #0..4
                    await run_bench_for_count(session, root_object_id, count, index_mode=mode, csv_writer=writer)

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
