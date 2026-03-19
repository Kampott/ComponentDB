from fastapi import APIRouter, Depends, HTTPException, status, Response, Cookie, Query
from typing import Optional
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from app.schemas.auth import RolePermissionCreate, RolePermissionOut
from app.crud.auth.role_permissions import create_role_permission, get_role_permission, delete_role_permission
from app.db.database import get_async_session
from app.crud.auth.auth import require_permission as require_permissions
from app.models.auth import User
from app.logging.deps import LoggerInterface, LogCallable
from typing import List
from datetime import datetime
from app.core.query_builder import QueryBuilder
from app.core.search_config import SEARCH_CONFIG

router = APIRouter(prefix="/role_permissions", tags=["DB: Auth: Role Permissions"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

@router.post("/roles/{role_id}/permission/", response_model=RolePermissionCreate)
async def role_permission_create(
    data_in: RolePermissionCreate,
    current_user: User = Depends(require_permissions("create_role_permission")),
    db: AsyncSession = Depends(get_async_session),
    log: LogCallable = Depends(LoggerInterface("role_permissions"))
):
    role_permission = await create_role_permission(db, data_in)
    if not role_permission:
        raise HTTPException(status_code=400, detail="Could not add permission to role")
    
    await log(action="create_role_permission", details={"role_id": data_in.role_id, "permission_id": data_in.permission_id})
    return role_permission

@router.get("/", response_model=list[RolePermissionOut])
async def read_role_permissions(
    session: AsyncSession = Depends(get_async_session),
    # Фильтры
    role_id: Optional[int] = Query(None),
    role_id__in: Optional[List[int]] = Query(None),
    
    permission_id: Optional[int] = Query(None),
    permission_id__in: Optional[List[int]] = Query(None),
    
    current_user: User = Depends(require_permissions("read_role_permission")),
    log: LogCallable = Depends(LoggerInterface("role_permissions"))
):
    params = {
        "role_id": role_id,
        "role_id__in": role_id__in,
        "permission_id": permission_id,
        "permission_id__in": permission_id__in,
    }
    
    QueryBuilder.validate_params(RolePermission, params, SEARCH_CONFIG[RolePermission])
    filters = QueryBuilder.parse_query_params(params)
    
    query = select(RolePermission)
    query = QueryBuilder.apply_filters(query, RolePermission, filters)
    query = QueryBuilder.apply_sorting(query, RolePermission, filters)
    
    result = await session.execute(query)
    role_permissions = result.scalars().all()
    
    try:
        await log(action="read_role_permissions")
    except Exception:
        pass
    
    return role_permissions

@router.delete("/{role_id}/{permission_id}", status_code=204)
async def delete_role_permissions(
    role_id: int,
    permission_id: int,
    current_user: User = Depends(require_permissions("delete_role_permission")),
    session: AsyncSession = Depends(get_async_session),
    log: LogCallable = Depends(LoggerInterface("role_permissions"))
):
    await delete_role_permission(session, role_id, permission_id)
    await log(action="delete_role_permission", details={"role_id": role_id, "permission_id": permission_id})