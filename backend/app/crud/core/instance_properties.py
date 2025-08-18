from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import joinedload
from sqlalchemy.future import select
from sqlalchemy.sql import and_
from app.models.core import *
from app.schemas.core import *
from typing import List, Optional
from fastapi import HTTPException


######## Instance Properties   

#Get all of the available instance properties
async def get_instanceproperties(db: AsyncSession,
    instance_id: Optional[int] = None,
    value: Optional[str] = None,
    property_type_id: Optional[int] = None
) -> List[InstanceProperties]:
    query = select(InstanceProperties)

    filters = []
    if instance_id is not None:
        filters.append(InstanceProperties.instance_id == instance_id)
    if value is not None:
        filters.append(InstanceProperties.value == value)
    if property_type_id is not None:
        filters.append(InstanceProperties.property_type_id == property_type_id)

    if filters:
        query = query.where(and_(*filters))

    result = await db.execute(query)
    return result.scalars().all()

#Get one type using the properties id
async def get_instanceproperty(db: AsyncSession, instanceproperty_id: int) -> Optional[InstanceProperties]:
    result = await db.execute(select(InstanceProperties).where(InstanceProperties.id == instanceproperty_id))
    return result.scalar_one_or_none()

#Create an instance property
async def create_instanceproperty(db: AsyncSession, data: InstancePropertiesCreate):
    
    
    instance = await db.get(Instances, data.instance_id)
    property_type = await db.get(PropertyTypes, data.property_type_id)
    if not instance:
            raise HTTPException(status_code=404, detail="Instance id not found")
    elif not property_type:
            raise HTTPException(status_code=404, detail="Property type not found")

    instance_property = InstanceProperties(**data.dict())


    

    db.add(instance_property)
    
    await db.commit()
    await db.refresh(instance_property)
    
    return instance_property

async def delete_instanceproperty(db: AsyncSession, instance_property_id: int) -> None:
    result = await db.execute(select(InstanceProperties).where(InstanceProperties.id == instance_property_id))
    instanceproperty = result.scalar_one_or_none()

    if instanceproperty is None:
        raise HTTPException(status_code=404, detail="Instance property not found")

    await db.delete(instanceproperty)
    await db.commit()