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


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _load_user_with_permissions(session: AsyncSession, user: User) -> User:
    """Use cached permissions from get_current_user(). Raises 401 if not found."""
    if not hasattr(user, '_permissions') or user._permissions is None:
        raise HTTPException(status_code=401, detail="User permissions not loaded")
    return user


async def _require_write_access_to_instance(
    session: AsyncSession,
    user_id: int,
    instance_id: int,
) -> None:
    """
    Checks write access at instance → object → type level using a single JOIN query.
    Raises 403 if access is denied, 404 if the instance/object/type chain is broken.
    """
    # Single query: fetch instance + object + type roots in one shot
    row = (await session.execute(
        select(
            Instances.root_id.label("instance_root_id"),
            Objects.root_id.label("object_root_id"),
            Types.root_id.label("type_root_id"),
        )
        .join(Objects, Instances.object_id == Objects.id)
        .join(Types, Objects.type_id == Types.id)
        .where(Instances.id == instance_id)
    )).one_or_none()

    if row is None:
        raise HTTPException(status_code=404, detail="Instance (or its object/type) not found")

    instance_root_id, object_root_id, type_root_id = row

    # Single query: check all three access levels at once
    access_row = (await session.execute(
        select(
            select(UserInstanceAccess.root_id)
            .where(
                UserInstanceAccess.user_id == user_id,
                UserInstanceAccess.root_id == instance_root_id,
                UserInstanceAccess.can_write.is_(True),
            )
            .exists()
            .label("instance_ok"),

            select(UserObjectAccess.root_id)
            .where(
                UserObjectAccess.user_id == user_id,
                UserObjectAccess.root_id == object_root_id,
                UserObjectAccess.can_write.is_(True),
            )
            .exists()
            .label("object_ok"),

            select(UserTypeAccess.root_id)
            .where(
                UserTypeAccess.user_id == user_id,
                UserTypeAccess.root_id == type_root_id,
                UserTypeAccess.can_write.is_(True),
            )
            .exists()
            .label("type_ok"),
        )
    )).one()

    if not any(access_row):
        raise HTTPException(status_code=403, detail="Write access denied to this instance")


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get("/", response_model=list[EventsRead])
async def read_events(
    session: AsyncSession = Depends(get_async_session),
    # Filters
    event_type_id: Optional[int] = Query(None),
    event_type_id__in: Optional[List[int]] = Query(None),
    event_type_id__gt: Optional[int] = Query(None),
    event_type_id__lt: Optional[int] = Query(None),
    event_type_id__gte: Optional[int] = Query(None),
    event_type_id__lte: Optional[int] = Query(None),
    instance_id: Optional[int] = Query(None),
    instance_id__in: Optional[List[int]] = Query(None),
    instance_id__gt: Optional[int] = Query(None),
    instance_id__lt: Optional[int] = Query(None),
    instance_id__gte: Optional[int] = Query(None),
    instance_id__lte: Optional[int] = Query(None),
    timestamp: Optional[datetime] = Query(None),
    timestamp__gte: Optional[datetime] = Query(None),
    timestamp__lte: Optional[datetime] = Query(None),
    timestamp__gt: Optional[datetime] = Query(None),
    timestamp__lt: Optional[datetime] = Query(None),
    timestamp__sort: Optional[str] = Query(None, pattern="^(asc|desc)$"),
    info: Optional[str] = Query(None),
    info__like: Optional[str] = Query(None),
    id: Optional[int] = Query(None),
    id__in: Optional[List[int]] = Query(None),
    id__gt: Optional[int] = Query(None),
    id__lt: Optional[int] = Query(None),
    id__gte: Optional[int] = Query(None),
    id__lte: Optional[int] = Query(None),
    id__sort: Optional[str] = Query(None, pattern="^(asc|desc)$"),
    limit: Optional[int] = Query(None, ge=1, le=1000),
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permissions("read_events")),
    log: LogCallable = Depends(LoggerInterface("events"))
):
    params = {
        "event_type_id": event_type_id,
        "event_type_id__in": event_type_id__in,
        "event_type_id__gt": event_type_id__gt,
        "event_type_id__lt": event_type_id__lt,
        "event_type_id__gte": event_type_id__gte,
        "event_type_id__lte": event_type_id__lte,
        "instance_id": instance_id,
        "instance_id__in": instance_id__in,
        "instance_id__gt": instance_id__gt,
        "instance_id__lt": instance_id__lt,
        "instance_id__gte": instance_id__gte,
        "instance_id__lte": instance_id__lte,
        "timestamp": timestamp,
        "timestamp__gte": timestamp__gte,
        "timestamp__lte": timestamp__lte,
        "timestamp__gt": timestamp__gt,
        "timestamp__lt": timestamp__lt,
        "timestamp__sort": timestamp__sort,
        "info": info,
        "info__like": info__like,
        "id": id,
        "id__in": id__in,
        "id__gt": id__gt,
        "id__lt": id__lt,
        "id__gte": id__gte,
        "id__lte": id__lte,
        "id__sort": id__sort,
    }

    QueryBuilder.validate_params(Events, params, SEARCH_CONFIG[Events])
    filters = QueryBuilder.parse_query_params(params)

    await _load_user_with_permissions(session, current_user)
    user_perms = current_user._permissions
    has_super_permission = "SUPER_PERMISSION" in user_perms

    query = select(Events).join(Instances, Events.instance_id == Instances.id)

    if not has_super_permission:
        query = query.join(Objects, Instances.object_id == Objects.id)
        query = query.join(Types, Objects.type_id == Types.id)

    query = QueryBuilder.apply_filters(query, Events, filters)

    if not has_super_permission:
        from sqlalchemy import union_all
        result_access = await session.execute(
            union_all(
                select(UserInstanceAccess.root_id.label("root_id"))
                .where(
                    UserInstanceAccess.user_id == current_user.id,
                    UserInstanceAccess.can_read.is_(True)
                ),
                select(UserObjectAccess.root_id.label("root_id"))
                .where(
                    UserObjectAccess.user_id == current_user.id,
                    UserObjectAccess.can_read.is_(True)
                ),
                select(UserTypeAccess.root_id.label("root_id"))
                .where(
                    UserTypeAccess.user_id == current_user.id,
                    UserTypeAccess.can_read.is_(True)
                )
            )
        )
        allowed_roots = [row[0] for row in result_access.all()]

        if not allowed_roots:
            return []

        query = query.where(
            or_(
                Instances.root_id.in_(allowed_roots),
                Objects.root_id.in_(allowed_roots),
                Types.root_id.in_(allowed_roots),
            )
        )

    if not any("sort" in ops for ops in filters.values()):
        query = query.order_by(Events.timestamp.desc())
    else:
        query = QueryBuilder.apply_sorting(query, Events, filters)

    query = QueryBuilder.apply_limit(query, limit)

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
    await _load_user_with_permissions(session, current_user)
    user_perms = current_user._permissions

    if "SUPER_PERMISSION" not in user_perms:
        await _require_write_access_to_instance(session, current_user.id, data.instance_id)

    new_event = await db.create_event(session, data)

    await log(
        action="create_event",
        details={
            "event_id": new_event.id,
            "event_type_id": data.event_type_id,
            "instance_id": data.instance_id,
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
    event = await db.get_event(session, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    user = await _load_user_with_permissions(session, current_user)
    user_perms = current_user._permissions

    if "SUPER_PERMISSION" not in user_perms:
        await _require_write_access_to_instance(session, current_user.id, event.instance_id)

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
    event = await db.get_event(session, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    user = await _load_user_with_permissions(session, current_user)
    user_perms = current_user._permissions

    if "SUPER_PERMISSION" not in user_perms:
        await _require_write_access_to_instance(session, current_user.id, event.instance_id)

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