from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

import app.crud.events.replacements as db
from app.core.security import get_current_user
from app.crud.auth.auth import require_permission as require_permissions
from app.crud.auth.auth import _get_instance_object_type_roots, _check_access_with_union_all
from app.db.database import get_async_session
from app.logging.deps import LogCallable, LoggerInterface
from app.models.auth import (
    Role,
    User,
    UserInstanceAccess,
    UserObjectAccess,
    UserTypeAccess,
)
from app.models.events import Events, Replacements
from app.schemas.events import ReplacementsCreate, ReplacementsRead

from typing import List
from datetime import datetime
from app.core.query_builder import QueryBuilder
from app.core.search_config import SEARCH_CONFIG

router = APIRouter(prefix="/replacements", tags=["DB: Events: Replacements"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


async def _check_instance_write_access(
    session: AsyncSession,
    current_user: User,
    instance_id: int,
    has_super_permission: bool,
) -> bool:
    if has_super_permission:
        return True

    # Single JOIN query to get instance + object + type root_ids
    instance_root_id, object_root_id, type_root_id = await _get_instance_object_type_roots(
        session, instance_id
    )

    if instance_root_id is None:
        return False

    # Single UNION ALL query to check access at any level
    return await _check_access_with_union_all(
        session,
        current_user.id,
        instance_root_id,
        object_root_id,
        type_root_id,
        write=True,
    )


async def _load_user_with_roles(
    session: AsyncSession,
    current_user: User,
) -> tuple[User, bool]:
    result_user = await session.execute(
        select(User)
        .where(User.id == current_user.id)
        .options(selectinload(User.roles).selectinload(Role.permissions))
    )
    user = result_user.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    user_perms = {perm.name for role in user.roles for perm in role.permissions}
    return user, "SUPER_PERMISSION" in user_perms


@router.get("/", response_model=list[ReplacementsRead])
async def read_replacements(
    session: AsyncSession = Depends(get_async_session),
    # Фильтры
    event_id: Optional[int] = Query(None),
    event_id__in: Optional[List[int]] = Query(None),
    event_id__gt: Optional[int] = Query(None),
    event_id__lt: Optional[int] = Query(None),
    event_id__gte: Optional[int] = Query(None),
    event_id__lte: Optional[int] = Query(None),
    
    new_instance_id: Optional[int] = Query(None),
    new_instance_id__in: Optional[List[int]] = Query(None),
    new_instance_id__gt: Optional[int] = Query(None),
    new_instance_id__lt: Optional[int] = Query(None),
    new_instance_id__gte: Optional[int] = Query(None),
    new_instance_id__lte: Optional[int] = Query(None),
    
    limit: Optional[int] = Query(None, ge=1, le=1000),
    
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permissions("read_replacements")),
    log: LogCallable = Depends(LoggerInterface("replacements"))
):
    params = {
        "event_id": event_id,
        "event_id__in": event_id__in,
        "event_id__gt": event_id__gt,
        "event_id__lt": event_id__lt,
        "event_id__gte": event_id__gte,
        "event_id__lte": event_id__lte,
        "new_instance_id": new_instance_id,
        "new_instance_id__in": new_instance_id__in,
        "new_instance_id__gt": new_instance_id__gt,
        "new_instance_id__lt": new_instance_id__lt,
        "new_instance_id__gte": new_instance_id__gte,
        "new_instance_id__lte": new_instance_id__lte,
    }
    
    QueryBuilder.validate_params(Replacements, params, SEARCH_CONFIG[Replacements])
    filters = QueryBuilder.parse_query_params(params)
    
    query = select(Replacements)
    query = QueryBuilder.apply_filters(query, Replacements, filters)
    query = QueryBuilder.apply_sorting(query, Replacements, filters)
    query = QueryBuilder.apply_limit(query, limit)
    
    result = await session.execute(query)
    replacements = result.scalars().all()

    try:
        await log(action="read_replacements")
    except Exception:
        pass

    return replacements


@router.get("/{event_id}/{new_instance_id}", response_model=ReplacementsRead)
async def read_replacement(
    event_id: int,
    new_instance_id: int,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permissions("read_replacements")),
    log: LogCallable = Depends(LoggerInterface("replacements")),
):
    replacement = await db.get_replacement(session, event_id, new_instance_id)
    if not replacement:
        raise HTTPException(status_code=404, detail="Replacement not found")

    await log(
        action="read_replacement",
        details={"event_id": event_id, "new_instance_id": new_instance_id},
    )
    return replacement


