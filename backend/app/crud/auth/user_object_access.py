import uuid
from datetime import datetime, timezone
from typing import Callable, Awaitable, Optional, List

from app.crud.core.default import DefaultQueries

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from sqlalchemy.orm import selectinload
from app.core.security import (
    get_current_user, verify_password, get_password_hash,
    create_access_token, create_refresh_token
)


from app.models.auth import UserObjectAccess, User
from app.models.core import Objects
from app.schemas.auth import UserObjectAccessCreate, UserObjectAccessUpdate
from app.db.database import get_async_session

from fastapi import Depends, HTTPException, status


async def get_user_object_access(
    session: AsyncSession,
    user_id: Optional[uuid.UUID] = None,
    root_id: Optional[int] = None,
    can_read: Optional[bool] = None,
    can_write: Optional[bool] = None
) -> List[UserObjectAccess]:
    query = select(UserObjectAccess)

    filters = []
    if user_id is not None:
        filters.append(UserObjectAccess.user_id == user_id)
    if root_id is not None:
        filters.append(UserObjectAccess.root_id == root_id)
    if can_read is not None:
        filters.append(UserObjectAccess.can_read == can_read)
    if can_write is not None:
        filters.append(UserObjectAccess.can_write == can_write)

    if filters:
        query = query.where(and_(*filters))

    result = await session.execute(query)
    return list(result.scalars().all())


async def create_user_object_access(
    session: AsyncSession,
    data: UserObjectAccessCreate,
) -> UserObjectAccess:
    user_obj = await session.get(User, data.user_id)
    if not user_obj:
        raise HTTPException(status_code=400, detail="User not found")
    
    object_obj = await session.get(Objects, data.root_id)
    if not object_obj:
        raise HTTPException(status_code=400, detail="Object not found")

    existing= await session.scalar(
        select(UserObjectAccess).where(UserObjectAccess.user_id == data.user_id, UserObjectAccess.root_id == data.root_id)
    )
    if existing:
        raise HTTPException(status_code=400, detail="User already has access to this object tree")
    
    user_object_access = UserObjectAccess(user_id=data.user_id, root_id=data.root_id, can_read=data.can_read, can_write=data.can_write)
    session.add(user_object_access)
    await session.commit()
    await session.refresh(user_object_access)
    return user_object_access


async def delete_user_object_access(session: AsyncSession, user_id: uuid.UUID, root_id: int) -> None:
    result = await session.execute(select(UserObjectAccess).where(UserObjectAccess.user_id == user_id, UserObjectAccess.root_id == root_id))
    user_object_access = result.scalar_one_or_none()

    if user_object_access is None:
        raise HTTPException(status_code=404, detail="User Object Access not found")

    await session.delete(user_object_access)
    await session.commit()

async def update_user_object_access(
    session: AsyncSession,
    user_id: uuid.UUID,
    root_id: int,
    data: UserObjectAccessUpdate
) -> UserObjectAccess | None:
    return await DefaultQueries.update_by_filters(
        session=session,
        orm=UserObjectAccess,
        data=data,
        filters={"user_id": user_id, "root_id": root_id}
    )
