import uuid
import hashlib
from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.auth import User, RefreshToken
from app.core.security import (
    verify_password, get_password_hash,
    create_access_token, create_refresh_token
)
from app.schemas.auth import UserCreate


async def create_tokens(session: AsyncSession, user: User) -> dict:
    # access
    access_token = create_access_token(str(user.id))

    # refresh
    refresh = create_refresh_token(str(user.id))

    # hashing refresh token for storage
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
    if not user or not user.is_active:
        return None
    token_hash = hashlib.sha256(refresh_token.encode()).hexdigest()

    result = await session.execute(
        select(RefreshToken)
        .where(RefreshToken.token_hash == token_hash)
        .with_for_update() # blocking, so no race conditions happen
    )
    db_token: RefreshToken | None = result.scalars().first()

    if not db_token:
        return None

    if db_token.revoked or db_token.expires_at < datetime.now(timezone.utc):
        return None

    # Getting user data
    result = await session.execute(select(User).where(User.id == db_token.user_id))
    user: User | None = result.scalars().first()
    if not user:
        return None

    # Marking old refresh token as replaced
    db_token.revoked = True

    # creating new refresh token
    new_refresh = create_refresh_token(str(user.id))
    new_hash = hashlib.sha256(new_refresh["token"].encode()).hexdigest()

    replacement = RefreshToken(
        user_id=user.id,
        jti=new_refresh["jti"],
        token_hash=new_hash,
        expires_at=new_refresh["expires_at"],
    )
    session.add(replacement)
    await session.flush()
    db_token.replaced_by = replacement.id
    await session.commit()

    # Returning new tokens
    new_access = create_access_token(str(user.id))
    return {"access_token": new_access, "refresh_token": new_refresh["token"]}
