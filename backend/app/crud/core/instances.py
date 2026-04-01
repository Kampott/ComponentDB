from sqlalchemy.dialects.mysql import insert
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from sqlalchemy.orm import joinedload
from sqlalchemy.future import select
from sqlalchemy.sql import and_

from app.crud.core.default import DefaultQueries
from app.models.core import *
from app.schemas.core import *
from typing import List, Optional
from fastapi import HTTPException, Depends



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


async def create_instance(
    db: AsyncSession,
    data: InstancesCreate
    ):
    # creating both id
    root_id = None

    obj = await db.get(Objects, data.object_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Object not found")

    # if parent_id present - getting the index of layer and adding 1, root = parent.root
    if data.parent_id:
        parent_instance = await db.get(Instances, data.parent_id)
        if not parent_instance:
            raise HTTPException(status_code=404, detail="Parent Instance not found")
        root_id = parent_instance.root_id

    # Creating the instance
    instance = Instances(
        **data.model_dump(),
        root_id=root_id
    )

    db.add(instance)
    await db.flush()

    if data.parent_id is None:
        instance.root_id = instance.id
        await db.flush()

    await db.commit()
    await db.refresh(instance)

    return instance


async def delete_instance(db: AsyncSession, 
    instance_id: int
    ) -> None:
    instance = await db.get(Instances, instance_id)
    if instance is None:
        raise HTTPException(status_code=404, detail="Instance not found")

    await db.delete(instance)
    await db.commit()


async def update_instance(
    session: AsyncSession, 
    instance_id: int, 
    data: InstancesUpdate
    ) -> Instances | None:
    return await DefaultQueries.update(session, Instances, instance_id, data)


async def create_instance_for_sub_tree(
    session: AsyncSession, 
    object_parent_id: int,
    instance_parent_id: int, 
    instance_root_id: int) -> str | None:
    query = (
        select(Objects)
        .where(Objects.parent_id == object_parent_id)
    )
    objects = (await session.execute(query)).scalars().all()

    if len(objects) == 0:
        return None

    instances_add: list[dict] = []
    for obj in objects:
        instances_add.append({
            'name': obj.name,
            'root_id': instance_root_id,
            'object_id': obj.id,
            'parent_id': instance_parent_id,
            'is_active': True,
        })

    query = (
        insert(Instances)
        .values(instances_add)
        .returning(Instances.id)
    )

    instances_id = (await session.execute(query)).scalars().all()
    if len(instances_id) != len(objects):
        return "Something went wrong"

    for obj, instance_id in zip(objects, instances_id):
        err = await create_instance_for_sub_tree(session, obj.id, instance_id, instance_root_id)
        if err:
            return err


async def create_instance_from_object_tree(session: AsyncSession, object_root_id: int) -> Instances | None:
    query = (
        select(Objects)
        .where(Objects.id == object_root_id)
    )
    root_object: Objects | None = (await session.execute(query)).scalar_one_or_none()
    if root_object is None or root_object.parent_id is not None:
        return None


    root_instance_add = Instances(
        name=root_object.name,
        object_id=root_object.id,
        parent_id=None,
        is_active=True,
    )

    session.add(root_instance_add)
    await session.flush()
    root_instance_add.root_id = root_instance_add.id
    await session.flush()


    root_instance_id = root_instance_add.id
    err = await create_instance_for_sub_tree(session, object_root_id, root_instance_id, root_instance_id)




    await session.commit()
    return root_instance_add
