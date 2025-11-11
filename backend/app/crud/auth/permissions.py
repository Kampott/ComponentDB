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


from app.models.auth import Permission
from app.schemas.auth import PermissionCreate, PermissionOut, RoleCreate, RoleOut, UserRoleCreate, RolePermissionCreate, PermissionUpdate, RoleUpdate
from app.db.database import get_async_session

from fastapi import Depends, HTTPException, status


#Permissions

async def get_permissions(
    session: AsyncSession,
    name: Optional[str] = None,
    description: Optional[str] = None
) -> List[Permission]:
    query = select(Permission)

    filters = []
    if name is not None:
        filters.append(Permission.name == name)
    if description is not None:
        filters.append(Permission.description == description)

    if filters:
        query = query.where(and_(*filters))

    result = await session.execute(query)
    return list(result.scalars().all())

async def get_permission(session: AsyncSession, permission_id: int) -> Optional[Permission]:
    result = await session.execute(select(Permission).where(Permission.id == permission_id))
    return result.scalar_one_or_none()


async def create_permission(session: AsyncSession, permission_in: PermissionCreate) -> Permission:
    permission = Permission(name=permission_in.name, description=permission_in.description)
    session.add(permission)
    await session.commit()
    await session.refresh(permission)
    return permission


async def delete_permission(session: AsyncSession, permission_id: int) -> None:
    result = await session.execute(select(Permission).where(Permission.id == permission_id))
    perm = result.scalar_one_or_none()

    if perm is None:
        raise HTTPException(status_code=404, detail="Permission not found")

    await session.delete(perm)
    await session.commit()

async def update_permission(session: AsyncSession, permission_id: int, data: PermissionUpdate) -> Permission | None:
    return await DefaultQueries.update(session, Permission, permission_id, data)




