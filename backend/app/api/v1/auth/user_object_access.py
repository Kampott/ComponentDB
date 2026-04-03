import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.query_builder import QueryBuilder
from app.core.search_config import SEARCH_CONFIG
from app.crud.auth.user_object_access import create_user_object_access, delete_user_object_access, get_user_object_access, update_user_object_access
from app.crud.auth.auth import require_permission as require_permissions
from app.db.database import get_async_session
from app.logging.deps import LoggerInterface, LogCallable
from app.models.auth import User, UserObjectAccess
from app.schemas.auth import UserObjectAccessCreate, UserObjectAccessOut, UserObjectAccessUpdate
from app.logging.deps import LoggerInterface, LogCallable
from typing import List

router = APIRouter(prefix="/user_object_access", tags=["DB: Auth: User Object Access"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

@router.post("/users/{root_id}/object/", response_model=UserObjectAccessOut)
async def user_object_access_create(
    data_in: UserObjectAccessCreate,
    current_user: User = Depends(require_permissions("create_user_object_access")),
    db: AsyncSession = Depends(get_async_session),
    log: LogCallable = Depends(LoggerInterface("user_access"))
):
    user_object_access = await create_user_object_access(db, data_in)
    if not user_object_access:
        raise HTTPException(status_code=400, detail="Could not add object access to user")
    
    await log(action="create_user_object_access", details={"user_id": str(data_in.user_id), "root_id": data_in.root_id})
    return user_object_access

@router.get("/", response_model=list[UserObjectAccessOut])
async def read_user_object_access(
    session: AsyncSession = Depends(get_async_session),
    # Фильтры
    user_id: Optional[uuid.UUID] = Query(None),
    user_id__in: Optional[List[uuid.UUID]] = Query(None),
    
    root_id: Optional[int] = Query(None),
    root_id__in: Optional[List[int]] = Query(None),
    root_id__gt: Optional[int] = Query(None),
    root_id__lt: Optional[int] = Query(None),
    root_id__gte: Optional[int] = Query(None),
    root_id__lte: Optional[int] = Query(None),
    
    can_read: Optional[bool] = Query(None),
    can_write: Optional[bool] = Query(None),
    
    limit: Optional[int] = Query(None, ge=1, le=1000),
    
    current_user: User = Depends(require_permissions("read_user_object_access")),
    log: LogCallable = Depends(LoggerInterface("user_access"))
):
    params = {
        "user_id": user_id,
        "user_id__in": user_id__in,
        "root_id": root_id,
        "root_id__in": root_id__in,
        "root_id__gt": root_id__gt,
        "root_id__lt": root_id__lt,
        "root_id__gte": root_id__gte,
        "root_id__lte": root_id__lte,
        "can_read": can_read,
        "can_write": can_write,
    }
    
    QueryBuilder.validate_params(UserObjectAccess, params, SEARCH_CONFIG[UserObjectAccess])
    filters = QueryBuilder.parse_query_params(params)
    
    query = select(UserObjectAccess)
    query = QueryBuilder.apply_filters(query, UserObjectAccess, filters)
    query = QueryBuilder.apply_sorting(query, UserObjectAccess, filters)
    query = QueryBuilder.apply_limit(query, limit)
    
    result = await session.execute(query)
    access_list = result.scalars().all()
    
    try:
        await log(action="read_user_object_access")
    except Exception:
        pass
    
    return access_list

@router.delete("/{root_id}/{user_id}", status_code=204)
async def _delete_user_object_access(
    root_id: int,
    user_id: uuid.UUID,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(require_permissions("delete_user_object_access")),
    log: LogCallable = Depends(LoggerInterface("user_access"))
):
    await delete_user_object_access(session, user_id, root_id)
    await log(action="delete_user_object_access", details={"user_id": str(user_id), "root_id": root_id})

@router.patch("/{root_id}/{user_id}", response_model=UserObjectAccessOut)
async def _update_user_object_access(
    root_id: int,
    user_id: uuid.UUID,
    data: UserObjectAccessUpdate,
    current_user: User = Depends(require_permissions("edit_user_object_access")),
    session: AsyncSession = Depends(get_async_session),
    log: LogCallable = Depends(LoggerInterface("user_access"))
):
    updated = await update_user_object_access(session, user_id, root_id, data)
    if not updated:
        raise HTTPException(status_code=404, detail="User Object M2M not found")
    
    details: dict[str, object] = {"user_id": str(user_id), "root_id": root_id}
    if data.can_read is not None:
        details["can_read"] = data.can_read
    if data.can_write is not None:
        details["can_write"] = data.can_write
    
    await log(action="update_user_object_access", details=details)
    return updated
