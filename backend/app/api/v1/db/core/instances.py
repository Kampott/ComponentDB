from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from sqlalchemy import select

from app.schemas.core import InstancesRead, InstancesCreate, InstancesUpdate, InstanceCreated
import app.crud.core.instances as db
from app.crud.core.instances import get_instance
from app.crud.auth.auth import require_instance_permission, get_instance_root_id
from app.db.database import get_async_session


from app.models.auth import User, Role, Permission, UserInstanceAccess, UserRole, RolePermission
from app.core.security import get_current_user

router = APIRouter(prefix="/instances", tags=["DB: Core: Instances"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


@router.get("/", response_model=list[InstancesRead])
async def read_instances(
        session: AsyncSession = Depends(get_async_session),
        name: Optional[str] = Query(None),
        object_id: Optional[int] = Query(None),
        root_id: Optional[int] = Query(None),
        parent_id: Optional[int] = Query(None),
        is_active: Optional[bool] = Query(None),
        current_user: User = Depends(get_current_user)
):
    # Получаем все доступные root_id для текущего юзера
    result = await session.execute(
        select(UserInstanceAccess.root_id)
        .where(UserInstanceAccess.user_id == current_user.id)
    )
    accessible_root_ids = [row[0] for row in result.all()]


    if root_id is not None and root_id not in accessible_root_ids:
        raise HTTPException(status_code=403, detail="No access to this root instance")


    instances = await db.get_instances(
        session,
        name=name,
        object_id=object_id,
        root_id=root_id or accessible_root_ids,
        parent_id=parent_id,
        is_active=is_active
    )
    return instances

@router.get("/{instance_id}", response_model=InstancesRead)
async def read_instance(
    instance_id: int,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(require_instance_permission(write=False))
):
    instance = await db.get_instance(session, instance_id)
    if not instance:
        raise HTTPException(status_code=404, detail="Instance not found")
    return instance



@router.post("/", response_model=InstanceCreated)
async def add_instances(
    data: InstancesCreate, 
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(require_instance_permission(write=True))):
    return await db.create_instance(session, data)


@router.delete("/{instance_id}", status_code=204)
async def delete_instances(
    instance_id: int, 
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(require_instance_permission(write=True))):
    await db.delete_instance(session, instance_id)


@router.patch("/{instance_id}", response_model=InstancesRead)
async def update_instance(
    instance_id: int,
    data: InstancesUpdate,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(require_instance_permission(write=True))
):
    updated_instance: InstancesRead | None = await db.update_instance(session, instance_id, data)
    if not updated_instance:
        raise HTTPException(
            status_code=404,
            detail="Экземпляр не найден"
        )
    return updated_instance

