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


from app.models.auth import UserTypeAccess, User
from app.models.core import Types
from app.schemas.auth import UserTypeAccessCreate, UserTypeAccessUpdate
from app.db.database import get_async_session

from fastapi import Depends, HTTPException, status


async def get_user_type_access(
    session: AsyncSession,
    user_id: Optional[uuid.UUID] = None,
    root_id: Optional[int] = None,
    can_read: Optional[bool] = None,
    can_write: Optional[bool] = None
) -> List[UserTypeAccess]:
    query = select(UserTypeAccess)

    filters = []
    if user_id is not None:
        filters.append(UserTypeAccess.user_id == user_id)
    if root_id is not None:
        filters.append(UserTypeAccess.root_id == root_id)
    if can_read is not None:
        filters.append(UserTypeAccess.can_read == can_read)
    if can_write is not None:
        filters.append(UserTypeAccess.can_write == can_write)

    if filters:
        query = query.where(and_(*filters))

    result = await session.execute(query)
    return list(result.scalars().all())


async def create_user_type_access(
    session: AsyncSession,
    data: UserTypeAccessCreate,
) -> UserTypeAccess:
    user_obj = await session.get(User, data.user_id)
    if not user_obj:
        raise HTTPException(status_code=400, detail="User not found")
    
    type_obj = await session.get(Types, data.root_id)
    if not type_obj:
        raise HTTPException(status_code=400, detail="Type not found")

    existing= await session.scalar(
        select(UserTypeAccess).where(UserTypeAccess.user_id == data.user_id, UserTypeAccess.root_id == data.root_id)
    )
    if existing:
        raise HTTPException(status_code=400, detail="User already has access to this type tree")
    
    user_type_access = UserTypeAccess(user_id=data.user_id, root_id=data.root_id, can_read=data.can_read, can_write=data.can_write)
    session.add(user_type_access)
    await session.commit()
    await session.refresh(user_type_access)
    return user_type_access


async def delete_user_type_access(session: AsyncSession, user_id: uuid.UUID, root_id: int) -> None:
    result = await session.execute(select(UserTypeAccess).where(UserTypeAccess.user_id == user_id, UserTypeAccess.root_id == root_id))
    user_type_access = result.scalar_one_or_none()

    if user_type_access is None:
        raise HTTPException(status_code=404, detail="User Type Access not found")

    await session.delete(user_type_access)
    await session.commit()

async def update_user_type_access(
    session: AsyncSession,
    user_id: uuid.UUID,
    root_id: int,
    data: UserTypeAccessUpdate
) -> UserTypeAccess | None:
    return await DefaultQueries.update_by_filters(
        session=session,
        orm=UserTypeAccess,
        data=data,
        filters={"user_id": user_id, "root_id": root_id}
    )
