from fastapi import APIRouter, Depends, HTTPException, status, Response, Cookie, Query
from typing import Optional
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import async_session
from app.schemas.auth import RoleCreate, RoleOut, RoleUpdate
from app.crud.auth.roles import create_role, get_roles, get_role, delete_role, update_role
from app.db.database import get_async_session

from app.crud.auth.auth import require_permission as require_permissions
from app.models.auth import User

router = APIRouter(prefix="/roles", tags=["DB: Auth: Roles"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


@router.post("/rolecreate/", response_model = RoleOut)
async def role_create(role_in: RoleCreate, current_user: User = Depends(require_permissions("create_role")), db: AsyncSession = Depends(get_async_session)):
    role = await create_role(db, role_in)
    if not role:
        raise HTTPException(status_code = 400, detail="Role could not be created")
    return role

@router.get("/", response_model=list[RoleOut])
async def read_roles(
        session: AsyncSession = Depends(get_async_session),
        name: Optional[str] = None,
        description: Optional[str] = Query(None),
        current_user: User = Depends(require_permissions("read_role"))
):
    return await get_roles(session, name, description)

@router.get("/{role_id}/", response_model = RoleOut)
async def read_role(
    role_id: int,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(require_permissions("read_role"))
):
    role = await get_role(session, role_id)

@router.delete("/{role_id}/", status_code=204)
async def delete_role(
    role_id: int,
    current_user: User = Depends(require_permissions("delete_role")),
    session: AsyncSession = Depends(get_async_session)):
    await delete_role(session, role_id)

@router.patch("/{role_id}")
async def update_role(
    role_id: int,
    data: RoleUpdate,
    current_user: User = Depends(require_permissions("edit_role")),
    session: AsyncSession = Depends(get_async_session)
) -> RoleOut | None:
    updated_role: RoleOut | None = await update_role(session, role_id, data)
    if not updated_role:
        raise HTTPException(status_code = 404, detail="Role not found")
    return updated_role