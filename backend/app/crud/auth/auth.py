import uuid
import hashlib
from datetime import datetime, timezone
from typing import Callable, Awaitable, Optional

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.core.security import (
    get_current_user, verify_password, get_password_hash,
    create_access_token, create_refresh_token, decode_token
)

from app.models.auth import User, RefreshToken, Role, Permission, UserInstanceAccess, UserObjectAccess, UserTypeAccess, UserRole, RolePermission
from app.schemas.auth import UserCreate, TokenOut
from app.db.database import get_async_session
from app.crud.core.instances import get_instance
from app.crud.core.types import get_type
from app.crud.core.objects import get_object



from fastapi import Depends, HTTPException, status


async def create_tokens(session: AsyncSession, user: User) -> dict:
    # access
    access_token = create_access_token({"sub": user.id})

    # refresh
    refresh = create_refresh_token({"sub": user.id})

    # hashing refresh token for storage
    token_hash = hashlib.sha256(refresh["token"].encode()).hexdigest()

    db_token = RefreshToken(
        user_id=user.id,
        jti=refresh["jti"],
        token_hash=token_hash,
        expires_at=refresh["expires_at"],
    )
    
    session.add(db_token)
    await session.flush() 

    return {"access_token": access_token, "refresh_token": refresh["token"]}

async def verify_and_rotate_refresh_token(session: AsyncSession, refresh_token: str) -> dict | None:
    # First, decode and verify the JWT signature
    payload = decode_token(refresh_token)
    if not payload or payload.get("scope") != "refresh_token":
        return None
    jti_str = payload.get("jti")
    sub_str = payload.get("sub")
    if not jti_str or not sub_str:
        return None
    try:
        jti = uuid.UUID(jti_str)
        sub = uuid.UUID(sub_str)
    except ValueError:
        return None
    token_hash = hashlib.sha256(refresh_token.encode()).hexdigest()
    
    async with session.begin():
        result = await session.execute(
            select(RefreshToken)
            .where(
                RefreshToken.jti == jti,
                RefreshToken.token_hash == token_hash
            )
            .with_for_update()  # blocking, so no race conditions happen
        )
        db_token: RefreshToken | None = result.scalars().first()

        if not db_token or db_token.revoked or db_token.expires_at < datetime.now(timezone.utc):
            return None

        # Verify user_id matches sub
        if db_token.user_id != sub:
            return None

        # Getting user data
        result = await session.execute(select(User).where(User.id == db_token.user_id))
        user: User | None = result.scalars().first()
        if not user or not user.is_active:
            return None

        # Marking old refresh token as replaced
        db_token.revoked = True

        # creating new refresh token
        new_refresh = create_refresh_token({"sub": user.id})

        # hashing new refresh token
        new_hash = hashlib.sha256(new_refresh["token"].encode()).hexdigest()

        replacement = RefreshToken(
            user_id=user.id,
            jti=new_refresh["jti"],  # UUID object
            token_hash=new_hash,
            expires_at=new_refresh["expires_at"],
        )
        session.add(replacement)
        await session.flush()
        db_token.replaced_by = replacement.id

    # Returning new tokens
    new_access = create_access_token({"sub": user.id})
    return {"access_token": new_access, "refresh_token": new_refresh["token"]}

async def user_has_role(db: AsyncSession, user: User, role_name: str) -> bool:
    result = await db.execute(
        select(User)
        .where(User.id == user.id)
        .options(selectinload(User.roles))
    )
    loaded_user = result.scalar_one_or_none()
    if not loaded_user:
        return False
    return any(role.name == role_name or role.name == "SUPER_USER" for role in loaded_user.roles)


async def user_has_permission(db: AsyncSession, user: User, permission_name: str) -> bool:
    result = await db.execute(
        select(User)
        .where(User.id == user.id)
        .options(
            selectinload(User.roles).selectinload(Role.permissions)
        )
    )
    loaded_user = result.scalar_one_or_none()
    if not loaded_user:
        return False
    for role in loaded_user.roles:
        for perm in role.permissions:
            if perm.name == permission_name or perm.name == "SUPER_PERMISSION":
                return True
    return False



