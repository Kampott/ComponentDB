from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.models.core import *
from app.schemas.core import *
from typing import List, Optional
from fastapi import HTTPException

#Get all of the available property types
async def get_propertytypes(db: AsyncSession) -> List[PropertyTypes]:
    result = await db.execute(select(PropertyTypes))
    return result.scalars().all()

#Get one type using the property types' id
async def get_propertytype(db: AsyncSession, propertytype_id: int) -> Optional[PropertyTypes]:
    result = await db.execute(select(PropertyTypes).where(PropertyTypes.id == propertytype_id))
    return result.scalar_one_or_none()

#Create a property type
async def create_propertytype(db: AsyncSession, data: PropertyTypesCreate):
    
    
    type_ident = await db.get(Types, data.type_id)
    if not data.type_id:
            raise HTTPException(status_code=404, detail="Type id not found")

    property_type = PropertyTypes(**data.dict())

    db.add(property_type)
    
    await db.commit()
    await db.refresh(property_type)
    
    return property_type

async def delete_property_type(db: AsyncSession, property_type_id: int) -> None:
    result = await db.execute(select(PropertyTypes).where(PropertyTypes.id == property_type_id))
    property_type = result.scalar_one_or_none()

    if property_type is None:
        raise HTTPException(status_code=404, detail="Property type not found")

    await db.delete(property_type)
    await db.commit()