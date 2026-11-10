from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.sql import and_

from app.crud.core.default import DefaultQueries
from app.crud.core.dfs import recalculate_tree
from app.services.integrity_hooks import update_merkle_snapshot_no_commit
from app.models.core import *
from app.schemas.core import *
from typing import List, Optional
from fastapi import HTTPException


async def get_objects(
        db: AsyncSession,
        name: Optional[str] = None,
        type_id: Optional[int] = None,
        parent_id: Optional[int] = None,
        root_id: Optional[int] = None,
) -> List[Objects]:
    query = select(Objects)
    filters = []
    if name is not None:
        filters.append(Objects.name == name)
    if type_id is not None:
        filters.append(Objects.type_id == type_id)
    if parent_id is not None:
        filters.append(Objects.parent_id == parent_id)
    if root_id is not None:
        filters.append(Objects.root_id == root_id)
    if filters:
        query = query.where(and_(*filters))
    result = await db.execute(query)
    return list(result.scalars().all())


async def get_object(db: AsyncSession, object_id: int) -> Optional[Objects]:
    result = await db.execute(select(Objects).where(Objects.id == object_id))
    return result.scalar_one_or_none()


async def get_object_subtree(db: AsyncSession, object_id: int) -> List[Objects]:
    obj = await db.get(Objects, object_id)
    if obj is None:
        return []
    result = await db.execute(
        select(Objects)
        .where(
            (Objects.root_id == obj.root_id) &
            (Objects.tin >= obj.tin) &
            (Objects.tout <= obj.tout)
        )
        .order_by(Objects.tin)
    )
    return list(result.scalars().all())


async def get_object_ancestors(db: AsyncSession, object_id: int) -> List[Objects]:
    obj = await db.get(Objects, object_id)
    if obj is None:
        return []
    result = await db.execute(
        select(Objects)
        .where(
            (Objects.root_id == obj.root_id) &
            (Objects.tin <= obj.tin) &
            (Objects.tout >= obj.tout) &
            (Objects.id != object_id)
        )
        .order_by(Objects.tin)
    )
    return list(result.scalars().all())


async def create_object(db: AsyncSession, data: ObjectsCreate, changed_by_user_id=None) -> Objects:
    type_obj = await db.get(Types, data.type_id)
    if not type_obj:
        raise HTTPException(status_code=404, detail="Type not found")

    root_id = None
    if data.parent_id:
        parent_obj = await db.get(Objects, data.parent_id)
        if not parent_obj:
            raise HTTPException(status_code=404, detail="Parent object not found")
        root_id = parent_obj.root_id

    obj = Objects(**data.model_dump(), root_id=root_id)
    db.add(obj)
    await db.flush()

    if data.parent_id:
        await update_merkle_snapshot_no_commit(
            db, "objects", root_id, changed_by_user_id
        )
    else:
        obj.root_id = obj.id
        await db.flush()
        await update_merkle_snapshot_no_commit(
            db, "objects", obj.root_id, changed_by_user_id
        )

    await recalculate_tree(db, Objects, obj.root_id)
    await db.commit()
    await db.refresh(obj)
    return obj


async def delete_object(db: AsyncSession, object_id: int, changed_by_user_id=None) -> None:
    obj = await db.get(Objects, object_id)
    if obj is None:
        raise HTTPException(status_code=404, detail="Object not found")

    root_id = obj.root_id
    is_root = (obj.id == root_id)

    await db.delete(obj)
    await db.flush()

    if not is_root:
        await recalculate_tree(db, Objects, root_id)

    await update_merkle_snapshot_no_commit(
        db,
        "objects",
        root_id,
        changed_by_user_id,
    )

    await db.commit()


async def move_object(db: AsyncSession, object_id: int, new_parent_id: int, changed_by_user_id=None) -> Objects:
    obj = await db.get(Objects, object_id)
    if obj is None:
        raise HTTPException(status_code=404, detail="Object not found")

    new_parent = await db.get(Objects, new_parent_id)
    if new_parent is None:
        raise HTTPException(status_code=404, detail="New parent not found")

    if new_parent.root_id == object_id:
        raise HTTPException(status_code=400, detail="Cannot move object into its own subtree")

    old_root_id = obj.root_id
    new_root_id = new_parent.root_id


    subtree_result = await db.execute(
        select(Objects).where(
            (Objects.root_id == old_root_id) &
            (Objects.tin >= obj.tin) &
            (Objects.tout <= obj.tout)
        )
    )
    subtree = subtree_result.scalars().all()
    for node in subtree:
        node.root_id = new_root_id

    obj.parent_id = new_parent_id
    await db.flush()

    await recalculate_tree(db, Objects, new_root_id)
    if old_root_id != new_root_id:
        await recalculate_tree(db, Objects, old_root_id)

    await update_merkle_snapshot_no_commit(db, "objects", new_root_id, changed_by_user_id)
    if old_root_id != new_root_id:
        await update_merkle_snapshot_no_commit(db, "objects", old_root_id, changed_by_user_id)

    await db.commit()
    await db.refresh(obj)
    return obj


async def update_object(session: AsyncSession, object_id: int, data: ObjectsUpdate, changed_by_user_id = None) -> Objects | None:
    updated = await DefaultQueries.update(session, Objects, object_id, data)
    if not updated:
        return None

    await recalculate_tree(session, Objects, updated.root_id)
    await update_merkle_snapshot_no_commit(
        session=session,
        scope_type="objects",
        root_id=updated.root_id,
        changed_by_user_id=changed_by_user_id,
    )

    await session.commit()
    return updated