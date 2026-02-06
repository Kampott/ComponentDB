from fastapi import APIRouter, Depends, HTTPException, status, Response, Cookie, Query
from typing import Optional
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import async_session
from app.schemas.auth import UserInstanceAccessCreate, UserInstanceAccessOut, UserInstanceAccessUpdate
from app.crud.auth.user_instance_access import create_user_instance_access, delete_user_instance_access, get_user_instance_access, update_user_instance_access
from app.db.database import get_async_session

from app.crud.auth.auth import require_permission as require_permissions
from app.models.auth import User

import uuid


router = APIRouter(prefix="/user_instance_access", tags=["DB: Auth: User Instance Access"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


@router.post("/users/{root_id}/instance/", response_model = UserInstanceAccessOut)
async def user_instance_access_create(data_in: UserInstanceAccessCreate, current_user: User = Depends(require_permissions("create_user_instance_access")),db: AsyncSession=Depends(get_async_session)):
    user_instance_access = await create_user_instance_access(db, data_in)
    if not user_instance_access:
        raise HTTPException(status_code = 400, detail="Could not add instance access to user")
    return user_instance_access


@router.get("/", response_model=list[UserInstanceAccessOut])
async def read_user_instance_access(
        session: AsyncSession = Depends(get_async_session),
        current_user: User = Depends(require_permissions("read_user_instance_access")), 
        user_id: Optional[uuid.UUID] = None,
        root_id: Optional[int] = Query(None)
):
    return await get_user_instance_access(session, user_id, root_id)


@router.delete("/{root_id}/{user_id}", status_code=204)
async def _delete_user_instance_access(
    root_id: int,
    user_id: uuid.UUID,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(require_permissions("delete_user_instance_access")),
):
    await delete_user_instance_access(session, user_id, root_id)

@router.patch("/{root_id}/{user_id}", response_model=UserInstanceAccessOut)
async def _update_user_instance_access(
    root_id: int,
    user_id: uuid.UUID,
    data: UserInstanceAccessUpdate,
    current_user: User = Depends(require_permissions("edit_user_instance_access")),
    session: AsyncSession = Depends(get_async_session)
):
    updated = await update_user_instance_access(session, user_id, root_id, data)

    if not updated:
        raise HTTPException(status_code=404, detail="User Instance M2M not found")

    return updated
