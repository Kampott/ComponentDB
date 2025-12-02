from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from sqlalchemy import select, or_
from sqlalchemy.sql import true, false
from sqlalchemy.orm import selectinload

from app.schemas.core import TypesRead, TypesCreate, TypesUpdate
import app.crud.core.types as db
from app.db.database import get_async_session

from app.crud.auth.auth import require_permission as require_permissions
from app.models.auth import User

from app.crud.auth.auth import _check_permission,require_type_permission, get_type_root_id, _check_type_permission
from app.models.auth import User, Role, Permission, UserTypeAccess, UserRole, RolePermission
from app.core.security import get_current_user
from app.models.core import Types

router = APIRouter(prefix="/types", tags=["DB: Core: Types"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

@router.get("/", response_model=list[TypesRead])
async def read_types(
    session: AsyncSession = Depends(get_async_session),
    name: Optional[str] = Query(None),
    parent_id: Optional[int] = Query(None),
    root_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user)
):
    # Fetch user permissions
    result_user = await session.execute(
        select(User)
        .where(User.id == current_user.id)
        .options(selectinload(User.roles).selectinload(Role.permissions))
    )
    user = result_user.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    user_perms = {perm.name for role in user.roles for perm in role.permissions}
    has_super_permission = "SUPER_PERMISSION" in user_perms

    if not has_super_permission:
        # Fetch allowed root_ids for types with can_read=True
        result_type = await session.execute(
            select(UserTypeAccess.root_id)
            .where(
                UserTypeAccess.user_id == current_user.id,
                UserTypeAccess.can_read.is_(True)
            )
        )
        allowed_type_roots = [row[0] for row in result_type.all()]

    # Build the query
    query = select(Types)

    if name:
        query = query.where(Types.name.ilike(f"%{name}%"))
    if root_id:
        query = query.where(Types.root_id == root_id)
    if parent_id:
        query = query.where(Types.parent_id == parent_id)

    if not has_super_permission:
        query = query.where(
            Types.root_id.in_(allowed_type_roots) if allowed_type_roots else false()
        )

    result = await session.execute(query)
    types = result.scalars().all()
    return types


@router.get("/{type_id}", response_model=TypesRead)
async def read_type(
    type_id: int,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(require_type_permission(write=False))
):
    type_obj = await db.get_type(session, type_id)
    if not type_obj:
        raise HTTPException(status_code=404, detail="Type not found")
    return type_obj


@router.post("/", response_model=TypesCreate)
async def add_type(
    data: TypesCreate,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)
):
    if data.parent_id is None:
        await _check_permission(current_user, session, "create_new_type")
    else:
        await _check_type_permission(session, current_user, data.parent_id, write=True)

    return await db.create_type(session, data)


@router.delete("/{type_id}", status_code=204)
async def delete_types(
    type_id: int,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(require_type_permission(write=True))
):
    await db.delete_type(session, type_id)


@router.patch("/{type_id}")
async def update_type(
    type_id: int,
    data: TypesUpdate,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(require_type_permission(write=True))
) -> TypesRead:
    updated_type: TypesRead | None = await db.update_type(session, type_id, data)
    if not updated_type:
        raise HTTPException(
            status_code=404,
            detail="Тип не найден"
        )
    return updated_type