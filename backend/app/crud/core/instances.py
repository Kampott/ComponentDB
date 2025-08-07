from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import joinedload
from sqlalchemy.future import select
from sqlalchemy.sql import and_
from app.models.core import *
from app.schemas.core import *
from typing import List, Optional
from fastapi import HTTPException

#Get all of the available instances
async def get_instances(db: AsyncSession,
    type_id: Optional[int] = None,
    object_id: Optional[int] = None,
    is_active: Optional[bool] = None
) -> List[Instances]:
    query = select(Instances)

    filters = []
    if type_id is not None:
        filters.append(Instances.type_id == type_id)
    if object_id is not None:
        filters.append(Instances.object_id == object_id)
    if is_active is not None:
        filters.append(Instances.is_active == is_active)

    if filters:
        query = query.where(and_(*filters))

    result = await db.execute(query)
    return result.scalars().all()

#Get one type using the instances's id
async def get_instance(db: AsyncSession, instance_id: int) -> Optional[Instances]:
    result = await db.execute(select(Instances).where(Instances.id == instance_id))
    return result.scalar_one_or_none()

#Create an instances
async def create_instance(db: AsyncSession, data: InstancesCreate):

    obj = await db.get(Objects, data.object_id)
    if not obj:
        raise HTTPException(status_code = 404, detail="Object not found")

    instance = Instances(
        **data.dict(),
        type_id=obj.type_id
        )

    db.add(instance)
    
    await db.commit()
    await db.refresh(instance)
    
    return instance

async def delete_instance(db: AsyncSession, instance_id: int) -> None:
    result = await db.execute(select(Instances).where(Instances.id == instance_id))
    inst = result.scalar_one_or_none()

    if inst is None:
        raise HTTPException(status_code=404, detail="Instance not found")

    await db.delete(inst)
    await db.commit()