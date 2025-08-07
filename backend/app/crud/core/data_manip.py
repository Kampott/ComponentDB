from sqlalchemy import select
from sqlalchemy.orm import joinedload
from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException
from app.schemas.core import ObjectInstanceTree, InstanceOut, ObjectsRead, TypesRead
from app.models.core import Types, Objects, Instances
from typing import List

async def get_type_tree(db: AsyncSession, root_id: int):

    root = await db.get(Types, root_id)
    if not root:
        return None
    if root.parent_id is not None:
        raise HTTPException(status_code=400, detail="Provided id is not a root type")

    result = await db.execute(select(Types).where(Types.root_id == root_id))
    all_types = result.scalars().all()


    # index by id
    id_map = {type_.id: type_ for type_ in all_types}

    # loading parent
    root = await db.get(Types, root_id)
    if not root:
        return None

    # building tree
    tree = {type_.id: {"id": type_.id, "name": type_.name, "children": []} for type_ in all_types}
    tree[root.id] = {"id": root.id, "name": root.name, "children": []}

    for type_ in all_types:
        if type_.parent_id and type_.parent_id in tree:
            tree[type_.parent_id]["children"].append(tree[type_.id])

    return tree[root.id]

async def get_root_objects(db: AsyncSession) -> List[Objects]:
    result = await db.execute(
        select(Objects)
        .where(Objects.parent_id == None)
    )
    return result.scalars().all()

async def get_root_types(db: AsyncSession) -> List[Types]:
    result = await db.execute(
        select(Types)
        .where(Types.parent_id == None)
    )
    return result.scalars().all()


async def get_all_type_hierarchies(db: AsyncSession):
    result = await db.execute(select(Types).where(Types.parent_id == None))
    root_types = result.scalars().all()

    trees = []
    for root in root_types:
        tree = await get_type_tree(db, root.id)
        if tree:
            trees.append(tree)
    return trees

async def get_object_tree(db: AsyncSession, root_id: int):
    # Getting root object with it's type
    root_obj = await db.get(Objects, root_id)
    if not root_obj:
        raise HTTPException(status_code=404, detail="Object not found")
    if root_obj.parent_id is not None:
        raise HTTPException(status_code=400, detail="Provided id is not a root object")

    # Loading all objects with that root_id, with their respective types
    result = await db.execute(
        select(Objects)
        .options(joinedload(Objects.type_))
        .where(Objects.root_id == root_id)
    )
    all_objects = result.scalars().all()

    # Building note dict
    tree = {
        obj.id: {
            "id": obj.id,
            "name": getattr(obj, "name", f"Object {obj.id}"),
            "type_id": obj.type_id,
            "type_name": obj.type_.name if obj.type_ else "Unknown",
            "children": []
        }
        for obj in all_objects
    }
    # Adding root if it didn't come into the dict (sometimes root.root_id could be None)
    if root_obj.id not in tree:
        tree[root_obj.id] = {
            "id": root_obj.id,
            "name": getattr(root_obj, "name", f"Object {root_obj.id}"),
            "type_id": root_obj.type_id,
            "type_name": root_obj.type_.name if root_obj.type_ else "Unknown",
            "children": []
        }

    # Linking parents -> children
    for obj in all_objects:
        if obj.parent_id and obj.parent_id in tree:
            tree[obj.parent_id]["children"].append(tree[obj.id])

    return tree[root_obj.id]


async def get_all_object_hierarchies(db: AsyncSession):
    result = await db.execute(select(Objects).where(Objects.parent_id == None))
    root_objects = result.scalars().all()

    trees = []
    for root in root_objects:
        tree = await get_object_tree(db, root.id)
        if tree:
            trees.append(tree)
    return trees

