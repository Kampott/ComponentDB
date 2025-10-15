from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional

from app.schemas.core import InstancesRead, InstancesCreate, InstancesUpdate, InstanceCreated
import app.crud.core.instances as db
from app.db.database import get_async_session

router = APIRouter(prefix="/instances", tags=["DB: Core: Instances"])


@router.get("/", response_model=list[InstancesRead])
async def read_instances(
        session: AsyncSession = Depends(get_async_session),
        name: Optional[str] = Query(None),
        object_id: Optional[int] = Query(None),
        root_id: Optional[int] = Query(None),
        parent_id: Optional[int] = Query(None),
        is_active: Optional[bool] = Query(None)
):
    return await db.get_instances(session, name, object_id, root_id, parent_id, is_active)


@router.get("/{instance_id}", response_model=InstancesRead)
async def read_instances(instance_id: int, session: AsyncSession = Depends(get_async_session)):
    instance = await db.get_instance(session, instance_id)
    if not instance:
        raise HTTPException(status_code=404, detail="Instance not found")
    return instance


@router.post("/", response_model=InstanceCreated)
async def add_instances(data: InstancesCreate, session: AsyncSession = Depends(get_async_session)):
    return await db.create_instance(session, data)


@router.delete("/{instance_id}", status_code=204)
async def delete_instances(instance_id: int, session: AsyncSession = Depends(get_async_session)):
    await db.delete_instance(session, instance_id)


@router.patch("/{instance_id}")
async def update_instance(instance_id: int, data: InstancesUpdate,
                          session: AsyncSession = Depends(get_async_session)) -> InstancesRead:
    updated_instance: InstancesRead | None = await db.update_instance(session, instance_id, data)
    if not updated_instance:
        raise HTTPException(
            status_code=404,
            detail="Экземпляр не найден"
        )
    return updated_instance
