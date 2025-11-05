from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi.security import OAuth2PasswordBearer
from typing import List, Optional
from app.core.security import get_current_user
from app.crud.auth.users import get_user_by_email_crud, create_user
from app.db.database import get_async_session
from app.schemas.auth import UserOut, UserCreate
from app.crud.auth.auth import require_permission as require_permissions
from app.models.auth import User


router = APIRouter(prefix="/user", tags=["DB: User Data Manipulation"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

@router.get("/me")
async def read_users_me(current_user: User = Depends(get_current_user)):
    return {"id": current_user.id, "email": current_user.email}


@router.get("/user/{user_email}", response_model=UserOut)
async def read_user(
    email: str,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(require_permissions("read_users"))
):
    usr = await get_user_by_email_crud(session, email)
    if not usr:
        raise HTTPException(status_code=404, detail="User with such email not found")
    return usr

@router.post("/", response_model=UserOut)
async def add_user(
    data: UserCreate,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(require_permissions("create_users"))
):
    return await create_user(session, data)
