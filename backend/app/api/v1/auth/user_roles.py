import uuid
from fastapi import APIRouter, Depends, HTTPException, status, Response, Cookie, Query
from typing import Optional
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from app.schemas.auth import UserRoleCreate, UserRoleOut
from app.crud.auth.user_roles import create_user_role, get_user_role, delete_user_role
from app.db.database import get_async_session
from app.crud.auth.auth import require_permission as require_permissions
from app.models.auth import User
from app.logging.deps import LoggerInterface, LogCallable
from typing import List
from datetime import datetime
from app.core.query_builder import QueryBuilder
from app.core.search_config import SEARCH_CONFIG

router = APIRouter(prefix="/user_roles", tags=["DB: Auth: User Roles"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

@router.post("/users/{user_id}/roles/", response_model=UserRoleCreate)
async def user_role_create(
    data_in: UserRoleCreate,
    current_user: User = Depends(require_permissions("create_user_role")),
    db: AsyncSession = Depends(get_async_session),
    log: LogCallable = Depends(LoggerInterface("user_roles"))
):
    user_role = await create_user_role(db, data_in)
    if not user_role:
        raise HTTPException(status_code=400, detail="Could not add role to user")
    
    await log(action="create_user_role", details={"user_id": str(data_in.user_id), "role_id": data_in.role_id})
    return user_role

@router.get("/", response_model=list[UserRoleOut])
async def read_user_roles(
    session: AsyncSession = Depends(get_async_session),
    # Фильтры
    user_id: Optional[uuid.UUID] = Query(None),
    user_id__in: Optional[List[uuid.UUID]] = Query(None),
    
    role_id: Optional[int] = Query(None),
    role_id__in: Optional[List[int]] = Query(None),
    
    current_user: User = Depends(require_permissions("read_role")),
    log: LogCallable = Depends(LoggerInterface("user_roles"))
):
    params = {
        "user_id": user_id,
        "user_id__in": user_id__in,
        "role_id": role_id,
        "role_id__in": role_id__in,
    }
    
    QueryBuilder.validate_params(UserRole, params, SEARCH_CONFIG[UserRole])
    filters = QueryBuilder.parse_query_params(params)
    
    query = select(UserRole)
    query = QueryBuilder.apply_filters(query, UserRole, filters)
    query = QueryBuilder.apply_sorting(query, UserRole, filters)
    
    result = await session.execute(query)
    user_roles = result.scalars().all()
    
    try:
        await log(action="read_user_roles")
    except Exception:
        pass
    
    return user_roles

@router.delete("/{user_id}/{role_id}", status_code=204)
async def delete_user_role_endpoint(
    role_id: int,
    user_id: uuid.UUID,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(require_permissions("delete_role")),
    log: LogCallable = Depends(LoggerInterface("user_roles"))
):
    await delete_user_role(session, user_id, role_id)
    await log(action="delete_user_role", details={"user_id": str(user_id), "role_id": role_id})