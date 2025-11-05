import uuid
from datetime import datetime, timezone
from typing import Callable, Awaitable, Optional, List, Optional

from app.crud.core.default import DefaultQueries

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from sqlalchemy.orm import selectinload
from app.core.security import (
    get_current_user, verify_password, get_password_hash,
    create_access_token, create_refresh_token
)

from app.models.auth import UserRole, User, Role, Permission
from app.schemas.auth import UserRoleCreate, UserRoleOut

from app.db.database import get_async_session

from fastapi import Depends, HTTPException, status


async def get_user_role(
    session: AsyncSession,
    user_id: Optional[uuid.UUID] = None,
    role_id: Optional[int] = None
) -> List[UserRole]:
    query = select(UserRole)

    filters = []
    if user_id is not None:
        filters.append(UserRole.user_id == user_id)
    if role_id is not None:
        filters.append(UserRole.role_id == role_id)

    if filters:
        query = query.where(and_(*filters))

    result = await session.execute(query)
    return list(result.scalars().all())

async def create_user_role(session: AsyncSession, data: UserRoleCreate) -> UserRole:
    user_obj = await session.get(User, data.user_id)
    if not user_obj:
        raise HTTPException(status_code=400, detail="User not found")
    
    role_obj = await session.get(Role, data.role_id)
    if not role_obj:
        raise HTTPException(status_code=400, detail="Role not found")

    existing= await session.scalar(
        select(UserRole).where(UserRole.user_id == data.user_id, UserRole.role_id == data.role_id)
    )
    if existing:
        raise HTTPException(status_code=400, detail="User already has this role")
    
    user_role = UserRole(user_id=data.user_id, role_id=data.role_id)
    session.add(user_role)
    await session.commit()
    await session.refresh(user_role)
    return user_role

async def delete_user_role(session: AsyncSession, user_id: uuid.UUID, role_id: int) -> None:
    result = await session.execute(select(UserRole).where(UserRole.user_id == user_id, UserRole.role_id == role_id))
    user_role = result.scalar_one_or_none()

    if user_role is None:
        raise HTTPException(status_code=404, detail="User Role not found")

    await session.delete(user_role)
    await session.commit()
