from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from sqlalchemy import select, or_
from sqlalchemy.sql import false
from sqlalchemy.orm import selectinload

from app.schemas.events import EventsRead, EventsCreate, EventsUpdate
import app.crud.events.events as db
from app.db.database import get_async_session
from app.crud.auth.auth import require_permission as require_permissions
from app.models.auth import User, Role, Permission, UserInstanceAccess, UserObjectAccess, UserTypeAccess
from app.models.core import Instances, Objects, Types
from app.models.events import Events
from app.core.security import get_current_user
from app.logging.deps import LoggerInterface, LogCallable

from typing import List
from datetime import datetime
from app.core.query_builder import QueryBuilder
from app.core.search_config import SEARCH_CONFIG

router = APIRouter(prefix="/events", tags=["DB: Events: Events"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


@router.get("/", response_model=list[EventsRead])
async def read_events(
    session: AsyncSession = Depends(get_async_session),
    # Фильтры
    event_type_id: Optional[int] = Query(None),
    event_type_id__in: Optional[List[int]] = Query(None),
    
    instance_id: Optional[int] = Query(None),
    instance_id__in: Optional[List[int]] = Query(None),
    
    timestamp: Optional[datetime] = Query(None),
    timestamp__gte: Optional[datetime] = Query(None),
    timestamp__lte: Optional[datetime] = Query(None),
    timestamp__gt: Optional[datetime] = Query(None),
    timestamp__lt: Optional[datetime] = Query(None),
    timestamp__sort: Optional[str] = Query(None, regex="^(asc|desc)$"),
    
    id: Optional[int] = Query(None),
    id__in: Optional[List[int]] = Query(None),
    id__gte: Optional[int] = Query(None),
    id__lte: Optional[int] = Query(None),
    id__sort: Optional[str] = Query(None, regex="^(asc|desc)$"),
    
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permissions("read_events")),
    log: LogCallable = Depends(LoggerInterface("events"))
):
    params = {
        "event_type_id": event_type_id,
        "event_type_id__in": event_type_id__in,
        "instance_id": instance_id,
        "instance_id__in": instance_id__in,
        "timestamp": timestamp,
        "timestamp__gte": timestamp__gte,
        "timestamp__lte": timestamp__lte,
        "timestamp__gt": timestamp__gt,
        "timestamp__lt": timestamp__lt,
        "timestamp__sort": timestamp__sort,
        "id": id,
        "id__in": id__in,
        "id__gte": id__gte,
        "id__lte": id__lte,
        "id__sort": id__sort,
    }
    
    QueryBuilder.validate_params(Events, params, SEARCH_CONFIG[Events])
    filters = QueryBuilder.parse_query_params(params)
    
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

    # Build the query with joins for access control
    query = select(Events).join(Instances, Events.instance_id == Instances.id)
    
    if not has_super_permission:
        query = query.join(Objects, Instances.object_id == Objects.id)
        query = query.join(Types, Objects.type_id == Types.id)
    
    # Apply filters through QueryBuilder
    query = QueryBuilder.apply_filters(query, Events, filters)
    
    # Apply access control
    if not has_super_permission:
        # Fetch allowed root_ids for each level
        result_instance = await session.execute(
            select(UserInstanceAccess.root_id)
            .where(
                UserInstanceAccess.user_id == current_user.id,
                UserInstanceAccess.can_read.is_(True)
            )
        )
        allowed_instance_roots = [row[0] for row in result_instance.all()]

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
        
        query = query.where(
            or_(
                Instances.root_id.in_(allowed_instance_roots) if allowed_instance_roots else false(),
                Objects.root_id.in_(allowed_object_roots) if allowed_object_roots else false(),
                Types.root_id.in_(allowed_type_roots) if allowed_type_roots else false()
            )
        )
    
    # Apply sorting (default to timestamp desc if no sort specified)
    if not any("sort" in ops for ops in filters.values()):
        query = query.order_by(Events.timestamp.desc())
    else:
        query = QueryBuilder.apply_sorting(query, Events, filters)
    
    result = await session.execute(query)
    events = result.scalars().all()

    try:
        await log(action="read_events")
    except Exception:
        pass

    return events


@router.post("/", response_model=EventsRead)
async def create_event(
    data: EventsCreate,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permissions("create_events")),
    log: LogCallable = Depends(LoggerInterface("events"))
):
    # Check user has WRITE access to the instance
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
            select(Instances).where(Instances.id == data.instance_id)
        )
        instance = instance_result.scalar_one_or_none()
        
        if not instance:
            raise HTTPException(status_code=404, detail="Instance not found")

        # Get object and type roots
        object_result = await session.execute(
            select(Objects).where(Objects.id == instance.object_id)
        )
        obj = object_result.scalar_one_or_none()
        if obj is None:
            raise HTTPException(status_code=404, detail="Object not found")
        
        type_result = await session.execute(
            select(Types).where(Types.id == obj.type_id)
        )
        type_ = type_result.scalar_one_or_none()
        if type_ is None:
            raise HTTPException(status_code=404, detail="Type not found")

        # Check WRITE access at any level
        has_write_access = False
        
        # Check instance write access
        instance_access = await session.execute(
            select(UserInstanceAccess)
            .where(
                UserInstanceAccess.user_id == current_user.id,
                UserInstanceAccess.root_id == instance.root_id,
                UserInstanceAccess.can_write.is_(True)
            )
        )
        if instance_access.scalar_one_or_none():
            has_write_access = True
        
        # Check object write access
        if not has_write_access:
            object_access = await session.execute(
                select(UserObjectAccess)
                .where(
                    UserObjectAccess.user_id == current_user.id,
                    UserObjectAccess.root_id == obj.root_id,
                    UserObjectAccess.can_write.is_(True)
                )
            )
            if object_access.scalar_one_or_none():
                has_write_access = True
        
        # Check type write access
        if not has_write_access:
            type_access = await session.execute(
                select(UserTypeAccess)
                .where(
                    UserTypeAccess.user_id == current_user.id,
                    UserTypeAccess.root_id == type_.root_id,
                    UserTypeAccess.can_write.is_(True)
                )
            )
            if type_access.scalar_one_or_none():
                has_write_access = True
        
        if not has_write_access:
            raise HTTPException(status_code=403, detail="Write access denied to this instance")

    new_event = await db.create_event(session, data)

    await log(
        action="create_event",
        details={
            "event_id": new_event.id,
            "event_type_id": data.event_type_id,
            "instance_id": data.instance_id
        }
    )
    return new_event


