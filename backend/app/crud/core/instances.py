from sqlalchemy.dialects.mysql import insert
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from sqlalchemy.orm import joinedload
from sqlalchemy.future import select
from sqlalchemy.sql import and_

from app.crud.core.default import DefaultQueries
from app.crud.core.dfs import recalculate_tree
from app.models.core import *
from app.schemas.core import *
from typing import List, Optional
from fastapi import HTTPException, Depends

from app.services.integrity_hooks import update_merkle_snapshot_no_commit



async def get_instances(
        db: AsyncSession,
        name: Optional[str] = None,
        object_id: Optional[int] = None,
        root_id: Optional[int | list[int]] = None,
        parent_id: Optional[int] = None,
        is_active: Optional[bool] = None
) -> list[dict]:
    from sqlalchemy import and_

    query = select(
        Instances.id,
        Instances.name,
        Instances.object_id,
        Instances.root_id,
        Instances.parent_id,
        Instances.is_active
    )

    filters = []
    if name is not None:
        filters.append(Instances.name == name)
    if object_id is not None:
        filters.append(Instances.object_id == object_id)
    if root_id is not None:
        if isinstance(root_id, list):
            if not root_id:
                return []
            filters.append(Instances.root_id.in_(root_id))
        else:
            filters.append(Instances.root_id == root_id)
    if parent_id is not None:
        filters.append(Instances.parent_id == parent_id)
    if is_active is not None:
        filters.append(Instances.is_active == is_active)

    if filters:
        query = query.where(and_(*filters))

    result = await db.execute(query)
    return [dict(row) for row in result.mappings().all()]

# Get one type using the instances's id
async def get_instance(db: AsyncSession, 
    instance_id: int) -> Optional[Instances]:
    result = await db.execute(select(Instances).where(Instances.id == instance_id))
    return result.scalar_one_or_none()

async def get_instance_subtree(db: AsyncSession, instance_id: int) -> List[Instances]:
    inst = await db.get(Instances, instance_id)
    if inst is None:
        return []
    result = await db.execute(
        select(Instances)
        .where(
            (Instances.root_id == inst.root_id) &
            (Instances.tin >= inst.tin) &
            (Instances.tout <= inst.tout)
        )
        .order_by(Instances.tin)
    )
    return list(result.scalars().all())

async def get_instance_ancestors(db: AsyncSession, instance_id: int) -> List[Instances]:
    inst = await db.get(Instances, instance_id)
    if inst is None:
        return []
    result = await db.execute(
        select(Instances)
        .where(
            (Instances.root_id == inst.root_id) &
            (Instances.tin <= inst.tin) &
            (Instances.tout >= inst.tout) &
            (Instances.id != instance_id)
        )
        .order_by(Instances.tin)
    )
    return list(result.scalars().all())



