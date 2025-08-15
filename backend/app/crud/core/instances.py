from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import joinedload
from sqlalchemy.future import select
from sqlalchemy.sql import and_
from app.models.core import *
from app.schemas.core import *
from typing import List, Optional
from fastapi import HTTPException

# Get all available instances with optional filters
async def get_instances(
    db: AsyncSession,
    object_id: Optional[int] = None,
    name: Optional[str] = None,
    tree_id: Optional[int] = None,
    is_active: Optional[bool] = None
) -> list[dict]:
    # Основной запрос с outer join, чтобы получить все Instances, даже если нет записей в InstanceTreeMap
    query = (
        select(
            Instances.id,
            Instances.name,
            Instances.object_id,
            Instances.is_active,
            InstanceTreeMap.tree_id
        )
        .join(InstanceTreeMap, InstanceTreeMap.instance_id == Instances.id)
        .distinct()  # Убираем дубликаты, если join даёт несколько строк
    )

    # Формируем фильтры
    filters = []
    if name is not None:
        filters.append(Instances.name == name)
    if object_id is not None:
        filters.append(Instances.object_id == object_id)
    if is_active is not None:
        filters.append(Instances.is_active == is_active)
    if tree_id is not None:
        filters.append(InstanceTreeMap.tree_id == tree_id)


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
    # Checking that the object exists
    obj = await db.get(Objects, data.object_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Object not found")

    # Creating the instance
    instance = Instances(
        object_id=data.object_id,
        is_active=data.is_active,
        name=data.name
    )
    db.add(instance)
    await db.flush()

    # Creating a link to the "Tree"
    tree_map = InstanceTreeMap(
        tree_id=data.tree_id,  # saving what's transmitted by the user
        instance_id=instance.id,
        is_active=True
    )
    db.add(tree_map)

    await db.commit()
    await db.refresh(instance)

    return instance

async def delete_instance(db: AsyncSession, instance_id: int) -> None:
    instance = await db.get(Instances, instance_id)
    if instance is None:
        raise HTTPException(status_code=404, detail="Instance not found")

    await db.delete(instance)
    await db.commit()
