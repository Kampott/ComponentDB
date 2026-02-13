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
    current_user: User = Depends(require_permissions("read_role")),
    user_id: Optional[uuid.UUID] = None,
    role_id: Optional[int] = Query(None),
    log: LogCallable = Depends(LoggerInterface("user_roles"))
):
    user_roles = await get_user_role(session, user_id, role_id)
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