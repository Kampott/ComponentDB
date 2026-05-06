from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud.auth.permissions import create_permission, delete_permission, get_permission, update_permission
from app.crud.auth.auth import require_permission as require_permissions
from app.core.query_builder import QueryBuilder
from app.core.search_config import SEARCH_CONFIG
from app.db.database import get_async_session
from app.logging.deps import LoggerInterface, LogCallable
from app.models.auth import Permission, User
from app.schemas.auth import PermissionCreate, PermissionOut, PermissionUpdate
from app.logging.deps import LoggerInterface, LogCallable
from typing import List

router = APIRouter(prefix="/permissions", tags=["DB: Auth: Permissions"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

@router.post("/permissioncreate/", response_model=PermissionOut)
async def permission_create(
    permission_in: PermissionCreate,
    current_user: User = Depends(require_permissions("create_permission")),
    db: AsyncSession = Depends(get_async_session),
    log: LogCallable = Depends(LoggerInterface("permissions"))
):
    permission = await create_permission(db, permission_in)
    if not permission:
        raise HTTPException(status_code=400, detail="Permission could not be created")
    
    await log(action="create_permission", details={"permission_id": permission.id, "name": permission.name})
    return permission

@router.get("/", response_model=list[PermissionOut])
async def read_permissions(
    session: AsyncSession = Depends(get_async_session),
    # Фильтры
    name: Optional[str] = Query(None),
    name__like: Optional[str] = Query(None),
    name__sort: Optional[str] = Query(None, pattern="^(asc|desc)$"),
    description: Optional[str] = Query(None),
    description__like: Optional[str] = Query(None),

    id: Optional[int] = Query(None),
    id__in: Optional[List[int]] = Query(None),
    id__gt: Optional[int] = Query(None),
    id__lt: Optional[int] = Query(None),
    id__gte: Optional[int] = Query(None),
    id__lte: Optional[int] = Query(None),
    id__sort: Optional[str] = Query(None, pattern="^(asc|desc)$"),
    
    limit: Optional[int] = Query(None, ge=1, le=1000),
    
    current_user: User = Depends(require_permissions("read_permission")),
    log: LogCallable = Depends(LoggerInterface("permissions"))
):
    params = {
        "name": name,
        "name__like": name__like,
        "name__sort": name__sort,
        "description": description,
        "description__like": description__like,
        "id": id,
        "id__in": id__in,
        "id__gt": id__gt,
        "id__lt": id__lt,
        "id__gte": id__gte,
        "id__lte": id__lte,
        "id__sort": id__sort,
    }
    
    QueryBuilder.validate_params(Permission, params, SEARCH_CONFIG[Permission])
    filters = QueryBuilder.parse_query_params(params)
    
    query = select(Permission)
    query = QueryBuilder.apply_filters(query, Permission, filters)
    query = QueryBuilder.apply_sorting(query, Permission, filters)
    query = QueryBuilder.apply_limit(query, limit)
    
    result = await session.execute(query)
    permissions = result.scalars().all()
    
    try:
        await log(action="read_permissions")
    except Exception:
        pass
    
    return permissions

@router.get("/{permission_id}/", response_model=PermissionOut)
async def read_permission(
    permission_id: int,
    current_user: User = Depends(require_permissions("read_permission")),
    session: AsyncSession = Depends(get_async_session),
    log: LogCallable = Depends(LoggerInterface("permissions"))
):
    perm = await get_permission(session, permission_id)
    await log(action="read_permission", details={"permission_id": permission_id})
    return perm

@router.delete("/{permission_id}/", status_code=204)
async def delete_permissions(
    permission_id: int,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(require_permissions("delete_permission")),
    log: LogCallable = Depends(LoggerInterface("permissions"))
):
    await delete_permission(session, permission_id)
    await log(action="delete_permission", details={"permission_id": permission_id})

@router.patch("/{permission_id}")
async def update_permission_endpoint(
    permission_id: int,
    data: PermissionUpdate,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(require_permissions("edit_permission")),
    log: LogCallable = Depends(LoggerInterface("permissions"))
):
    updated_permission = await update_permission(session, permission_id, data)
    if not updated_permission:
        raise HTTPException(status_code=404, detail="Permission not found")
    
    details: dict[str, object] = {"permission_id": permission_id}
    if data.name is not None:
        details["name"] = data.name
    
    await log(action="update_permission", details=details)
    return updated_permission
