from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional

from app.schemas.core import InstancePropertiesRead, InstancePropertiesCreate, InstancePropertiesUpdate
import app.crud.core.instance_properties as db
from app.db.database import get_async_session

router = APIRouter(prefix="/instanceproperties", tags=["DB: Core: Instance Properties"])


@router.get("/", response_model=list[InstancePropertiesRead])
async def read_instance_properties(session: AsyncSession = Depends(get_async_session),
                                   instance_id: Optional[int] = None,
                                   value: Optional[str] = None,
                                   property_type_id: Optional[int] = None):
    return await db.get_instanceproperties(session, instance_id, value, property_type_id)


@router.get("/{instance_property_id}", response_model=InstancePropertiesRead)
async def read_instance_properties(instance_property_id: int, session: AsyncSession = Depends(get_async_session)):
    obj = await db.get_instanceproperty(session, instance_property_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Instance property not found")
    return obj


@router.post("/", response_model=InstancePropertiesRead)
async def add_object(data: InstancePropertiesCreate, session: AsyncSession = Depends(get_async_session)):
    return await db.create_instanceproperty(session, data)


@router.delete("/{instance_property_id}", status_code=204)
async def delete_instance_property(instance_property_id: int, session: AsyncSession = Depends(get_async_session)):
    await db.delete_instanceproperty(session, instance_property_id)


@router.patch("/{instance_property_id}")
async def update_property_type(instance_property_id: int, data: InstancePropertiesUpdate,
                               session: AsyncSession = Depends(get_async_session)) -> InstancePropertiesRead:
    updated_instance_property: InstancePropertiesRead | None = await db.update_instance_property(
        session, instance_property_id, data
    )
    if not updated_instance_property:
        raise HTTPException(
            status_code=404,
            detail="Значение свойства экземпляра не найдено"
        )
    return updated_instance_property
