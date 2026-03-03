from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from sqlalchemy import select, or_
from sqlalchemy.sql import true, false
from sqlalchemy.orm import selectinload
import typing

from app.schemas.events import EventTypesRead, EventTypesCreate, EventTypesUpdate
import app.crud.events.event_types as db
from app.db.database import get_async_session



from app.crud.auth.auth import require_permission as require_permissions
from app.models.auth import User
from app.core.security import get_current_user

from app.logging.deps import LoggerInterface, LogCallable

router = APIRouter(prefix="/event_types", tags=["DB: Events: EventTypes"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")



@router.get("/", response_model=list[EventTypesRead])
async def read_event_types(
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(require_permissions("read_event_types")),
    name: Optional[str] = Query(None),
    log: LogCallable = Depends(LoggerInterface("event_types"))):
    event_types = await db.get_event_types(session, name)

    try:
        await log(action="read_event_types")
    except Exception:
        pass

    return event_types

@router.get("/{event_type_id}", response_model=EventTypesRead)
async def read_event_type(event_type_id: int,
                         current_user: User = Depends(require_permissions("read_event_types")),
                         session: AsyncSession = Depends(get_async_session),
    log: LogCallable = Depends(LoggerInterface("event_types"))):
    event_type_ = await db.get_event_type(session, event_type_id)
    if not event_type_:
        raise HTTPException(status_code=404, detail="Event types not found")
    await log(action="read_event_types", details={"event_type_id": event_type_id})
    return event_type_

@router.post("/", response_model=EventTypesRead)
async def add_event_types(data: EventTypesCreate,
                        current_user: User = Depends(require_permissions("create_event_types")),
                        session: AsyncSession = Depends(get_async_session),
    log: LogCallable = Depends(LoggerInterface("event_types"))):
    new_event_type = await db.create_event_type(session, data)
    
    await log(
        action="add_event_type",
        details={
            "event_type_id": new_event_type.id,
            "name": data.name
        }
    )
    return new_event_type


@router.delete("/{event_type_id}", status_code=204)
async def delete_event_types(event_type_id: int,
                        current_user: User = Depends(require_permissions("delete_event_types")),
                        session: AsyncSession = Depends(get_async_session),
    log: LogCallable = Depends(LoggerInterface("event_types")) ):
    await db.delete_event_type(session, event_type_id)
    await log(action="delete_event_type", details={"event_type_id": event_type_id}) 


@router.patch("/{event_type_id}")
async def update_event_types(event_type_id: int, data: EventTypesUpdate,
                        current_user: User = Depends(require_permissions("edit_event_types")),
                               session: AsyncSession = Depends(get_async_session),
    log: LogCallable = Depends(LoggerInterface("event_types"))) -> EventTypesRead:
    updated_event_type: EventTypesRead | None = await db.update_event_type(session, event_type_id, data)
    if not updated_event_type:
        raise HTTPException(
            status_code=404,
            detail="Event Type value not found"
        )
    details = {"event_type_id": event_type_id}
    if data.name is not None:
        details["name"] = data.name
    
    await log(action="update_event_type", details=details)
    return updated_event_type

@router.get("/for-instance/{instance_id}", response_model=list[EventTypesRead])
async def get_event_types_for_instance(
    instance_id: int,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user),
    log: LogCallable = Depends(LoggerInterface("event_types"))
):
    """
    Get valid event types for a specific instance.
    This endpoint bypasses type-level permissions - if you have access to the instance,
    you can see which event types are valid for it.
    """
    # Check user has READ access to the instance
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
        # Get instance with its hierarchy
        instance_result = await session.execute(
            select(Instances).where(Instances.id == instance_id)
        )
        instance = instance_result.scalar_one_or_none()
        
        if not instance:
            raise HTTPException(status_code=404, detail="Instance not found")

        # Get object and type roots
        object_result = await session.execute(
            select(Objects).where(Objects.id == instance.object_id)
        )
        obj = object_result.scalar_one_or_none()
        
        type_result = await session.execute(
            select(Types).where(Types.id == obj.type_id)
        )
        type_ = type_result.scalar_one_or_none()

        # Check READ access at any level
        has_access = False
        
        # Check instance access
        instance_access = await session.execute(
            select(UserInstanceAccess)
            .where(
                UserInstanceAccess.user_id == current_user.id,
                UserInstanceAccess.root_id == instance.root_id,
                UserInstanceAccess.can_read.is_(True)
            )
        )
        if instance_access.scalar_one_or_none():
            has_access = True
        
        # Check object access
        if not has_access:
            object_access = await session.execute(
                select(UserObjectAccess)
                .where(
                    UserObjectAccess.user_id == current_user.id,
                    UserObjectAccess.root_id == obj.root_id,
                    UserObjectAccess.can_read.is_(True)
                )
            )
            if object_access.scalar_one_or_none():
                has_access = True
        
        # Check type access
        if not has_access:
            type_access = await session.execute(
                select(UserTypeAccess)
                .where(
                    UserTypeAccess.user_id == current_user.id,
                    UserTypeAccess.root_id == type_.root_id,
                    UserTypeAccess.can_read.is_(True)
                )
            )
            if type_access.scalar_one_or_none():
                has_access = True
        
        if not has_access:
            raise HTTPException(status_code=403, detail="Access denied to this instance")
    
    # Get valid event types for this instance
    event_types = await db.get_valid_event_types_for_instance(session, instance_id)
    
    try:
        await log(
            action="get_event_types_for_instance",
            details={"instance_id": instance_id}
        )
    except Exception:
        pass
    
    return event_types
