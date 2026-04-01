from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud.auth.auth import require_permission as require_permissions
from app.crud.auth.roles import create_role, delete_role, get_role, update_role
from app.core.query_builder import QueryBuilder
from app.core.search_config import SEARCH_CONFIG
from app.db.database import get_async_session
from app.logging.deps import LoggerInterface, LogCallable
from app.models.auth import Role, User
from app.schemas.auth import RoleCreate, RoleOut, RoleUpdate
from app.logging.deps import LoggerInterface, LogCallable
from typing import List

router = APIRouter(prefix="/roles", tags=["DB: Auth: Roles"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

@router.post("/rolecreate/", response_model=RoleOut)
async def role_create(
    role_in: RoleCreate,
    current_user: User = Depends(require_permissions("create_role")),
    db: AsyncSession = Depends(get_async_session),
    log: LogCallable = Depends(LoggerInterface("roles"))
):
    role = await create_role(db, role_in)
    if not role:
        raise HTTPException(status_code=400, detail="Role could not be created")
    
    await log(action="create_role", details={"role_id": role.id, "name": role.name})
    return role

@router.get("/", response_model=list[RoleOut])
async def read_roles(
    session: AsyncSession = Depends(get_async_session),
    # Фильтры
    name: Optional[str] = Query(None),
    name__like: Optional[str] = Query(None),
    name__sort: Optional[str] = Query(None, regex="^(asc|desc)$"),
    
    id: Optional[int] = Query(None),
    id__in: Optional[List[int]] = Query(None),
    id__sort: Optional[str] = Query(None, regex="^(asc|desc)$"),
    
    current_user: User = Depends(require_permissions("read_role")),
    log: LogCallable = Depends(LoggerInterface("roles"))
):
    params = {
        "name": name,
        "name__like": name__like,
        "name__sort": name__sort,
        "id": id,
        "id__in": id__in,
        "id__sort": id__sort,
    }
    
    QueryBuilder.validate_params(Role, params, SEARCH_CONFIG[Role])
    filters = QueryBuilder.parse_query_params(params)
    
    query = select(Role)
    query = QueryBuilder.apply_filters(query, Role, filters)
    query = QueryBuilder.apply_sorting(query, Role, filters)
    
    result = await session.execute(query)
    roles = result.scalars().all()
    
    try:
        await log(action="read_roles")
    except Exception:
        pass
    
    return roles



@router.get("/{role_id}/", response_model=RoleOut)
async def read_role_endpoint(
    role_id: int,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(require_permissions("read_role")),
    log: LogCallable = Depends(LoggerInterface("roles"))
):
    role = await get_role(session, role_id)
    await log(action="read_role", details={"role_id": role_id})
    return role


@router.delete("/{role_id}/", status_code=204)
async def delete_role_endpoint(
    role_id: int,
    current_user: User = Depends(require_permissions("delete_role")),
    session: AsyncSession = Depends(get_async_session),
    log: LogCallable = Depends(LoggerInterface("roles"))
):
    await delete_role(session, role_id)
    await log(action="delete_role", details={"role_id": role_id})

@router.patch("/{role_id}")
async def update_role_endpoint(
    role_id: int,
    data: RoleUpdate,
    current_user: User = Depends(require_permissions("edit_role")),
    session: AsyncSession = Depends(get_async_session),
    log: LogCallable = Depends(LoggerInterface("roles"))
):
    updated_role = await update_role(session, role_id, data)
    if not updated_role:
        raise HTTPException(status_code=404, detail="Role not found")
    
    details: dict[str, object] = {"role_id": role_id}
    if data.name is not None:
        details["name"] = data.name
    
    await log(action="update_role", details=details)
    return updated_role
