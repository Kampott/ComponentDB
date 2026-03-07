from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.schemas.events import ReplacementsRead, ReplacementsCreate
import app.crud.events.replacements as db
from app.db.database import get_async_session
from app.crud.auth.auth import require_permission as require_permissions
from app.models.auth import User, Role, Permission, UserInstanceAccess, UserObjectAccess, UserTypeAccess
from app.models.core import Instances, Objects, Types
from app.models.events import Replacements
from app.core.security import get_current_user
from app.logging.deps import LoggerInterface, LogCallable

router = APIRouter(prefix="/replacements", tags=["DB: Events: Replacements"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


async def _check_instance_write_access(
    session: AsyncSession,
    current_user: User,
    instance_id: int,
    has_super_permission: bool
) -> bool:
    """Helper to check if user has write access to an instance"""
    if has_super_permission:
        return True
    
    # Get instance with its hierarchy
    instance_result = await session.execute(
        select(Instances).where(Instances.id == instance_id)
    )
    instance = instance_result.scalar_one_or_none()
    
    if not instance:
        return False

    # Get object and type roots
    object_result = await session.execute(
        select(Objects).where(Objects.id == instance.object_id)
    )
    obj = object_result.scalar_one_or_none()
    
    type_result = await session.execute(
        select(Types).where(Types.id == obj.type_id)
    )
    type_ = type_result.scalar_one_or_none()

    # Check instance write access
    instance_access = await session.execute(
        select(UserInstanceAccess)
        .where(
            UserInstanceAccess.user_id == current_user.id,
            UserInstanceAccess.root_id == instance.root_id,
            UserInstanceAccess.can_write.is_(True)
        )
    )
    if instance_access.scalar_one_or_none():
        return True
    
    # Check object write access
    object_access = await session.execute(
        select(UserObjectAccess)
        .where(
            UserObjectAccess.user_id == current_user.id,
            UserObjectAccess.root_id == obj.root_id,
            UserObjectAccess.can_write.is_(True)
        )
    )
    if object_access.scalar_one_or_none():
        return True
    
    # Check type write access
    type_access = await session.execute(
        select(UserTypeAccess)
        .where(
            UserTypeAccess.user_id == current_user.id,
            UserTypeAccess.root_id == type_.root_id,
            UserTypeAccess.can_write.is_(True)
        )
    )
    if type_access.scalar_one_or_none():
        return True
    
    return False


@router.get("/", response_model=list[ReplacementsRead])
async def read_replacements(
    session: AsyncSession = Depends(get_async_session),
    event_id: Optional[int] = Query(None),
    replaced_id: Optional[int] = Query(None),
    replacement_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permissions("read_replacements")),
    log: LogCallable = Depends(LoggerInterface("replacements"))
):
    replacements = await db.get_replacements(session, event_id, replaced_id, replacement_id)
    
    try:
        await log(action="read_replacements")
    except Exception:
        pass
    
    return replacements


@router.get("/{event_id}/{replaced_id}/{replacement_id}", response_model=ReplacementsRead)
async def read_replacement(
    event_id: int,
    replaced_id: int,
    replacement_id: int,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permissions("read_replacements")),
    log: LogCallable = Depends(LoggerInterface("replacements"))
):
    replacement = await db.get_replacement(session, event_id, replaced_id, replacement_id)
    if not replacement:
        raise HTTPException(status_code=404, detail="Replacement not found")
    
    await log(
        action="read_replacement",
        details={
            "event_id": event_id,
            "replaced_id": replaced_id,
            "replacement_id": replacement_id
        }
    )
    return replacement


@router.post("/", response_model=ReplacementsRead)
async def create_replacement(
    data: ReplacementsCreate,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permissions("create_replacements")),
    log: LogCallable = Depends(LoggerInterface("replacements"))
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

    # Check WRITE access to BOTH replaced and replacement instances
    has_replaced_access = await _check_instance_write_access(
        session, current_user, data.replaced_id, has_super_permission
    )
    
    if not has_replaced_access:
        raise HTTPException(
            status_code=403,
            detail="Write access denied to the instance being replaced"
        )
    
    has_replacement_access = await _check_instance_write_access(
        session, current_user, data.replacement_id, has_super_permission
    )
    
    if not has_replacement_access:
        raise HTTPException(
            status_code=403,
            detail="Write access denied to the replacement instance"
        )

    # Create the replacement (this will deactivate the replaced tree)
    new_replacement = await db.create_replacement(session, data)

    await log(
        action="create_replacement",
        details={
            "event_id": data.event_id,
            "replaced_id": data.replaced_id,
            "replacement_id": data.replacement_id
        }
    )
    return new_replacement


@router.delete("/{event_id}/{replaced_id}/{replacement_id}", status_code=204)
async def delete_replacement(
    event_id: int,
    replaced_id: int,
    replacement_id: int,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permissions("delete_replacements")),
    log: LogCallable = Depends(LoggerInterface("replacements"))
):
    # Check if replacement exists and get it
    replacement = await db.get_replacement(session, event_id, replaced_id, replacement_id)
    if not replacement:
        raise HTTPException(status_code=404, detail="Replacement not found")

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

    # Check WRITE access to both instances
    has_replaced_access = await _check_instance_write_access(
        session, current_user, replaced_id, has_super_permission
    )
    
    if not has_replaced_access:
        raise HTTPException(
            status_code=403,
            detail="Write access denied to the replaced instance"
        )
    
    has_replacement_access = await _check_instance_write_access(
        session, current_user, replacement_id, has_super_permission
    )
    
    if not has_replacement_access:
        raise HTTPException(
            status_code=403,
            detail="Write access denied to the replacement instance"
        )

    await db.delete_replacement(session, event_id, replaced_id, replacement_id)
    
    await log(
        action="delete_replacement",
        details={
            "event_id": event_id,
            "replaced_id": replaced_id,
            "replacement_id": replacement_id
        }
    )

@router.post("/{event_id}/{replaced_id}/{replacement_id}/undo", status_code=200)
async def undo_replacement(
    event_id: int,
    replaced_id: int,
    replacement_id: int,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permissions("create_replacements")),  # Same permission as create
    log: LogCallable = Depends(LoggerInterface("replacements"))
):
    """
    Undo a replacement by reactivating the replaced instance tree and deleting the replacement record.
    Requires the same permissions as creating a replacement.
    """
    # Check if replacement exists
    replacement = await db.get_replacement(session, event_id, replaced_id, replacement_id)
    if not replacement:
        raise HTTPException(status_code=404, detail="Replacement not found")

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

    # Check WRITE access to BOTH replaced and replacement instances
    has_replaced_access = await _check_instance_write_access(
        session, current_user, replaced_id, has_super_permission
    )
    
    if not has_replaced_access:
        raise HTTPException(
            status_code=403,
            detail="Write access denied to the replaced instance"
        )
    
    has_replacement_access = await _check_instance_write_access(
        session, current_user, replacement_id, has_super_permission
    )
    
    if not has_replacement_access:
        raise HTTPException(
            status_code=403,
            detail="Write access denied to the replacement instance"
        )

    # Undo the replacement
    await db.undo_replacement(session, event_id, replaced_id, replacement_id)

    await log(
        action="undo_replacement",
        details={
            "event_id": event_id,
            "replaced_id": replaced_id,
            "replacement_id": replacement_id
        }
    )
    
    return {
        "message": "Replacement undone successfully",
        "replaced_id": replaced_id,
        "replacement_id": replacement_id
    }