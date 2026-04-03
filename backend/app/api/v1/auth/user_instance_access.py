import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.query_builder import QueryBuilder
from app.core.search_config import SEARCH_CONFIG
from app.crud.auth.user_instance_access import create_user_instance_access, delete_user_instance_access, get_user_instance_access, update_user_instance_access
from app.crud.auth.auth import require_permission as require_permissions
from app.db.database import get_async_session
from app.logging.deps import LoggerInterface, LogCallable
from app.models.auth import User, UserInstanceAccess
from app.schemas.auth import UserInstanceAccessCreate, UserInstanceAccessOut, UserInstanceAccessUpdate
from app.logging.deps import LoggerInterface, LogCallable
from typing import List

router = APIRouter(prefix="/user_instance_access", tags=["DB: Auth: User Instance Access"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

@router.post("/users/{root_id}/instance/", response_model=UserInstanceAccessOut)
async def user_instance_access_create(
    data_in: UserInstanceAccessCreate,
    current_user: User = Depends(require_permissions("create_user_instance_access")),
    db: AsyncSession = Depends(get_async_session),
    log: LogCallable = Depends(LoggerInterface("user_access"))
):
    user_instance_access = await create_user_instance_access(db, data_in)
    if not user_instance_access:
        raise HTTPException(status_code=400, detail="Could not add instance access to user")
    
    await log(action="create_user_instance_access", details={"user_id": str(data_in.user_id), "root_id": data_in.root_id})
    return user_instance_access

@router.get("/", response_model=list[UserInstanceAccessOut])
async def read_user_instance_access(
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
    
    current_user: User = Depends(require_permissions("read_user_instance_access")),
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
    
    QueryBuilder.validate_params(UserInstanceAccess, params, SEARCH_CONFIG[UserInstanceAccess])
    filters = QueryBuilder.parse_query_params(params)
    
    query = select(UserInstanceAccess)
    query = QueryBuilder.apply_filters(query, UserInstanceAccess, filters)
    query = QueryBuilder.apply_sorting(query, UserInstanceAccess, filters)
    query = QueryBuilder.apply_limit(query, limit)
    
    result = await session.execute(query)
    access_list = result.scalars().all()
    
    try:
        await log(action="read_user_instance_access")
    except Exception:
        pass
    
    return access_list

@router.delete("/{root_id}/{user_id}", status_code=204)
async def _delete_user_instance_access(
    root_id: int,
    user_id: uuid.UUID,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(require_permissions("delete_user_instance_access")),
    log: LogCallable = Depends(LoggerInterface("user_access"))
):
    await delete_user_instance_access(session, user_id, root_id)
    await log(action="delete_user_instance_access", details={"user_id": str(user_id), "root_id": root_id})

@router.patch("/{root_id}/{user_id}", response_model=UserInstanceAccessOut)
async def _update_user_instance_access(
    root_id: int,
    user_id: uuid.UUID,
    data: UserInstanceAccessUpdate,
    current_user: User = Depends(require_permissions("edit_user_instance_access")),
    session: AsyncSession = Depends(get_async_session),
    log: LogCallable = Depends(LoggerInterface("user_access"))
):
    updated = await update_user_instance_access(session, user_id, root_id, data)
    if not updated:
        raise HTTPException(status_code=404, detail="User Instance M2M not found")
    
    details: dict[str, object] = {"user_id": str(user_id), "root_id": root_id}
    if data.can_read is not None:
        details["can_read"] = data.can_read
    if data.can_write is not None:
        details["can_write"] = data.can_write
    
    await log(action="update_user_instance_access", details=details)
    return updated
