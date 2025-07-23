from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.schemas.core import InstancesRead, InstancesCreate, InstancesUpdate
from app.crud.core import create_instance, get_instances, get_instance
from app.db.database import get_async_session

router = APIRouter(prefix="/instances", tags=["core"])

@router.get("/", response_model=list[InstancesRead])
async def read_instances(db: AsyncSession = Depends(get_async_session)):
    return await get_instances(db)

@router.get("/{instance_id}", response_model=InstancesRead)
async def read_instances(instance_id: int, db: AsyncSession = Depends(get_async_session)):
    instance = await get_instance(db, instance_id)
    if not instance:
        raise HTTPException(status_code=404, detail="Property not found")
    return instance

@router.post("/", response_model=InstancesCreate)
async def add_instances(data: InstancesCreate, db: AsyncSession = Depends(get_async_session)):
    return await create_instance(db, data)