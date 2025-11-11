import uuid
import hashlib
from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.models.auth import User, RefreshToken
from app.core.security import (
    verify_password, get_password_hash,
    create_access_token, create_refresh_token
)
from app.schemas.auth import UserCreate, UserOut



async def create_user(session: AsyncSession, user_in: UserCreate) -> User:
    user = User(email=user_in.email, password_hash=get_password_hash(user_in.password), is_active=True)
    session.add(user)
    await session.commit()
    await session.refresh(user)
    return user


async def authenticate_user(session: AsyncSession, email: str, password: str) -> User | None:
    user = await get_user_by_email(session, email)
    if not user or not verify_password(password, user.password_hash) or not user.is_active:
        return None
    return user


async def get_user_by_email(session: AsyncSession, email: str) -> User | None:
    result = await session.execute(select(User).where(User.email == email))
    return result.scalars().first()


async def get_user_by_email_crud(session: AsyncSession, email:str) -> UserOut | None:
    result = await session.execute(select(User).where(User.email == email))
    return result.scalar_one_or_none()