@router.delete("/{event_id}", status_code=204)
async def delete_event(
    event_id: int,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permissions("delete_events")),
    log: LogCallable = Depends(LoggerInterface("events"))
):
    # Get the event first to check access
    event = await db.get_event(session, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    # Check user has WRITE access to the instance (same logic as create)
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
        instance_result = await session.execute(
            select(Instances).where(Instances.id == event.instance_id)
        )
        instance = instance_result.scalar_one_or_none()
        if instance is None:
            raise HTTPException(status_code=404, detail="Instance not found")

        object_result = await session.execute(
            select(Objects).where(Objects.id == instance.object_id)
        )
        obj = object_result.scalar_one_or_none()
        if obj is None:
            raise HTTPException(status_code=404, detail="Object not found")

        type_result = await session.execute(
            select(Types).where(Types.id == obj.type_id)
        )
        type_ = type_result.scalar_one_or_none()
        if type_ is None:
            raise HTTPException(status_code=404, detail="Type not found")

        has_write_access = False
        
        instance_access = await session.execute(
            select(UserInstanceAccess)
            .where(
                UserInstanceAccess.user_id == current_user.id,
                UserInstanceAccess.root_id == instance.root_id,
                UserInstanceAccess.can_write.is_(True)
            )
        )
        if instance_access.scalar_one_or_none():
            has_write_access = True

        if not has_write_access:
            object_access = await session.execute(
                select(UserObjectAccess)
                .where(
                    UserObjectAccess.user_id == current_user.id,
                    UserObjectAccess.root_id == obj.root_id,
                    UserObjectAccess.can_write.is_(True)
                )
            )
            if object_access.scalar_one_or_none():
                has_write_access = True

        if not has_write_access:
            type_access = await session.execute(
                select(UserTypeAccess)
                .where(
                    UserTypeAccess.user_id == current_user.id,
                    UserTypeAccess.root_id == type_.root_id,
                    UserTypeAccess.can_write.is_(True)
                )
            )
            if type_access.scalar_one_or_none():
                has_write_access = True

        if not has_write_access:
            raise HTTPException(status_code=403, detail="Write access denied to this instance")

    await db.delete_event(session, event_id)
    await log(action="delete_event", details={"event_id": event_id})


@router.patch("/{event_id}", response_model=EventsRead)
async def update_event(
    event_id: int,
    data: EventsUpdate,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permissions("edit_events")),
    log: LogCallable = Depends(LoggerInterface("events"))
):
    # Get the event first
    event = await db.get_event(session, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    # Check WRITE access (same as delete)
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
        instance_result = await session.execute(
            select(Instances).where(Instances.id == event.instance_id)
        )
        instance = instance_result.scalar_one_or_none()
        if instance is None:
            raise HTTPException(status_code=404, detail="Instance not found")

        object_result = await session.execute(
            select(Objects).where(Objects.id == instance.object_id)
        )
        obj = object_result.scalar_one_or_none()
        if obj is None:
            raise HTTPException(status_code=404, detail="Object not found")

        type_result = await session.execute(
            select(Types).where(Types.id == obj.type_id)
        )
        type_ = type_result.scalar_one_or_none()
        if type_ is None:
            raise HTTPException(status_code=404, detail="Type not found")

        has_write_access = False

        instance_access = await session.execute(
            select(UserInstanceAccess)
            .where(
                UserInstanceAccess.user_id == current_user.id,
                UserInstanceAccess.root_id == instance.root_id,
                UserInstanceAccess.can_write.is_(True)
            )
        )
        if instance_access.scalar_one_or_none():
            has_write_access = True

        if not has_write_access:
            object_access = await session.execute(
                select(UserObjectAccess)
                .where(
                    UserObjectAccess.user_id == current_user.id,
                    UserObjectAccess.root_id == obj.root_id,
                    UserObjectAccess.can_write.is_(True)
                )
            )
            if object_access.scalar_one_or_none():
                has_write_access = True

        if not has_write_access:
            type_access = await session.execute(
                select(UserTypeAccess)
                .where(
                    UserTypeAccess.user_id == current_user.id,
                    UserTypeAccess.root_id == type_.root_id,
                    UserTypeAccess.can_write.is_(True)
                )
            )
            if type_access.scalar_one_or_none():
                has_write_access = True

        if not has_write_access:
            raise HTTPException(status_code=403, detail="Write access denied to this instance")

    updated_event = await db.update_event(session, event_id, data)
    if not updated_event:
        raise HTTPException(status_code=404, detail="Event not found")

    details = {"event_id": event_id}
    if data.event_type_id is not None:
        details["event_type_id"] = data.event_type_id
    if data.instance_id is not None:
        details["instance_id"] = data.instance_id

    await log(action="update_event", details=details)
    return updated_event
