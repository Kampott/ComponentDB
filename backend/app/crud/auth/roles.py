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

from app.models.auth import Role
from app.schemas.auth import RoleCreate, RoleOut, RoleUpdate

from app.db.database import get_async_session

from fastapi import Depends, HTTPException, status

#Roles

async def get_roles(
    session: AsyncSession,
    name: Optional[str] = None,
    description: Optional[str] = None
) -> List[Role]:
    query = select(Role)

    filters = []
    if name is not None:
        filters.append(Role.name == name)
    if description is not None:
        filters.append(Role.description == description)

    if filters:
        query = query.where(and_(*filters))

    result = await session.execute(query)
    return list(result.scalars().all())

async def get_role(session: AsyncSession, role_id: int) -> Optional[Role]:
    result = await session.execute(select(Role).where(Role.id == role_id))
    return result.scalar_one_or_none()

async def create_role(session: AsyncSession, role_in: RoleCreate) -> Role:
    role = Role(name=role_in.name, description=role_in.description)
    session.add(role)
    await session.commit()
    await session.refresh(role)
    return role

async def delete_role(session: AsyncSession, role_id: int) -> None:
    result = await session.execute(select(Role).where(Role.id == role_id))
    role = result.scalar_one_or_none()

    if role is None:
        raise HTTPException(status_code=404, detail="Role not found")

    await session.delete(role)
    await session.commit()

async def update_role(session: AsyncSession, role_id: int, data: RoleUpdate) -> Role | None:
    return await DefaultQueries.update(session, Role, role_id, data)