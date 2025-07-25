from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.schemas.core import PropertyTypesRead, PropertyTypesCreate, PropertyTypesUpdate
from app.crud.core.property_types import create_propertytype, get_propertytypes, get_propertytype
from app.db.database import get_async_session

router = APIRouter(prefix="/property_types", tags=["DB: Core: Property Types"])

@router.get("/", response_model=list[PropertyTypesRead])
async def read_types(db: AsyncSession = Depends(get_async_session)):
    return await get_propertytypes(db)

@router.get("/{property_type_id}", response_model=PropertyTypesRead)
async def read_propertytype(property_type_id: int, db: AsyncSession = Depends(get_async_session)):
    property_type = await get_propertytype(db, property_type_id)
    if not property_type:
        raise HTTPException(status_code=404, detail="Type proprety not found")
    return property_type

@router.post("/", response_model=PropertyTypesCreate)
async def add_propertytype(data: PropertyTypesCreate, db: AsyncSession = Depends(get_async_session)):
    return await create_propertytype(db, data)

@router.delete("/{property_type_id}", status_code=204)
async def delete_property_types(object_id: int, db: AsyncSession = Depends(get_async_session)):
    await delete_property_type(db, property_type_id)