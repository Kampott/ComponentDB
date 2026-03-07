from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from sqlalchemy import select, or_
from sqlalchemy.sql import true, false
from sqlalchemy.orm import selectinload
import typing


from app.schemas.events import EventTypesTypesRead, EventTypesTypesCreate
import app.crud.events.event_types_types as db
from app.db.database import get_async_session

from app.crud.auth.auth import require_permission as require_permissions

from app.crud.auth.auth import _check_permission,require_type_permission, get_type_root_id, _check_type_permission
from app.models.auth import User, Role, Permission, UserTypeAccess, UserRole, RolePermission
from app.core.security import get_current_user
from app.models.core import Types
from app.models.events import EventTypesTypes

from app.logging.deps import LoggerInterface, LogCallable

router = APIRouter(prefix="/event_types_types", tags=["DB: Events: EventTypesTypes"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


@router.get("/", response_model=list[EventTypesTypesRead])
async def read_event_types_types(
    session: AsyncSession = Depends(get_async_session),
    event_type_id: Optional[int] = Query(None),
    type_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permissions("read_event_types_types")),
    log: LogCallable = Depends(LoggerInterface("event_types_types"))
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
        result_type = await session.execute(
            select(UserTypeAccess.root_id)
            .where(
                UserTypeAccess.user_id == current_user.id,
                UserTypeAccess.can_read.is_(True)
            )
        )
        allowed_type_roots = [row[0] for row in result_type.all()]

    query = select(EventTypesTypes).join(
        Types, EventTypesTypes.type_id == Types.id
    )

    if event_type_id:
        query = query.where(EventTypesTypes.event_type_id == event_type_id)
    if type_id:
        query = query.where(EventTypesTypes.type_id == type_id)

    if not has_super_permission:
        query = query.where(
            Types.root_id.in_(allowed_type_roots) if allowed_type_roots else false()
        )

    result = await session.execute(query)
    event_types_types = result.scalars().all()

    try:
        await log(action="read_event_types_types")
    except Exception:
        pass
    
    return event_types_types


@router.get("/{event_type_id}/{type_id}", response_model=EventTypesTypesRead)
async def read_event_types_type(
    event_type_id: int,
    type_id: int,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permissions("read_event_types_types")),
    log: LogCallable = Depends(LoggerInterface("event_types_types"))
):
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
        type_result = await session.execute(
            select(Types.root_id).where(Types.id == type_id)
        )
        type_root = type_result.scalar_one_or_none()
        
        if type_root is None:
            raise HTTPException(status_code=404, detail="Type not found")
        
        access_result = await session.execute(
            select(UserTypeAccess)
            .where(
                UserTypeAccess.user_id == current_user.id,
                UserTypeAccess.root_id == type_root,
                UserTypeAccess.can_read.is_(True)
            )
        )
        
        if not access_result.scalar_one_or_none():
            raise HTTPException(status_code=403, detail="Access denied to this type")
    
    event_types_type = await db.get_event_types_type(session, event_type_id, type_id)
    if not event_types_type:
        raise HTTPException(status_code=404, detail="Event type-type relationship not found")
    
    await log(
        action="read_event_types_type",
        details={"event_type_id": event_type_id, "type_id": type_id}
    )
    return event_types_type


@router.post("/", response_model=EventTypesTypesRead)
async def create_event_types_type(
    data: EventTypesTypesCreate,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permissions("create_event_types_types")),
    log: LogCallable = Depends(LoggerInterface("event_types_types"))
):
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
        type_result = await session.execute(
            select(Types.root_id).where(Types.id == data.type_id)
        )
        type_root = type_result.scalar_one_or_none()
        
        if type_root is None:
            raise HTTPException(status_code=404, detail="Type not found")
        
        access_result = await session.execute(
            select(UserTypeAccess)
            .where(
                UserTypeAccess.user_id == current_user.id,
                UserTypeAccess.root_id == type_root,
                UserTypeAccess.can_write.is_(True)
            )
        )
        
        if not access_result.scalar_one_or_none():
            raise HTTPException(status_code=403, detail="Write access denied to this type")
    
    new_link = await db.create_event_types_type(session, data)
    
    await log(
        action="create_event_types_type",
        details={"event_type_id": data.event_type_id, "type_id": data.type_id}
    )
    return new_link



@router.delete("/{event_type_id}/{type_id}", status_code=204)
async def delete_event_types_type(
    event_type_id: int,
    type_id: int,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permissions("delete_event_types_types")),
    log: LogCallable = Depends(LoggerInterface("event_types_types"))
):
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
        type_result = await session.execute(
            select(Types.root_id).where(Types.id == type_id)
        )
        type_root = type_result.scalar_one_or_none()
        
        if type_root is None:
            raise HTTPException(status_code=404, detail="Type not found")
        
        access_result = await session.execute(
            select(UserTypeAccess)
            .where(
                UserTypeAccess.user_id == current_user.id,
                UserTypeAccess.root_id == type_root,
                UserTypeAccess.can_write.is_(True)
            )
        )
        
        if not access_result.scalar_one_or_none():
            raise HTTPException(status_code=403, detail="Write access denied to this type")
    
    await db.delete_event_types_type(session, event_type_id, type_id)
    
    await log(
        action="delete_event_types_type",
        details={"event_type_id": event_type_id, "type_id": type_id}
    )
