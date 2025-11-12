from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.schemas.core import InstancesRead, InstancesCreate, InstancesUpdate, InstanceCreated
import app.crud.core.instances as db
from app.crud.core.instances import get_instance
from app.crud.auth.auth import require_instance_permission, get_instance_root_id, _check_instance_permission
from app.db.database import get_async_session

from app.models.core import Instances

from app.crud.auth.auth import require_permission as require_permissions
from app.crud.auth.auth import _check_permission, require_instance_permission
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

    result = await session.execute(
        select(UserInstanceAccess.root_id)
        .where(UserInstanceAccess.user_id == current_user.id)
    )
    accessible_root_ids = [row[0] for row in result.all()]


    result_user = await session.execute(
        select(User)
        .where(User.id == current_user.id)
        .options(selectinload(User.roles).selectinload(Role.permissions))
    )
    user = result_user.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    user_perms = {perm.name for role in user.roles for perm in role.permissions}


    if root_id is not None and root_id not in accessible_root_ids and "SUPER_PERMISSION" not in user_perms:
        raise HTTPException(status_code=403, detail="No access to this root instance")


    if "SUPER_PERMISSION" in user_perms:
        # Берём все root_id
        result = await session.execute(select(Instances.root_id).distinct())
        allowed_root_ids = [row[0] for row in result.all()]
    else:
        allowed_root_ids = accessible_root_ids

    instances = await db.get_instances(
        session,
        name=name,
        object_id=object_id,
        root_id=root_id or allowed_root_ids,
        parent_id=parent_id,
        is_active=is_active
    )

    instances = await db.get_instances(
        session,
        name=name,
        object_id=object_id,
        root_id=root_id or allowed_root_ids,
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
async def add_instance(
    data: InstancesCreate,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)
):
    if data.parent_id is None:
        await _check_permission(current_user, session, "create_new_instance")
    else:
        await _check_instance_permission(session, current_user, data.parent_id, write=True)

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

