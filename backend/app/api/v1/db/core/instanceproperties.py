from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional

from app.schemas.core import InstancePropertiesRead, InstancePropertiesCreate, InstancePropertiesUpdate
import app.crud.core.instance_properties as db
from app.db.database import get_async_session

from app.crud.auth.auth import require_permission as require_permissions
from app.models.auth import User


router = APIRouter(prefix="/instanceproperties", tags=["DB: Core: Instance Properties"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

@router.get("/", response_model=list[InstancePropertiesRead])
async def read_instance_properties(session: AsyncSession = Depends(get_async_session),
                                    current_user: User = Depends(require_permissions("read_instance_properties")),
                                   instance_id: Optional[int] = None,
                                   value: Optional[str] = None,
                                   property_type_id: Optional[int] = None):
    return await db.get_instanceproperties(session, instance_id, value, property_type_id)


@router.get("/{instance_property_id}", response_model=InstancePropertiesRead)
async def read_instance_properties(instance_property_id: int,
        current_user: User = Depends(require_permissions("read_instance_properties")),
        session: AsyncSession = Depends(get_async_session)):
    obj = await db.get_instanceproperty(session, instance_property_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Instance property not found")
    return obj


@router.post("/", response_model=InstancePropertiesRead)
async def add_instanceproperty(data: InstancePropertiesCreate,
        current_user: User = Depends(require_permissions("create_instance_properties")),
        session: AsyncSession = Depends(get_async_session)):
    return await db.create_instanceproperty(session, data)


@router.delete("/{instance_property_id}", status_code=204)
async def delete_instance_property(instance_property_id: int,
        current_user: User = Depends(require_permissions("delete_instance_properties")),
        session: AsyncSession = Depends(get_async_session)):
    await db.delete_instanceproperty(session, instance_property_id)


@router.patch("/{instance_property_id}")
async def update_property_type(instance_property_id: int,
                    data: InstancePropertiesUpdate,
                    current_user: User = Depends(require_permissions("update_instance_properties")),
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
