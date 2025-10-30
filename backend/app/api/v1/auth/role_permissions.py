from fastapi import APIRouter, Depends, HTTPException, status, Response, Cookie, Query
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import async_session
from app.schemas.auth import RolePermissionCreate, RolePermissionOut
from app.crud.auth.role_permissions import create_role_permission, get_role_permission, delete_role_permission
from app.db.database import get_async_session

router = APIRouter(prefix="/role_permissions", tags=["DB: Auth: Role Permissions"])


@router.post("/roles/{role_id}/permission/", response_model = RolePermissionCreate)
async def role_permission_create(data_in: RolePermissionCreate, db: AsyncSession = Depends(get_async_session)):
    role_permission = await create_role_permission(db, data_in)
    if not role_permission:
        raise HTTPException(status_code = 400, detail="Could not add permission to role")
    return role_permission


@router.get("/", response_model=list[RolePermissionOut])
async def read_role_permissions(
        session: AsyncSession = Depends(get_async_session),
        role_id: Optional[int] = None,
        permission_id: Optional[int] = Query(None)
):
    return await get_role_permission(session, role_id, permission_id)


@router.delete("/{role_id}/{permission_id}", status_code=204)
async def delete_role_permissions(
    role_id: int,
    permission_id: int,
    session: AsyncSession = Depends(get_async_session)
):
    await delete_role_permission(session, role_id, permission_id)