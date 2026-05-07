from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import List, Optional
from datetime import datetime
import uuid

from app.core.security import get_current_user
from app.crud.auth.users import (
    get_user_by_email_crud,
    get_user_by_id,
    get_users,
    create_user,
    update_user,
    update_user_settings
)
from app.db.database import get_async_session
from app.schemas.auth import UserOut, UserCreate, UserUpdate
from app.crud.auth.auth import require_permission as require_permissions
from app.models.auth import User, Role
from app.logging.deps import LoggerInterface, LogCallable
from app.core.query_builder import QueryBuilder
from app.core.search_config import SEARCH_CONFIG

router = APIRouter(prefix="/users", tags=["DB: User Data Manipulation"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


@router.get("/", response_model=List[UserOut])
async def read_users(
    session: AsyncSession = Depends(get_async_session),
    email: Optional[str] = Query(None),
    email__like: Optional[str] = Query(None),
    email__sort: Optional[str] = Query(None, pattern="^(asc|desc)$"),
    is_active: Optional[bool] = Query(None),
    created_at__gte: Optional[datetime] = Query(None),
    created_at__lte: Optional[datetime] = Query(None),
    created_at__gt: Optional[datetime] = Query(None),
    created_at__lt: Optional[datetime] = Query(None),
    created_at__sort: Optional[str] = Query(None, pattern="^(asc|desc)$"),
    updated_at__gte: Optional[datetime] = Query(None),
    updated_at__lte: Optional[datetime] = Query(None),
    updated_at__gt: Optional[datetime] = Query(None),
    updated_at__lt: Optional[datetime] = Query(None),
    updated_at__sort: Optional[str] = Query(None, pattern="^(asc|desc)$"),
    id: Optional[uuid.UUID] = Query(None),
    id__in: Optional[List[uuid.UUID]] = Query(None),
    id__sort: Optional[str] = Query(None, pattern="^(asc|desc)$"),
    limit: Optional[int] = Query(None, ge=1, le=1000),
    offset: Optional[int] = Query(None, ge=0),
    current_user: User = Depends(require_permissions("read_users")),
    log: LogCallable = Depends(LoggerInterface("users"))
):
    params = {
        "email": email,
        "email__like": email__like,
        "email__sort": email__sort,
        "is_active": is_active,
        "created_at__gte": created_at__gte,
        "created_at__lte": created_at__lte,
        "created_at__gt": created_at__gt,
        "created_at__lt": created_at__lt,
        "created_at__sort": created_at__sort,
        "updated_at__gte": updated_at__gte,
        "updated_at__lte": updated_at__lte,
        "updated_at__gt": updated_at__gt,
        "updated_at__lt": updated_at__lt,
        "updated_at__sort": updated_at__sort,
        "id": id,
        "id__in": id__in,
        "id__sort": id__sort,
    }

    QueryBuilder.validate_params(User, params, SEARCH_CONFIG[User])
    filters = QueryBuilder.parse_query_params(params)

    query = select(User)
    query = QueryBuilder.apply_filters(query, User, filters)
    query = QueryBuilder.apply_sorting(query, User, filters)
    
    if offset is not None:
        query = query.offset(offset)
    query = QueryBuilder.apply_limit(query, limit)

    result = await session.execute(query)
    users = result.scalars().all()

    try:
        await log(action="read_users")
    except Exception:
        pass

    return users


@router.get("/me", response_model=UserOut)
async def read_users_me(
    current_user: User = Depends(get_current_user),
    log: LogCallable = Depends(LoggerInterface("users"))
):
    try:
        await log(action="read_user_me")
    except Exception:
        pass
    return current_user


@router.get("/{user_id}", response_model=UserOut)
async def read_user(
    user_id: uuid.UUID,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(require_permissions("read_users")),
    log: LogCallable = Depends(LoggerInterface("users"))
):
    usr = await get_user_by_id(session, user_id)
    if not usr:
        raise HTTPException(status_code=404, detail="User not found")
    
    await log(action="read_user", details={"queried_user_id": str(user_id)})
    return usr


@router.patch("/me/settings", response_model=UserOut)
async def update_own_settings(
    settings: dict,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user),
    log: LogCallable = Depends(LoggerInterface("users"))
):
    updated_user = await update_user_settings(session, current_user.id, settings)
    if not updated_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    try:
        await log(action="update_own_settings")
    except Exception:
        pass
    
    return updated_user


@router.patch("/{user_id}/settings", response_model=UserOut)
async def update_other_user_settings(
    user_id: uuid.UUID,
    settings: dict,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(require_permissions("edit_other_users_settings")),
    log: LogCallable = Depends(LoggerInterface("users"))
):
    # Use cached permissions from get_current_user()
    user_perms = current_user._permissions if hasattr(current_user, '_permissions') else set()
    has_super_permission = "SUPER_PERMISSION" in user_perms

    if str(user_id) == str(current_user.id):
        raise HTTPException(status_code=400, detail="Cannot use this endpoint for own settings")

    if not has_super_permission:
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    updated_user = await update_user_settings(session, user_id, settings)
    if not updated_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    try:
        await log(action="update_other_user_settings", details={"target_user_id": str(user_id)})
    except Exception:
        pass
    
    return updated_user


@router.patch("/{user_id}", response_model=UserOut)
async def update_user_endpoint(
    user_id: uuid.UUID,
    data: UserUpdate,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(require_permissions("edit_other_users_settings")),
    log: LogCallable = Depends(LoggerInterface("users"))
):
    # Use cached permissions from get_current_user()
    user_perms = current_user._permissions if hasattr(current_user, '_permissions') else set()
    has_super_permission = "SUPER_PERMISSION" in user_perms

    if not has_super_permission:
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    updated_user = await update_user(session, user_id, data)
    if not updated_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    try:
        await log(action="update_user", details={"target_user_id": str(user_id)})
    except Exception:
        pass
    
    return updated_user
