from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from sqlalchemy import select, or_
from sqlalchemy.sql import true, false
from sqlalchemy.orm import selectinload

from app.schemas.core import ObjectsRead, ObjectsCreate, ObjectsUpdate, InstancesRead
import app.crud.core.objects as db_objects
import app.crud.core.instances as db_instances
from app.db.database import get_async_session
from app.crud.auth.auth import require_permission as require_permissions
from app.models.auth import User

from app.crud.auth.auth import require_object_permission, get_object_root_id, _check_object_permission, _check_permission
from app.models.auth import User, Role, Permission, UserObjectAccess, UserTypeAccess, UserRole, RolePermission
from app.core.security import get_current_user
from app.models.core import Objects, Types

router = APIRouter(prefix="/objects", tags=["DB: Core: Objects"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


@router.get("/", response_model=list[ObjectsRead])
async def read_objects(
    session: AsyncSession = Depends(get_async_session),
    name: Optional[str] = Query(None),
    type_id: Optional[int] = Query(None),
    parent_id: Optional[int] = Query(None),
    root_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user)
):
    # Fetch user permissions
    result_user = await session.execute(
        select(User)
        .where(User.id == current_user.id)
        .options(selectinload(User.roles).selectinload(Role.permissions))
    )
    user = result_user.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    user_perms = {perm.name for role in user.roles for perm in role.permissions}
    has_super_permission = "SUPER_PERMISSION" in user_perms

    if not has_super_permission:
        # Fetch allowed root_ids for each level with can_read=True
        result_object = await session.execute(
            select(UserObjectAccess.root_id)
            .where(
                UserObjectAccess.user_id == current_user.id,
                UserObjectAccess.can_read.is_(True)
            )
        )
        allowed_object_roots = [row[0] for row in result_object.all()]

        result_type = await session.execute(
            select(UserTypeAccess.root_id)
            .where(
                UserTypeAccess.user_id == current_user.id,
                UserTypeAccess.can_read.is_(True)
            )
        )
        allowed_type_roots = [row[0] for row in result_type.all()]

    # Build the query
    query = select(Objects)

    if name:
        query = query.where(Objects.name.ilike(f"%{name}%"))
    if type_id:
        query = query.where(Objects.type_id == type_id)
    if root_id:
        query = query.where(Objects.root_id == root_id)
    if parent_id:
        query = query.where(Objects.parent_id == parent_id)

    if not has_super_permission:
        query = query.join(Types, Objects.type_id == Types.id)
        query = query.where(
            or_(
                Objects.root_id.in_(allowed_object_roots) if allowed_object_roots else false(),
                Types.root_id.in_(allowed_type_roots) if allowed_type_roots else false()
            )
        )

    result = await session.execute(query)
    objects = result.scalars().all()
    return objects

@router.get("/{object_id}", response_model=ObjectsRead)
async def read_object(
    object_id: int,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(require_object_permission(write=False))
):
    obj = await db_objects.get_object(session, object_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Object not found")
    return obj


@router.post("/", response_model=ObjectsCreate)
async def add_object(
    data: ObjectsCreate,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)
):
    if data.parent_id is None:
        await _check_permission(current_user, session, "create_new_object")
    else:
        await _check_object_permission(session, current_user, data.parent_id, write=True)

    return await db_objects.create_object(session, data)


@router.delete("/{object_id}", status_code=204)
async def delete_objects(
    object_id: int,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(require_object_permission(write=True))
):
    await db_objects.delete_object(session, object_id)


@router.post("/{object_id}/instance")
async def create_instance_from_root_object(
    object_id: int,     
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(require_object_permission(write=True))
) -> InstancesRead: 
    root_instance: InstancesRead | None = await db_instances.create_instance_from_object_tree(session, 
    object_id)
    if root_instance is None:
        raise HTTPException(status_code=422, detail="Something went wrong")
    return root_instance


@router.patch("/{object_id}")
async def update_object(
    object_id: int,
    data: ObjectsUpdate,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(require_object_permission(write=True))
) -> ObjectsRead | None:
    updated_object: ObjectsRead | None = await db_objects.update_object(session, object_id, data)
    if not updated_object:
        raise HTTPException(
            status_code=404,
            detail="Объект не найден"
        )
    return updated_object