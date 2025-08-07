from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional

from app.schemas.core import InstancesRead, InstancesCreate, InstancesUpdate
from app.crud.core.instances import create_instance, get_instances, get_instance
from app.db.database import get_async_session

router = APIRouter(prefix="/instances", tags=["DB: Core: Instances"])

@router.get("/", response_model=list[InstancesRead])
async def read_instances(
    db: AsyncSession = Depends(get_async_session),
    type_id: Optional[int] = Query(None),
    object_id: Optional[int] = Query(None),
    is_active: Optional[bool] = Query(None)
):
    return await get_instances(db, type_id, object_id, is_active)

@router.get("/{instance_id}", response_model=InstancesRead)
async def read_instances(instance_id: int, db: AsyncSession = Depends(get_async_session)):
    instance = await get_instance(db, instance_id)
    if not instance:
        raise HTTPException(status_code=404, detail="Property not found")
    return instance

@router.post("/", response_model=InstancesCreate)
async def add_instances(data: InstancesCreate, db: AsyncSession = Depends(get_async_session)):
    return await create_instance(db, data)

@router.delete("/{instance_id}", status_code=204)
async def delete_instances(object_id: int, db: AsyncSession = Depends(get_async_session)):
    await delete_instance(db, instance_id)