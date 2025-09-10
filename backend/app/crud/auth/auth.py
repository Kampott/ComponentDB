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
from app.schemas.auth import UserCreate


async def get_user_by_email(session: AsyncSession, email: str) -> User | None:
    result = await session.execute(select(User).where(User.email == email))
    return result.scalars().first()


async def create_user(session: AsyncSession, user_in: UserCreate) -> User:
    user = User(email=user_in.email, password_hash=get_password_hash(user_in.password))
    session.add(user)
    await session.commit()
    await session.refresh(user)
    return user


async def authenticate_user(session: AsyncSession, email: str, password: str) -> User | None:
    user = await get_user_by_email(session, email)
    if not user or not verify_password(password, user.password_hash):
        return None
    return user


async def create_tokens(session: AsyncSession, user: User) -> dict:
    # access
    access_token = create_access_token(str(user.id))

    # refresh
    refresh = create_refresh_token(str(user.id))

    # хэшируем refresh для хранения
    token_hash = hashlib.sha256(refresh["token"].encode()).hexdigest()

    db_token = RefreshToken(
        user_id=user.id,
        jti=refresh["jti"],
        token_hash=token_hash,
        expires_at=refresh["expires_at"],
    )
    session.add(db_token)
    await session.commit()

    return {"access_token": access_token, "refresh_token": refresh["token"]}


async def verify_and_rotate_refresh_token(session: AsyncSession, refresh_token: str) -> dict | None:
    token_hash = hashlib.sha256(refresh_token.encode()).hexdigest()

    result = await session.execute(
        select(RefreshToken).where(RefreshToken.token_hash == token_hash)
    )
    db_token: RefreshToken | None = result.scalars().first()

    if not db_token:
        return None

    if db_token.revoked or db_token.expires_at < datetime.now(timezone.utc):
        return None

    # достаём пользователя
    result = await session.execute(select(User).where(User.id == db_token.user_id))
    user: User | None = result.scalars().first()
    if not user:
        return None

    # помечаем старый refresh как использованный
    db_token.revoked = True
    new_refresh = create_refresh_token(str(user.id))
    new_hash = hashlib.sha256(new_refresh["token"].encode()).hexdigest()

    replacement = RefreshToken(
        user_id=user.id,
        jti=new_refresh["jti"],
        token_hash=new_hash,
        expires_at=new_refresh["expires_at"],
    )
    db_token.replaced_by = replacement.id
    session.add(replacement)
    await session.commit()

    # возвращаем новые токены
    new_access = create_access_token(str(user.id))
    return {"access_token": new_access, "refresh_token": new_refresh["token"]}
