from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import joinedload
from sqlalchemy.future import select
from sqlalchemy.sql import and_
from app.models.core import *
from app.schemas.core import *
from typing import List, Optional
from fastapi import HTTPException

#Get all of the available property types
async def get_propertytypes(
    db: AsyncSession,
    type_id: Optional[int] = None,
    name: Optional[str] = None,
    is_static: Optional[bool] = None
) -> List[PropertyTypes]:
    query = select(PropertyTypes)

    filters = []
    if type_id is not None:
        filters.append(PropertyTypes.type_id == type_id)
    if name is not None:
        filters.append(PropertyTypes.name == name)
    if is_static is not None:
        filters.append(PropertyTypes.is_static == is_static)
        
    if filters:
        query = query.where(and_(*filters))

    result = await db.execute(query)
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