import uuid
import hashlib
from datetime import datetime, timezone
from typing import List, Optional

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import and_

from app.models.auth import User, RefreshToken
from app.core.security import (
    verify_password, get_password_hash,
    create_access_token, create_refresh_token
)
from app.schemas.auth import UserCreate, UserUpdate



async def create_user(session: AsyncSession, user_in: UserCreate) -> User:
    user = User(
        email=user_in.email,
        password_hash=get_password_hash(user_in.password),
        is_active=True,
        settings=user_in.settings if user_in.settings is not None else {}
    )
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


async def get_user_by_email_crud(session: AsyncSession, email:str) -> User | None:
    result = await session.execute(select(User).where(User.email == email))
    return result.scalar_one_or_none()


async def get_user_by_id(session: AsyncSession, user_id: uuid.UUID) -> Optional[User]:
    result = await session.execute(select(User).where(User.id == user_id))
    return result.scalar_one_or_none()


async def get_users(
    session: AsyncSession,
    filters: dict
) -> List[User]:
    query = select(User)
    
    conditions = []
    for key, value in filters.items():
        if hasattr(User, key):
            column = getattr(User, key)
            if isinstance(value, list):
                conditions.append(column.in_(value))
            else:
                conditions.append(column == value)
    
    if conditions:
        query = query.where(and_(*conditions))
    
    result = await session.execute(query)
    return list(result.scalars().all())


async def update_user(
    session: AsyncSession,
    user_id: uuid.UUID,
    data: UserUpdate
) -> Optional[User]:
    result = await session.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user:
        return None
    
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(user, key, value)
    
    await session.commit()
    await session.refresh(user)
    return user


async def update_user_settings(
    session: AsyncSession,
    user_id: uuid.UUID,
    settings: dict
) -> Optional[User]:
    result = await session.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user:
        return None
    
    user.settings = settings
    await session.commit()
    await session.refresh(user)
    return user
