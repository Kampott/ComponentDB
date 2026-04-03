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

from typing import List
from datetime import datetime
from app.core.query_builder import QueryBuilder
from app.core.search_config import SEARCH_CONFIG

router = APIRouter(prefix="/event_types_types", tags=["DB: Events: EventTypesTypes"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


@router.get("/", response_model=list[EventTypesTypesRead])
async def read_event_types_types(
    session: AsyncSession = Depends(get_async_session),
    # Фильтры
    event_type_id: Optional[int] = Query(None),
    event_type_id__in: Optional[List[int]] = Query(None),
    event_type_id__gt: Optional[int] = Query(None),
    event_type_id__lt: Optional[int] = Query(None),
    event_type_id__gte: Optional[int] = Query(None),
    event_type_id__lte: Optional[int] = Query(None),
    
    type_id: Optional[int] = Query(None),
    type_id__in: Optional[List[int]] = Query(None),
    type_id__gt: Optional[int] = Query(None),
    type_id__lt: Optional[int] = Query(None),
    type_id__gte: Optional[int] = Query(None),
    type_id__lte: Optional[int] = Query(None),
    
    limit: Optional[int] = Query(None, ge=1, le=1000),
    
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permissions("read_event_types_types")),
    log: LogCallable = Depends(LoggerInterface("event_types_types"))
):
    params = {
        "event_type_id": event_type_id,
        "event_type_id__in": event_type_id__in,
        "event_type_id__gt": event_type_id__gt,
        "event_type_id__lt": event_type_id__lt,
        "event_type_id__gte": event_type_id__gte,
        "event_type_id__lte": event_type_id__lte,
        "type_id": type_id,
        "type_id__in": type_id__in,
        "type_id__gt": type_id__gt,
        "type_id__lt": type_id__lt,
        "type_id__gte": type_id__gte,
        "type_id__lte": type_id__lte,
    }
    
    QueryBuilder.validate_params(EventTypesTypes, params, SEARCH_CONFIG[EventTypesTypes])
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

    # Build query with JOIN to Types for access control
    query = select(EventTypesTypes).join(
        Types, EventTypesTypes.type_id == Types.id
    )
    
    query = QueryBuilder.apply_filters(query, EventTypesTypes, filters)
    query = QueryBuilder.apply_sorting(query, EventTypesTypes, filters)

    # Apply access control
    if not has_super_permission:
        result_type = await session.execute(
            select(UserTypeAccess.root_id)
            .where(
                UserTypeAccess.user_id == current_user.id,
                UserTypeAccess.can_read.is_(True)
            )
        )
        allowed_type_roots = [row[0] for row in result_type.all()]
        
        query = query.where(
            Types.root_id.in_(allowed_type_roots) if allowed_type_roots else false()
        )

    query = QueryBuilder.apply_limit(query, limit)

    result = await session.execute(query)
    event_types_types = result.scalars().all()

    try:
        await log(action="read_event_types_types")
    except Exception:
        pass
    
    return event_types_types


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
