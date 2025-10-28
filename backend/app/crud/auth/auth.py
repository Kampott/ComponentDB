import uuid
import hashlib
from datetime import datetime, timezone
from typing import Callable, Awaitable, Optional

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.models.auth import User, RefreshToken
from app.core.security import (
    get_current_user, verify_password, get_password_hash,
    create_access_token, create_refresh_token
)
from app.schemas.auth import UserCreate
from app.db.database import get_async_session

from fastapi import Depends, HTTPException, status


async def create_tokens(session: AsyncSession, user: User) -> dict:
    # access
    access_token = create_access_token({"sub": str(user.id)})

    # refresh
    refresh = create_refresh_token({"sub": str(user.id)})

    # hashing refresh token for storage
    token_hash = hashlib.sha256(refresh["token"].encode()).hexdigest()

    db_token = RefreshToken(
        user_id=user.id,
        jti=refresh["jti"],
        token_hash=token_hash,
        expires_at=refresh["expires_at"],
    )

    async with session.begin():
        session.add(db_token)

    return {"access_token": access_token, "refresh_token": refresh["token"]}


async def verify_and_rotate_refresh_token(session: AsyncSession, refresh_token: str) -> dict | None:
    token_hash = hashlib.sha256(refresh_token.encode()).hexdigest()

    async with session.begin():
        result = await session.execute(
            select(RefreshToken)
            .where(RefreshToken.token_hash == token_hash)
            .with_for_update() # blocking, so no race conditions happen
        )
        db_token: RefreshToken | None = result.scalars().first()

        if not db_token or db_token.revoked or db_token.expires_at < datetime.now(timezone.utc):
            return None

        # Getting user data
        result = await session.execute(select(User).where(User.id == db_token.user_id))
        user: User | None = result.scalars().first()
        if not user or not user.is_active:
            return None

        # Marking old refresh token as replaced
        db_token.revoked = True

        # creating new refresh token
        new_refresh = create_refresh_token({"sub": str(user.id)})
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
    new_access = create_access_token({"sub": str(user.id)})
    return {"access_token": new_access, "refresh_token": new_refresh["token"]}

async def user_has_role(db: AsyncSession, user: User, role_name: str) -> bool:
    result = await db.execute(
        select(User)
        .where(User.id == user.id)
        .options(selectinload(User.roles))
    )
    user = result.scalar_one_or_none()
    if not user:
        return False
    return any(role.name == role_name for role in user.roles)


async def user_has_permission(db: AsyncSession, user: User, permission_name: str) -> bool:
    result = await db.execute(
        select(User)
        .where(User.id == user.id)
        .options(
            selectinload(User.roles).selectinload(Role.permissions)
        )
    )
    user = result.scalar_one_or_none()
    if not user:
        return False
    for role in user.roles:
        for perm in role.permissions:
            if perm.name == permission_name:
                return True
    return False


def require_permissions(*permissions: str):
    async def dependency(
        current_user: User = Depends(get_current_user),
        db: AsyncSession = Depends(get_async_session)
    ):
        result = await db.execute(
            select(User)
            .where(User.id == current_user.id)
            .options(
                selectinload(User.roles).selectinload(Role.permissions)
            )
        )
        user = result.scalar_one_or_none()
        if not user:
            raise HTTPException(status_code=401, detail="User not found")

        user_perms = {perm.name for role in user.roles for perm in role.permissions}
        if not any(p in user_perms for p in permissions):
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return user
    return dependency


async def user_can_read_instance(
    db: AsyncSession, user: User, instance_root_id: int
) -> bool:
    result = await db.execute(
        select(UserInstanceAccess)
        .where(
            UserInstanceAccess.user_id == user.id,
            UserInstanceAccess.root_id == instance_root_id,
            UserInstanceAccess.can_read.is_(True)
        )
    )
    access = result.scalar_one_or_none()
    return access is not None


async def user_can_write_instance(
    db: AsyncSession, user: User, instance_root_id: int
) -> bool:
    result = await db.execute(
        select(UserInstanceAccess)
        .where(
            UserInstanceAccess.user_id == user.id,
            UserInstanceAccess.root_id == instance_root_id,
            UserInstanceAccess.can_write.is_(True)
        )
    )
    access = result.scalar_one_or_none()
    return access is not None


def require_instance_permission(
    write: bool = False,
    instance_root_id_getter: Callable[..., Awaitable[int]] | None = None
):
    async def dependency(
        current_user: User = Depends(get_current_user),
        db: AsyncSession = Depends(get_async_session),
        **kwargs
    ):
        if instance_root_id_getter is None:
            raise RuntimeError("instance_root_id_getter is required")

        root_id = await instance_root_id_getter(**kwargs)  # await работает здесь
        if write:
            if not await user_can_write_instance(db, current_user, root_id):
                raise HTTPException(status_code=403, detail="No write access to this instance")
        else:
            if not await user_can_read_instance(db, current_user, root_id):
                raise HTTPException(status_code=403, detail="No read access to this instance")
        return current_user

    return dependency



async def get_instance_root_id(instance_id: int, session: AsyncSession) -> int:
    instance = await get_instance(session, instance_id)
    if not instance:
        raise HTTPException(status_code=404, detail="Instance not found")
    return instance.root_id
