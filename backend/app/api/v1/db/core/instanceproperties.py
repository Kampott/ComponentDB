from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.schemas.core import InstancePropertiesRead, InstancePropertiesCreate, InstancePropertiesUpdate
from app.crud.core.instance_properties import *
from app.db.database import get_async_session

router = APIRouter(prefix="/instanceproperties", tags=["DB: Core: Instance Properties"])

@router.get("/", response_model=list[InstancePropertiesRead])
async def read_instance_properties(db: AsyncSession = Depends(get_async_session)):
    return await get_instanceproperties(db)

@router.get("/{instance_property_id}", response_model=InstancePropertiesRead)
async def read_instance_properties(instance_property_id: int, db: AsyncSession = Depends(get_async_session)):
    obj = await get_instanceproperty(db, instance_property_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Instance property not found")
    return obj

@router.post("/", response_model=InstancePropertiesCreate)
async def add_object(data: InstancePropertiesCreate, db: AsyncSession = Depends(get_async_session)):
    return await create_instanceproperty(db, data)

@router.delete("/{instance_property_id}", status_code=204)
async def delete_instance_property(object_id: int, db: AsyncSession = Depends(get_async_session)):
    await delete_instanceproperty(db, instance_property_id)