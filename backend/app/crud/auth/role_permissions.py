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

from app.models.auth import RolePermission
from app.schemas.auth import RolePermissionCreate, RolePermissionOut

from app.db.database import get_async_session

from fastapi import Depends, HTTPException, status

async def get_role_permission(
    session: AsyncSession,
    role_id: Optional[int] = None,
    permission_id: Optional[int] = None
) -> List[RolePermission]:
    query = select(RolePermission)

    filters = []
    if role_id is not None:
        filters.append(RolePermission.role_id == role_id)
    if permission_id is not None:
        filters.append(RolePermission.permission_id == permission_id)

    if filters:
        query = query.where(and_(*filters))

    result = await session.execute(query)
    return list(result.scalars().all())

async def create_role_permission(session: AsyncSession, data: RolePermissionCreate) -> RolePermission:
    role_obj = await session.get(Role, data.role_id)
    if not role_obj:
        raise HTTPException(status_code=400, detail="Role not found")
    
    permission_obj = await session.get(Permission, data.permission_id)
    if not permission_obj:
        raise HTTPException(status_code=400, detail="Permission not found")

    existing= await session.scalar(
        select(RolePermission).where(RolePermission.permission_id == data.permission_id, RolePermission.role_id == data.role_id)
    )
    if existing:
        raise HTTPException(status_code=400, detail="Role already has this permission")
    
    role_permission = RolePermission(role_id=data.role_id, permission_id=data.permission_id)
    session.add(role_permission)
    await session.commit()
    await session.refresh(role_permission)
    return role_permission


async def delete_role_permission(session: AsyncSession, role_id: int, permission_id: int) -> None:
    result = await session.execute(select(RolePermission).where(RolePermission.permission_id == permission_id, RolePermission.role_id == role_id))
    role_permission = result.scalar_one_or_none()

    if role_permission is None:
        raise HTTPException(status_code=404, detail="Role Permission not found")

    await session.delete(role_permission)
    await session.commit()
