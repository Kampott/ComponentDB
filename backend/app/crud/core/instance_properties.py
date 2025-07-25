from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.models.core import *
from app.schemas.core import *
from typing import List, Optional
from fastapi import HTTPException


######## Instance Properties   

#Get all of the available instance properties
async def get_instanceproperties(db: AsyncSession) -> List[InstanceProperties]:
    result = await db.execute(select(InstanceProperties))
    return result.scalars().all()

#Get one type using the properties id
async def get_instanceproperty(db: AsyncSession, instanceproperty_id: int) -> Optional[InstanceProperties]:
    result = await db.execute(select(InstanceProperties).where(InstanceProperties.id == instanceproperty_id))
    return result.scalar_one_or_none()

#Create an instance property
async def create_instanceproperty(db: AsyncSession, data: InstancePropertiesCreate):
    
    
    instance_ident = await db.get(Instances, data.instance_id)
    if not instance_ident:
            raise HTTPException(status_code=404, detail="Instance id not found")

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