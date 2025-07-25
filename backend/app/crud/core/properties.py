from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.models.core import *
from app.schemas.core import *
from typing import List, Optional
from fastapi import HTTPException

#Get all of the available properties
async def get_properties(db: AsyncSession) -> List[Properties]:
    result = await db.execute(select(Properties))
    return result.scalars().all()

#Get one type using the property's id
async def get_property(db: AsyncSession, property_id: int) -> Optional[Properties]:
    result = await db.execute(select(Properties).where(Properties.id == property_id))
    return result.scalar_one_or_none()

#Create a property
async def create_property(db: AsyncSession, data: PropertiesCreate):

    property_type = await db.get(PropertyTypes, data.property_id)
    if not property_type:
        raise HTTPException(status_code = 404, detail="Property type not found")

    obj = await db.get(Objects, data.object_id)
    if not obj:
        raise HTTPException(status_code = 404, detail="Object not found")

    property_ = Properties(**data.dict())

    db.add(property_)
    
    await db.commit()
    await db.refresh(property_)
    
    return property_

async def delete_property(db: AsyncSession, property_id: int) -> None:
    result = await db.execute(select(Properties).where(Properties.id == property_id))
    property = result.scalar_one_or_none()

    if property is None:
        raise HTTPException(status_code=404, detail="Property not found")

    await db.delete(property)
    await db.commit()

