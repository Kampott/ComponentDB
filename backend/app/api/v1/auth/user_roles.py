import uuid
from fastapi import APIRouter, Depends, HTTPException, status, Response, Cookie, Query
from typing import Optional
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import async_session
from app.schemas.auth import UserRoleCreate, UserRoleOut
from app.crud.auth.user_roles import create_user_role, get_user_role
from app.db.database import get_async_session

from app.crud.auth.auth import require_permission as require_permissions
from app.models.auth import User


router = APIRouter(prefix="/user_roles", tags=["DB: Auth: User Roles"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

@router.post("/users/{user_id}/roles/", response_model = UserRoleCreate)
async def user_role_create(data_in: UserRoleCreate, current_user: User = Depends(require_permissions("create_user_role")),db: AsyncSession=Depends(get_async_session)):
    user_role = await create_user_role(db, data_in)
    if not user_role:
        raise HTTPException(status_code = 400, detail="Could not add role to user")
    return user_role

@router.get("/", response_model=list[UserRoleOut])
async def read_role_permissions(
        session: AsyncSession = Depends(get_async_session),
        current_user: User = Depends(require_permissions("read_role")),
        user_id: Optional[uuid.UUID] = None,
        role_id: Optional[int] = Query(None)
):
    return await get_user_role(session, user_id, role_id)


@router.delete("/{user_id}/{role_id}", status_code=204)
async def delete_role_permissions(
    role_id: int,
    user_id: uuid.UUID,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(require_permissions("delete_role")),
):
    await delete_role_permission(session, user_id, role_id)