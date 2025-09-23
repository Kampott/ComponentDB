from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import joinedload
from sqlalchemy.future import select
from sqlalchemy.sql import and_

from app.crud.core.default import DefaultQueries
from app.models.core import *
from app.schemas.core import *
from typing import List, Optional
from fastapi import HTTPException

# Get all available instances with optional filters
async def get_instances(
    db: AsyncSession,
    name: Optional[str] = None,
    object_id: Optional[int] = None,
    root_id: Optional[int] = None,
    parent_id: Optional[int] = None,
    index_of_layer: Optional[int] = None,
    is_active: Optional[bool] = None
) -> list[dict]:
    # Основной запрос с outer join, чтобы получить все Instances, даже если нет записей в InstanceTreeMap
    query = (
        select(
            Instances.id,
            Instances.name,
            Instances.object_id,
            Instances.root_id,
            Instances.parent_id,
            Instances.index_of_layer,
            Instances.is_active
        )
    )

    # Формируем фильтры
    filters = []
    if name is not None:
        filters.append(Instances.name == name)
    if object_id is not None:
        filters.append(Instances.object_id == object_id)
    if root_id is not None:
        filters.append(Instances.root_id == root_id)
    if parent_id is not None:
        filters.append(Instances.parent_id == parent_id)
    if index_of_layer is not None:
        filters.append(Instances.index_of_layer == index_of_layer)
    if is_active is not None:
        filters.append(Instances.is_active == is_active)


    # Применяем фильтры
    if filters:
        query = query.where(and_(*filters))
        print(query)

    # Выполняем запрос
    result = await db.execute(query)
    return result.mappings().all()

#Get one type using the instances's id
async def get_instance(db: AsyncSession, instance_id: int) -> Optional[Instances]:
    result = await db.execute(select(Instances).where(Instances.id == instance_id))
    return result.scalar_one_or_none()

async def create_instance(db: AsyncSession, data: InstancesCreate):
    #creating both id
    index_of_layer = 1
    root_id = None

    # Checking that the object exists
    print(data.object_id)
    obj = await db.get(Objects, data.object_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Object not found")

    #if parent_id present - getting the index of layer and adding 1, root = parent.root
    if data.parent_id:
        parent_instance = await db.get(Instances, data.parent_id)
        if not parent_instance:
            raise HTTPException(status_code=404, detail="Parent Instance not found")
        
        index_of_layer = parent_instance.index_of_layer + 1
        root_id = parent_instance.root_id
    

    # Creating the instance
    instance = Instances(
        **data.dict(),
        index_of_layer=index_of_layer,
        root_id = root_id
    )

    db.add(instance)
    await db.flush()

    if data.parent_id is None:
        instance.root_id = instance.id
        await db.flush()

    await db.commit()
    await db.refresh(instance)

    return instance

async def delete_instance(db: AsyncSession, instance_id: int) -> None:
    instance = await db.get(Instances, instance_id)
    if instance is None:
        raise HTTPException(status_code=404, detail="Instance not found")

    await db.delete(instance)
    await db.commit()

async def update_instance(session: AsyncSession, instance_id: int, data: InstancesUpdate) -> Instances | None:
    return await DefaultQueries.update(session, Instances, instance_id, data)
