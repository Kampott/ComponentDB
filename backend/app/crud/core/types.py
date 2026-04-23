from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text
from sqlalchemy.sql import and_

from app.crud.core.default import DefaultQueries
from app.crud.core.dfs import recalculate_tree
from app.models.core import *
from app.models.events import EventTypesTypes
from app.schemas.core import *
from typing import List, Optional
from fastapi import HTTPException

from app.services.integrity_hooks import update_merkle_snapshot_no_commit

async def get_types(
        db: AsyncSession,
        name: Optional[str] = None,
        parent_id: Optional[int] = None,
        root_id: Optional[int] = None,
        event_type_id: Optional[int] = None,
) -> List[Types]:
    query = select(Types)
    filters = []
    if name is not None:
        filters.append(Types.name == name)
    if parent_id is not None:
        filters.append(Types.parent_id == parent_id)
    if root_id is not None:
        filters.append(Types.root_id == root_id)
    if event_type_id is not None:
        query = query.join(EventTypesTypes, Types.id == EventTypesTypes.type_id)
        filters.append(EventTypesTypes.event_type_id == event_type_id)
    if filters:
        query = query.where(and_(*filters))
    result = await db.execute(query)
    return list(result.scalars().all())


async def get_type(db: AsyncSession, type_id: int) -> Optional[Types]:
    result = await db.execute(select(Types).where(Types.id == type_id))
    return result.scalar_one_or_none()


async def get_type_subtree(db: AsyncSession, type_id: int) -> List[Types]:
    type = await db.get(Types, type_id)
    if type is None:
        return []
    result = await db.execute(
        select(Types)
        .where(
            (Types.root_id == type.root_id) &
            (Types.tin >= type.tin) &
            (Types.tout <= type.tout)
        )
        .order_by(Types.tin)
    )
    return list(result.scalars().all())


async def get_type_ancestors(db: AsyncSession, type_id: int) -> List[Types]:
    type_ = await db.get(Types, type_id)
    if type_ is None:
        return []
    result = await db.execute(
        select(Types)
        .where(
            (Types.root_id == type_.root_id) &
            (Types.tin <= type_.tin) &
            (Types.tout >= type_.tout) &
            (Types.id != type_id)
        )
        .order_by(Types.tin)
    )
    return list(result.scalars().all())


async def create_type(db: AsyncSession, data: TypesCreate, changed_by_user_id=None) -> Types:
    if data.parent_id:
        parent_type = await db.get(Types, data.parent_id)
        if not parent_type:
            raise HTTPException(status_code=404, detail="Parent type not found")

        type_ = Types(**data.model_dump(), root_id=parent_type.root_id)
        db.add(type_)
        await db.flush()
        await recalculate_tree(db, Types, parent_type.root_id)
        await update_merkle_snapshot_no_commit(
            db, "types", parent_type.root_id, changed_by_user_id
        )
    else:
        result = await db.execute(text("SELECT nextval('types_id_seq')"))
        next_id = result.scalar()
        type_ = Types(id=next_id, **data.model_dump(), root_id=next_id)
        type_.tin = 0
        type_.tout = 1
        type_.tree_size = 1
        db.add(type_)
        await db.flush()
        await update_merkle_snapshot_no_commit(
            db, "types", type_.root_id, changed_by_user_id
        )
    
    await db.commit()
    await db.refresh(type_)
    return type_

async def create_type_no_rehash(db: AsyncSession, data: TypesCreate, changed_by_user_id=None) -> Types:
    if data.parent_id:
        parent_type = await db.get(Types, data.parent_id)
        if not parent_type:
            raise HTTPException(status_code=404, detail="Parent type not found")

        type_ = Types(**data.model_dump(), root_id=parent_type.root_id)
        db.add(type_)
        await db.flush()
        await recalculate_tree(db, Types, parent_type.root_id)
    else:
        result = await db.execute(text("SELECT nextval('types_id_seq')"))
        next_id = result.scalar()
        type_ = Types(id=next_id, **data.model_dump(), root_id=next_id)
        type_.tin = 0
        type_.tout = 1
        type_.tree_size = 1
        db.add(type_)
        await db.flush()
    
    await db.commit()
    await db.refresh(type_)
    return type_

async def delete_type(db: AsyncSession, type_id: int, changed_by_user_id=None) -> None:
    type_ = await db.get(Types, type_id)
    if type_ is None:
        raise HTTPException(status_code=404, detail="Type not found")

    root_id = type_.root_id
    is_root = (type_.id == root_id)

    await db.delete(type_)
    await db.flush()

    if not is_root:
        await recalculate_tree(db, Types, root_id)

    await update_merkle_snapshot_no_commit(
        db,
        "types",
        root_id,
        changed_by_user_id,
    )

    await db.commit()


async def move_type(db: AsyncSession, type_id: int, new_parent_id: int, changed_by_user_id=None) -> Types:
    type_ = await db.get(Types, type_id)
    if type_ is None:
        raise HTTPException(status_code=404, detail="Type not found")

    new_parent = await db.get(Types, new_parent_id)
    if new_parent is None:
        raise HTTPException(status_code=404, detail="New parent not found")

    if new_parent.root_id == type_id:
        raise HTTPException(status_code=400, detail="Cannot move type into its own subtree")

    old_root_id = type_.root_id
    new_root_id = new_parent.root_id

    subtree_result = await db.execute(
        select(Types).where(
            (Types.root_id == old_root_id) &
            (Types.tin >= type_.tin) &
            (Types.tout <= type_.tout)
        )
    )
    for node in subtree_result.scalars().all():
        node.root_id = new_root_id

    type_.parent_id = new_parent_id
    await db.flush()

    await recalculate_tree(db, Types, new_root_id)
    if old_root_id != new_root_id:
        await recalculate_tree(db, Types, old_root_id)

    await update_merkle_snapshot_no_commit(db, "types", new_root_id, changed_by_user_id)
    if old_root_id != new_root_id:
        await update_merkle_snapshot_no_commit(db, "types", old_root_id, changed_by_user_id)

    await db.commit()
    await db.refresh(type_)
    return type_


async def update_type(session: AsyncSession, type_id: int, data: TypesUpdate, changed_by_user_id=None) -> Types | None:
    updated = await DefaultQueries.update(session, Types, type_id, data, commit=False)
    if not updated:
        return None

    await recalculate_tree(session, Types, updated.root_id)
    await update_merkle_snapshot_no_commit(
        session=session,
        scope_type="types",
        root_id=updated.root_id,
        changed_by_user_id=changed_by_user_id,
    )

    await session.commit()
    return updated