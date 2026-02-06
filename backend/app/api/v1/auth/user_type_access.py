from fastapi import APIRouter, Depends, HTTPException, status, Response, Cookie, Query
from typing import Optional
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import async_session
from app.schemas.auth import UserTypeAccessCreate, UserTypeAccessOut, UserTypeAccessUpdate
from app.crud.auth.user_type_access import create_user_type_access, delete_user_type_access, get_user_type_access, update_user_type_access
from app.db.database import get_async_session

from app.crud.auth.auth import require_permission as require_permissions
from app.models.auth import User

import uuid


router = APIRouter(prefix="/user_type_access", tags=["DB: Auth: User Type Access"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


@router.post("/users/{root_id}/type/", response_model = UserTypeAccessOut)
async def user_type_access_create(data_in: UserTypeAccessCreate, current_user: User = Depends(require_permissions("create_user_type_access")),db: AsyncSession=Depends(get_async_session)):
    user_type_access = await create_user_type_access(db, data_in)
    if not user_type_access:
        raise HTTPException(status_code = 400, detail="Could not add type access to user")
    return user_type_access


@router.get("/", response_model=list[UserTypeAccessOut])
async def read_user_type_access(
        session: AsyncSession = Depends(get_async_session),
        current_user: User = Depends(require_permissions("read_user_type_access")), 
        user_id: Optional[uuid.UUID] = None,
        root_id: Optional[int] = Query(None)
):
    return await get_user_type_access(session, user_id, root_id)


@router.delete("/{root_id}/{user_id}", status_code=204)
async def _delete_user_type_access(
    root_id: int,
    user_id: uuid.UUID,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(require_permissions("delete_user_type_access")),
):
    await delete_user_type_access(session, user_id, root_id)

@router.patch("/{root_id}/{user_id}", response_model=UserTypeAccessOut)
async def _update_user_type_access(
    root_id: int,
    user_id: uuid.UUID,
    data: UserTypeAccessUpdate,
    current_user: User = Depends(require_permissions("edit_user_type_access")),
    session: AsyncSession = Depends(get_async_session)
):
    updated = await update_user_type_access(session, user_id, root_id, data)

    if not updated:
        raise HTTPException(status_code=404, detail="User Type M2M not found")

    return updated