@router.post("/", response_model=ReplacementsRead)
async def create_replacement(
    data: ReplacementsCreate,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permissions("create_replacements")),
    log: LogCallable = Depends(LoggerInterface("replacements")),
):
    loaded_user, has_super_permission = await _load_user_with_roles(session, current_user)
    del loaded_user

    event_model, replaced_instance = await db._get_replaced_instance_from_event(
        session,
        data.event_id,
    )
    del event_model

    has_replaced_access = await _check_instance_write_access(
        session,
        current_user,
        replaced_instance.id,
        has_super_permission,
    )
    if not has_replaced_access:
        raise HTTPException(
            status_code=403,
            detail="Write access denied to the instance being replaced",
        )

    has_replacement_access = await _check_instance_write_access(
        session,
        current_user,
        data.new_instance_id,
        has_super_permission,
    )
    if not has_replacement_access:
        raise HTTPException(
            status_code=403,
            detail="Write access denied to the replacement instance",
        )

    new_replacement = await db.create_replacement(session, data)

    await log(
        action="create_replacement",
        details={
            "event_id": data.event_id,
            "new_instance_id": data.new_instance_id,
        },
    )
    return new_replacement


@router.delete("/{event_id}/{new_instance_id}", status_code=204)
async def delete_replacement(
    event_id: int,
    new_instance_id: int,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permissions("delete_replacements")),
    log: LogCallable = Depends(LoggerInterface("replacements")),
):
    replacement = await db.get_replacement(session, event_id, new_instance_id)
    if not replacement:
        raise HTTPException(status_code=404, detail="Replacement not found")

    loaded_user, has_super_permission = await _load_user_with_roles(session, current_user)
    del loaded_user
    event_model, replaced_instance = await db._get_replaced_instance_from_event(session, event_id)
    del event_model

    has_replaced_access = await _check_instance_write_access(
        session,
        current_user,
        replaced_instance.id,
        has_super_permission,
    )
    if not has_replaced_access:
        raise HTTPException(
            status_code=403,
            detail="Write access denied to the replaced instance",
        )

    has_replacement_access = await _check_instance_write_access(
        session,
        current_user,
        new_instance_id,
        has_super_permission,
    )
    if not has_replacement_access:
        raise HTTPException(
            status_code=403,
            detail="Write access denied to the replacement instance",
        )

    await db.delete_replacement(session, event_id, new_instance_id)

    await log(
        action="delete_replacement",
        details={"event_id": event_id, "new_instance_id": new_instance_id},
    )


@router.post("/{event_id}/{new_instance_id}/undo", status_code=200)
async def undo_replacement(
    event_id: int,
    new_instance_id: int,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permissions("create_replacements")),
    log: LogCallable = Depends(LoggerInterface("replacements")),
):
    replacement = await db.get_replacement(session, event_id, new_instance_id)
    if not replacement:
        raise HTTPException(status_code=404, detail="Replacement not found")

    loaded_user, has_super_permission = await _load_user_with_roles(session, current_user)
    del loaded_user
    event_model, replaced_instance = await db._get_replaced_instance_from_event(session, event_id)
    del event_model

    has_replaced_access = await _check_instance_write_access(
        session,
        current_user,
        replaced_instance.id,
        has_super_permission,
    )
    if not has_replaced_access:
        raise HTTPException(
            status_code=403,
            detail="Write access denied to the replaced instance",
        )

    has_replacement_access = await _check_instance_write_access(
        session,
        current_user,
        new_instance_id,
        has_super_permission,
    )
    if not has_replacement_access:
        raise HTTPException(
            status_code=403,
            detail="Write access denied to the replacement instance",
        )

    await db.undo_replacement(session, event_id, new_instance_id)

    await log(
        action="undo_replacement",
        details={"event_id": event_id, "new_instance_id": new_instance_id},
    )
    return {
        "message": "Replacement undone successfully",
        "event_id": event_id,
        "new_instance_id": new_instance_id,
    }