async def create_instance(db: AsyncSession, data: InstancesCreate, changed_by_user_id=None) -> Instances:
    obj = await db.get(Objects, data.object_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Object not found")

    root_id = None
    if data.parent_id:
        parent_instance = await db.get(Instances, data.parent_id)
        if not parent_instance:
            raise HTTPException(status_code=404, detail="Parent Instance not found")
        root_id = parent_instance.root_id

    instance = Instances(**data.model_dump(), root_id=root_id)
    db.add(instance)
    await db.flush()
    await update_merkle_snapshot_no_commit(
        db, "instances", root_id, changed_by_user_id
    )
    if data.parent_id is None:
        instance.root_id = instance.id
        await db.flush()
        await update_merkle_snapshot_no_commit(
            db, "instances", instance.root_id, changed_by_user_id
        )

    await recalculate_tree(db, Instances, instance.root_id)
    await db.commit()
    await db.refresh(instance)
    return instance


async def delete_instance(db: AsyncSession, instance_id: int, changed_by_user_id=None) -> None:
    instance = await db.get(Instances, instance_id)
    if instance is None:
        raise HTTPException(status_code=404, detail="Instance not found")

    root_id = instance.root_id
    is_root = (instance.id == root_id)

    await db.delete(instance)
    await db.flush()

    if not is_root:
        await recalculate_tree(db, Instances, root_id)
    await update_merkle_snapshot_no_commit(
        db,
        "instances",
        root_id,
        changed_by_user_id,
    )
    await db.commit()

async def move_instance(db: AsyncSession, instance_id: int, new_parent_id: int, changed_by_user_id=None) -> Instances:
    instance = await db.get(Instances, instance_id)
    if instance is None:
        raise HTTPException(status_code=404, detail="Instance not found")

    new_parent = await db.get(Instances, new_parent_id)
    if new_parent is None:
        raise HTTPException(status_code=404, detail="New parent not found")

    if new_parent.root_id == instance_id:
        raise HTTPException(status_code=400, detail="Cannot move instance into its own subtree")

    old_root_id = instance.root_id
    new_root_id = new_parent.root_id

    subtree_result = await db.execute(
        select(Instances).where(
            (Instances.root_id == old_root_id) &
            (Instances.tin >= instance.tin) &
            (Instances.tout <= instance.tout)
        )
    )
    for node in subtree_result.scalars().all():
        node.root_id = new_root_id

    instance.parent_id = new_parent_id
    await db.flush()

    await recalculate_tree(db, Instances, new_root_id)
    if old_root_id != new_root_id:
        await recalculate_tree(db, Instances, old_root_id)

    await update_merkle_snapshot_no_commit(db, "instances", new_root_id, changed_by_user_id)
    if old_root_id != new_root_id:
        await update_merkle_snapshot_no_commit(db, "instances", old_root_id, changed_by_user_id)

    await db.commit()
    await db.refresh(instance)
    return instance



async def update_instance(session: AsyncSession, instance_id: int, data: InstancesUpdate,changed_by_user_id = None) -> Instances | None:
    updated = await DefaultQueries.update(session, Instances, instance_id, data, commit=False)
    if not updated:
        return None

    await recalculate_tree(session, Instances, updated.root_id)
    await update_merkle_snapshot_no_commit(
        session=session,
        scope_type="instances",
        root_id=updated.root_id,
        changed_by_user_id=changed_by_user_id,
    )

    await session.commit()
    return updated

async def create_instance_for_sub_tree(
        session: AsyncSession,
        object_parent_id: int,
        instance_parent_id: int,
        instance_root_id: int) -> str | None:
    query = select(Objects).where(Objects.parent_id == object_parent_id)
    objects = (await session.execute(query)).scalars().all()
    if not objects:
        return None

    instances_add = [
        {'name': obj.name, 'root_id': instance_root_id,
         'object_id': obj.id, 'parent_id': instance_parent_id, 'is_active': True}
        for obj in objects
    ]
    from sqlalchemy.dialects.postgresql import insert as pg_insert
    query = insert(Instances).values(instances_add).returning(Instances.id)
    instances_id = (await session.execute(query)).scalars().all()
    if len(instances_id) != len(objects):
        return "Something went wrong"

    for obj, instance_id in zip(objects, instances_id):
        err = await create_instance_for_sub_tree(session, obj.id, instance_id, instance_root_id)
        if err:
            return err

async def create_instance_from_object_tree(session: AsyncSession, object_root_id: int) -> Instances | None:
    root_object = (await session.execute(
        select(Objects).where(Objects.id == object_root_id)
    )).scalar_one_or_none()

    if root_object is None or root_object.parent_id is not None:
        return None

    root_instance = Instances(
        name=root_object.name,
        object_id=root_object.id,
        parent_id=None,
        is_active=True,
    )
    session.add(root_instance)
    await session.flush()
    root_instance.root_id = root_instance.id
    await session.flush()

    error_msg = await create_instance_for_sub_tree(session, object_root_id, root_instance.id, root_instance.id)
    if error_msg:
        await session.rollback()
        raise HTTPException(status_code=500, detail=error_msg)

    await recalculate_tree(session, Instances, root_instance.id)
    await session.commit()
    return root_instance