async def _check_permission(current_user: User, db: AsyncSession, permission: str):
    result = await db.execute(
        select(User)
        .where(User.id == current_user.id)
        .options(selectinload(User.roles).selectinload(Role.permissions))
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    user_perms = {perm.name for role in user.roles for perm in role.permissions}
    if permission not in user_perms and "SUPER_PERMISSION" not in user_perms:
        raise HTTPException(status_code=403, detail=f"Insufficent permissions")

    return user

def require_permission(permission: str):
    async def dependency(
        current_user: User = Depends(get_current_user),
        db: AsyncSession = Depends(get_async_session)
    ):
        return await _check_permission(current_user, db, permission)
    return dependency

# SUPERUSER CHECK

async def user_is_superuser(db: AsyncSession, user: User) -> bool:
    result = await db.execute(
        select(UserRole)
        .join(Role)
        .where(UserRole.user_id == user.id, Role.name == "SUPER_USER")
    )
    role = result.scalar_one_or_none()
    return role is not None


# CAN READ/WRITE CHECK FOR TYPES

async def user_can_read_type(
    db: AsyncSession, user: User, type_root_id: int
) -> bool:
    result = await db.execute(
        select(UserTypeAccess)
        .where(
            UserTypeAccess.user_id == user.id,
            UserTypeAccess.root_id == type_root_id,
            UserTypeAccess.can_read.is_(True)
        )
    )
    access = result.scalar_one_or_none()
    return access is not None

async def user_can_write_type(
    db: AsyncSession, user: User, type_root_id: int
) -> bool:
    result = await db.execute(
        select(UserTypeAccess)
        .where(
            UserTypeAccess.user_id == user.id,
            UserTypeAccess.root_id == type_root_id,
            UserTypeAccess.can_write.is_(True)
        )
    )
    access = result.scalar_one_or_none()
    return access is not None


# CAN READ/WRITE CHECK FOR OBJECTS

async def user_can_read_object(
    db: AsyncSession, user: User, object_root_id: int
) -> bool:
    result = await db.execute(
        select(UserObjectAccess)
        .where(
            UserObjectAccess.user_id == user.id,
            UserObjectAccess.root_id == object_root_id,
            UserObjectAccess.can_read.is_(True)
        )
    )
    access = result.scalar_one_or_none()
    return access is not None

async def user_can_write_object(
    db: AsyncSession, user: User, object_root_id: int
) -> bool:
    result = await db.execute(
        select(UserObjectAccess)
        .where(
            UserObjectAccess.user_id == user.id,
            UserObjectAccess.root_id == object_root_id,
            UserObjectAccess.can_write.is_(True)
        )
    )
    access = result.scalar_one_or_none()
    return access is not None


# USER CAN READ/WRITE INSTANCE

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




# TYPE PERMISSION CHECK

def require_type_permission(write: bool = False):
    async def dependency(
        type_id: int,
        current_user: User = Depends(get_current_user),
        db: AsyncSession = Depends(get_async_session)
    ):
        return await _check_type_permission(db, current_user, type_id, write)
    return dependency

async def _check_type_permission(
    db: AsyncSession,
    current_user: User,
    type_id: int,
    write: bool = False
):
    type_obj = await get_type(db, type_id)
    if not type_obj:
        raise HTTPException(status_code=404, detail="Type not found")

    if write:
        allowed = await user_can_write_type(db, current_user, type_obj.root_id)
    else:
        allowed = await user_can_read_type(db, current_user, type_obj.root_id)

    superuser = await user_is_superuser(db, current_user)
    if not (allowed or superuser):
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    return current_user

# OBJECT PERMISSION CHECK

def require_object_permission(write: bool = False):
    async def dependency(
        object_id: int,
        current_user: User = Depends(get_current_user),
        db: AsyncSession = Depends(get_async_session)
    ):
        return await _check_object_permission(db, current_user, object_id, write)
    return dependency

async def _check_object_permission(
    db: AsyncSession,
    current_user: User,
    object_id: int,
    write: bool = False
):
    object_obj = await get_object(db, object_id)
    if not object_obj:
        raise HTTPException(status_code=404, detail="Object not found")

    # Check direct object access
    if write:
        allowed = await user_can_write_object(db, current_user, object_obj.root_id)
    else:
        allowed = await user_can_read_object(db, current_user, object_obj.root_id)

    # If not allowed, check parent type access
    if not allowed:

        if not hasattr(object_obj, 'type_id') or object_obj.type_id is None:
            raise HTTPException(status_code=500, detail="Object missing type_id")
        type_obj = await get_type(db, object_obj.type_id)
        if not type_obj:
            raise HTTPException(status_code=404, detail="Parent type not found")
        if write:
            allowed = await user_can_write_type(db, current_user, type_obj.root_id)
        else:
            allowed = await user_can_read_type(db, current_user, type_obj.root_id)


    superuser = await user_is_superuser(db, current_user)
    if not (allowed or superuser):
        raise HTTPException(status_code=403, detail="No access to this object")

    return current_user


# INSTANCE PERMISSION CHECK

def require_instance_permission(write: bool = False):
    async def dependency(
        instance_id: int,
        current_user: User = Depends(get_current_user),
        db: AsyncSession = Depends(get_async_session)
    ):
        return await _check_instance_permission(db, current_user, instance_id, write)
    return dependency

async def _check_instance_permission(
    db: AsyncSession,
    current_user: User,
    instance_id: int,
    write: bool = False
):
    instance_obj = await get_instance(db, instance_id)
    if not instance_obj:
        raise HTTPException(status_code=404, detail="Instance not found")

    # Check direct instance access
    if write:
        allowed = await user_can_write_instance(db, current_user, instance_obj.root_id)
    else:
        allowed = await user_can_read_instance(db, current_user, instance_obj.root_id)

    # If not allowed, check parent object access
    object_obj = None
    if not allowed:

        if not hasattr(instance_obj, 'object_id') or instance_obj.object_id is None:
            raise HTTPException(status_code=500, detail="Instance missing object_id")
        object_obj = await get_object(db, instance_obj.object_id)
        if not object_obj:
            raise HTTPException(status_code=404, detail="Parent object not found")
        if write:
            allowed = await user_can_write_object(db, current_user, object_obj.root_id)
        else:
            allowed = await user_can_read_object(db, current_user, object_obj.root_id)

    # If still not allowed, check grandparent type access
    if not allowed:
        # From the object, get type
        if object_obj is None:
            raise HTTPException(status_code=500, detail="Parent object not loaded")
        if not hasattr(object_obj, 'type_id') or object_obj.type_id is None:
            raise HTTPException(status_code=500, detail="Object missing type_id")
        type_obj = await get_type(db, object_obj.type_id)
        if not type_obj:
            raise HTTPException(status_code=404, detail="Grandparent type not found")
        if write:
            allowed = await user_can_write_type(db, current_user, type_obj.root_id)
        else:
            allowed = await user_can_read_type(db, current_user, type_obj.root_id)

    superuser = await user_is_superuser(db, current_user)
    if not (allowed or superuser):
        raise HTTPException(status_code=403, detail="No access to this instance")

    return current_user


# GET ROOT IDS FOR TREE NODES


async def get_type_root_id(type_id: int, session: AsyncSession) -> int:
    type_obj = await get_type(session, type_id)
    if not type_obj:
        raise HTTPException(status_code=404, detail="Type not found")
    return type_obj.root_id

async def get_object_root_id(object_id: int, session: AsyncSession) -> int:
    object_obj = await get_object(session, object_id)
    if not object_obj:
        raise HTTPException(status_code=404, detail="Object not found")
    return object_obj.root_id

async def get_instance_root_id(instance_id: int, session: AsyncSession) -> int:
    instance_obj = await get_instance(session, instance_id)
    if not instance_obj:
        raise HTTPException(status_code=404, detail="Instance not found")
    return instance_obj.root_id
