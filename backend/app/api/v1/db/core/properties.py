from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.schemas.core import PropertiesRead, PropertiesCreate, PropertiesUpdate
from app.crud.core.properties import create_property, get_properties, get_property
from app.db.database import get_async_session

router = APIRouter(prefix="/properties", tags=["DB: Core: Properties"])

@router.get("/", response_model=list[PropertiesRead])
async def read_properties(db: AsyncSession = Depends(get_async_session)):
    return await get_properties(db)

@router.get("/{property_id}", response_model=PropertiesRead)
async def read_type(property_id: int, db: AsyncSession = Depends(get_async_session)):
    property_ = await get_property(db, property_id)
    if not property_:
        raise HTTPException(status_code=404, detail="Property not found")
    return property_

@router.post("/", response_model=PropertiesCreate)
async def add_properties(data: PropertiesCreate, db: AsyncSession = Depends(get_async_session)):
    return await create_property(db, data)

@router.delete("/{property_id}", status_code=204)
async def delete_properties(object_id: int, db: AsyncSession = Depends(get_async_session)):
    await delete_property(db, property_id)