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

    # Fetch in DFS order (by tin) for single-pass tree building
    result = await db.execute(
        select(Types)
        .where(Types.root_id == root_id)
        .order_by(Types.tin)
    )
    all_types = result.scalars().all()

    if not all_types:
        return None

    # Single-pass tree building using stack (O(n) instead of O(n²))
    tree_root = None
    stack = []  # Stack of (node_dict, type_id)

    for type_ in all_types:
        node = {"id": type_.id, "name": type_.name, "children": []}

        if type_.id == root_id:
            tree_root = node

        # Pop stack until we find the parent
        while stack and stack[-1][1] != type_.parent_id:
            stack.pop()

        if stack:
            # Add as child of parent on stack
            stack[-1][0]["children"].append(node)

        stack.append((node, type_.id))

    return tree_root

async def get_root_objects(db: AsyncSession) -> List[Objects]:
    result = await db.execute(
        select(Objects)
        .where(Objects.parent_id == None)
    )
    return list(result.scalars().all())

async def get_root_types(db: AsyncSession) -> List[Types]:
    result = await db.execute(
        select(Types)
        .where(Types.parent_id == None)
    )
    return list(result.scalars().all())


async def get_all_type_hierarchies(db: AsyncSession):
    # Fetch all root types
    result = await db.execute(select(Types).where(Types.parent_id == None))
    root_types = result.scalars().all()

    if not root_types:
        return []

    # Batch fetch all types that belong to any root
    root_ids = [root.id for root in root_types]
    all_types_result = await db.execute(
        select(Types).where(Types.root_id.in_(root_ids)).order_by(Types.tin)
    )
    all_types = all_types_result.scalars().all()

    # Build trees in batch using single-pass per root
    trees = []
    for root in root_types:
        # Filter types for this root and build tree
        root_types_filtered = [t for t in all_types if t.root_id == root.id]
        if not root_types_filtered:
            continue

        # Single-pass tree building
        tree_root = None
        stack = []

        for type_ in root_types_filtered:
            node = {"id": type_.id, "name": type_.name, "children": []}

            if type_.id == root.id:
                tree_root = node

            while stack and stack[-1][1] != type_.parent_id:
                stack.pop()

            if stack:
                stack[-1][0]["children"].append(node)

            stack.append((node, type_.id))

        if tree_root:
            trees.append(tree_root)

    return trees

async def get_object_tree(db: AsyncSession, root_id: int):
    # Getting root object with it's type
    root_obj = await db.get(Objects, root_id)
    if not root_obj:
        raise HTTPException(status_code=404, detail="Object not found")
    if root_obj.parent_id is not None:
        raise HTTPException(status_code=400, detail="Provided id is not a root object")

    # Loading all objects with that root_id in DFS order (by tin), with their respective types
    result = await db.execute(
        select(Objects)
        .options(joinedload(Objects.type_))
        .where(Objects.root_id == root_id)
        .order_by(Objects.tin)
    )
    all_objects = result.scalars().all()

    if not all_objects:
        return None

    # Single-pass tree building using stack (O(n) instead of O(n²))
    tree_root = None
    stack = []  # Stack of (node_dict, object_id)

    for obj in all_objects:
        node = {
            "id": obj.id,
            "name": getattr(obj, "name", f"Object {obj.id}"),
            "type_id": obj.type_id,
            "type_name": obj.type_.name if obj.type_ else "Unknown",
            "children": []
        }

        if obj.id == root_id:
            tree_root = node

        # Pop stack until we find the parent
        while stack and stack[-1][1] != obj.parent_id:
            stack.pop()

        if stack:
            # Add as child of parent on stack
            stack[-1][0]["children"].append(node)

        stack.append((node, obj.id))

    return tree_root


async def get_all_object_hierarchies(db: AsyncSession):
    # Fetch all root objects
    result = await db.execute(select(Objects).where(Objects.parent_id == None))
    root_objects = result.scalars().all()

    if not root_objects:
        return []

    # Batch fetch all objects that belong to any root
    root_ids = [root.id for root in root_objects]
    all_objects_result = await db.execute(
        select(Objects)
        .options(joinedload(Objects.type_))
        .where(Objects.root_id.in_(root_ids))
        .order_by(Objects.tin)
    )
    all_objects = all_objects_result.scalars().all()

    # Build trees in batch using single-pass per root
    trees = []
    for root in root_objects:
        # Filter objects for this root and build tree
        root_objects_filtered = [o for o in all_objects if o.root_id == root.id]
        if not root_objects_filtered:
            continue

        # Single-pass tree building
        tree_root = None
        stack = []

        for obj in root_objects_filtered:
            node = {
                "id": obj.id,
                "name": getattr(obj, "name", f"Object {obj.id}"),
                "type_id": obj.type_id,
                "type_name": obj.type_.name if obj.type_ else "Unknown",
                "children": []
            }

            if obj.id == root.id:
                tree_root = node

            # Pop stack until we find the parent
            while stack and stack[-1][1] != obj.parent_id:
                stack.pop()

            if stack:
                stack[-1][0]["children"].append(node)

            stack.append((node, obj.id))

        if tree_root:
            trees.append(tree_root)

    return trees
