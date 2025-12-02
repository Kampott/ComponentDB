from fastapi import APIRouter, Depends, HTTPException, status, Response, Cookie, Query
from typing import Optional
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import async_session
from app.schemas.auth import PermissionCreate, PermissionOut, RolePermissionCreate, UserRoleCreate, PermissionUpdate
from app.crud.auth.permissions import create_permission, get_permissions, get_permission, delete_permission, update_permission
from app.db.database import get_async_session

from app.crud.auth.auth import require_permission as require_permissions
from app.models.auth import User


router = APIRouter(prefix="/permissions", tags=["DB: Auth: Permissions"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

@router.post("/permissioncreate/", response_model = PermissionOut)
async def permission_create(
    permission_in: PermissionCreate,
    current_user: User = Depends(require_permissions("create_permission")),
    db: AsyncSession = Depends(get_async_session)):
    permission = await create_permission(db, permission_in)
    if not permission:
        raise HTTPException(status_code = 400, detail="Permission could not be created")
    return permission

@router.get("/", response_model=list[PermissionOut])
async def read_permissions(
        session: AsyncSession = Depends(get_async_session),
        name: Optional[str] = None,
        description: Optional[str] = Query(None),
        current_user: User = Depends(require_permissions("read_permission"))
):
    return await get_permissions(session, name, description)

@router.get("/{permission_id}/", response_model = PermissionOut)
async def read_permission(
    permission_id: int,
    current_user: User = Depends(require_permissions("read_permission")),
    session: AsyncSession = Depends(get_async_session)
):
    perm = await get_permission(session, role_id)

@router.delete("/{permission_id}/", status_code=204)
async def delete_permissions(
    permission_id: int,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(require_permissions("delete_permission"))):
    await delete_permission(session, permission_id)

@router.patch("/{permission_id}")
async def update_permission(
    permission_id: int,
    data: PermissionUpdate,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(require_permissions("edit_permission"))
) -> PermissionOut | None:
    updated_permission: PermissionOut | None = await update_permission(session, permission_id, data)
    if not updated_permission:
        raise HTTPException(status_code = 404, detail="Permission not found")
    return updated_permission







