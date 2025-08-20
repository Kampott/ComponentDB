import asyncio
import time

from app.db.session import async_session
from app.crud.core.types import create_type
from app.crud.core.objects import create_object
from app.crud.core.instances import create_instance
from app.schemas.core import TypesCreate, ObjectsCreate, InstancesCreate
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.core import Types, Objects, Instances


# ---------- Utils ----------
async def cleanup(session: AsyncSession):
    """Delets root type 'БАРК' (using cascaed objects and instances are deleted)."""
    q = await session.execute(select(Types).where(Types.name == "БАРК"))
    bark = q.scalar_one_or_none()
    if bark:
        await session.delete(bark)
        await session.commit()
        print("Cleanup done ✅")
    else:
        print("Nothing to cleanup")


# ---------- Generating Types + Objects ----------
async def generate_types_and_objects(session: AsyncSession):
    """
    Creating trees types и objects using CRUD logic:
    БАРК -> платы -> чипы -> транзисторы
    """
    # Types
    bark_type = await create_type(session, TypesCreate(name="БАРК"))
    board_type_1 = await create_type(session, TypesCreate(name="Плата 1", parent_id=bark_type.id))
    board_type_2 = await create_type(session, TypesCreate(name="Плата 2", parent_id=bark_type.id))
    chip_type_1 = await create_type(session, TypesCreate(name="Чип 1", parent_id=board_type_1.id))
    chip_type_2 = await create_type(session, TypesCreate(name="Чип 2", parent_id=board_type_1.id))
    chip_type_3 = await create_type(session, TypesCreate(name="Чип 3", parent_id=board_type_1.id))
    chip_type_4 = await create_type(session, TypesCreate(name="Чип 1", parent_id=board_type_2.id))
    chip_type_5 = await create_type(session, TypesCreate(name="Чип 2", parent_id=board_type_2.id))
    chip_type_6 = await create_type(session, TypesCreate(name="Чип 3", parent_id=board_type_2.id))
    tranz_type_1 = await create_type(session, TypesCreate(name="Транзистор 1", parent_id=chip_type_1.id))
    tranz_type_2 = await create_type(session, TypesCreate(name="Транзистор 2", parent_id=chip_type_2.id))
    tranz_type_3 = await create_type(session, TypesCreate(name="Транзистор 3", parent_id=chip_type_3.id))
    tranz_type_4 = await create_type(session, TypesCreate(name="Транзистор 4", parent_id=chip_type_4.id))
    tranz_type_5 = await create_type(session, TypesCreate(name="Транзистор 5", parent_id=chip_type_5.id))
    tranz_type_6 = await create_type(session, TypesCreate(name="Транзистор 6", parent_id=chip_type_6.id))

    # Objects
    bark_obj = await create_object(session, ObjectsCreate(name="БАРК", type_id=bark_type.id))
    print(bark_obj.id)
    board_1 = await create_object(session, ObjectsCreate(name="Плата 1", type_id=board_type_1.id, parent_id=bark_obj.id))
    board_2 = await create_object(session, ObjectsCreate(name="Плата 2", type_id=board_type_2.id, parent_id=bark_obj.id))
    chip_1 = await create_object(session, ObjectsCreate(name="Чип 1", type_id=chip_type_1.id, parent_id=board_1.id))
    chip_2 = await create_object(session, ObjectsCreate(name="Чип 2", type_id=chip_type_2.id, parent_id=board_1.id))
    chip_3 = await create_object(session, ObjectsCreate(name="Чип 3", type_id=chip_type_3.id, parent_id=board_1.id))
    chip_4 = await create_object(session, ObjectsCreate(name="Чип 1", type_id=chip_type_4.id, parent_id=board_2.id))
    chip_5 = await create_object(session, ObjectsCreate(name="Чип 2", type_id=chip_type_5.id, parent_id=board_2.id))
    chip_6 = await create_object(session, ObjectsCreate(name="Чип 3", type_id=chip_type_6.id, parent_id=board_2.id))
    tranz_1 = await create_object(session, ObjectsCreate(name="Транзистор 1", type_id=tranz_type_1.id, parent_id=chip_1.id))
    tranz_2 = await create_object(session, ObjectsCreate(name="Транзистор 2", type_id=tranz_type_2.id, parent_id=chip_2.id))
    tranz_3 = await create_object(session, ObjectsCreate(name="Транзистор 3", type_id=tranz_type_3.id, parent_id=chip_3.id))
    tranz_4 = await create_object(session, ObjectsCreate(name="Транзистор 4", type_id=tranz_type_4.id, parent_id=chip_4.id))
    tranz_5 = await create_object(session, ObjectsCreate(name="Транзистор 5", type_id=tranz_type_5.id, parent_id=chip_5.id))
    tranz_6 = await create_object(session, ObjectsCreate(name="Транзистор 6", type_id=tranz_type_6.id, parent_id=chip_6.id))

    print("Types + Objects generated ✅")
    return bark_obj.id


# ---------- Генерация Instances ----------
async def generate_instances(session: AsyncSession, root_object_id: int, n_instances: int):
    """
    Создаёт N экземпляров дерева instances через CRUD.
    """
    # Берём все objects этого root
    result = await session.execute(select(Objects).where(Objects.root_id == root_object_id))
    objects = result.scalars().all()

    # parent -> children
    obj_map = {}
    for obj in objects:
        obj_map.setdefault(obj.parent_id, []).append(obj)

    async def create_instance_tree(obj, parent_inst_id=None, suffix=""):
        inst = await create_instance(session, InstancesCreate(
            name=f"{obj.name}_inst{suffix}",
            object_id=obj.id,
            parent_id=parent_inst_id,
            is_active=True
        ))
        for child in obj_map.get(obj.id, []):
            await create_instance_tree(child, inst.id, suffix)

    root_obj = [o for o in objects if o.parent_id is None][0]

    for k in range(n_instances):
        await create_instance_tree(root_obj, parent_inst_id=None, suffix=f"_{k}")

    print(f"{n_instances} instances generated ✅")


# ---------- Запуск ----------
async def main():
    async with async_session() as session:
        # очистка
        await cleanup(session)

        # генерация types + objects
        root_object_id = await generate_types_and_objects(session)

        # генерация instances
        for n in [100, 1000, 10000]:
            start = time.time()
            await generate_instances(session, root_object_id, n)
            elapsed = time.time() - start
            print(f"{n} instances inserted in {elapsed:.2f} sec")


if __name__ == "__main__":
    asyncio.run(main())
