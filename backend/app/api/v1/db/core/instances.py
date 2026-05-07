from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from sqlalchemy import select, or_
from sqlalchemy.sql import true, false
from sqlalchemy.orm import selectinload

from app.schemas.core import InstancesRead, InstancesCreate, InstancesUpdate, InstanceCreated
import app.crud.core.instances as db
from app.crud.core.instances import get_instance
from app.crud.auth.auth import require_instance_permission, get_instance_root_id, _check_instance_permission
from app.db.database import get_async_session

from app.models.core import Instances, Objects, Types

from app.crud.auth.auth import require_permission as require_permissions
from app.crud.auth.auth import _check_permission, require_instance_permission
from app.models.auth import User, Role, Permission, UserInstanceAccess, UserObjectAccess, UserTypeAccess, UserRole, RolePermission
from app.core.security import get_current_user

from app.logging.deps import LoggerInterface, LogCallable

from typing import List
from datetime import datetime
from app.core.query_builder import QueryBuilder
from app.core.search_config import SEARCH_CONFIG

router = APIRouter(prefix="/instances", tags=["DB: Core: Instances"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


@router.get("/", response_model=list[InstancesRead])
async def read_instances(
    session: AsyncSession = Depends(get_async_session),
    # Фильтры
    name: Optional[str] = Query(None),
    name__like: Optional[str] = Query(None),
    name__sort: Optional[str] = Query(None, pattern="^(asc|desc)$"),

    object_id: Optional[int] = Query(None),
    object_id__in: Optional[List[int]] = Query(None),
    object_id__gt: Optional[int] = Query(None),
    object_id__lt: Optional[int] = Query(None),
    object_id__gte: Optional[int] = Query(None),
    object_id__lte: Optional[int] = Query(None),

    root_id: Optional[int] = Query(None),
    root_id__in: Optional[List[int]] = Query(None),
    root_id__gt: Optional[int] = Query(None),
    root_id__lt: Optional[int] = Query(None),
    root_id__gte: Optional[int] = Query(None),
    root_id__lte: Optional[int] = Query(None),

    parent_id: Optional[int] = Query(None),
    parent_id__in: Optional[List[int]] = Query(None),
    parent_id__gt: Optional[int] = Query(None),
    parent_id__lt: Optional[int] = Query(None),
    parent_id__gte: Optional[int] = Query(None),
    parent_id__lte: Optional[int] = Query(None),

    tin: Optional[int] = Query(None),
    tin__in: Optional[List[int]] = Query(None),
    tin__gt: Optional[int] = Query(None),
    tin__lt: Optional[int] = Query(None),
    tin__gte: Optional[int] = Query(None),
    tin__lte: Optional[int] = Query(None),

    tout: Optional[int] = Query(None),
    tout__in: Optional[List[int]] = Query(None),
    tout__gt: Optional[int] = Query(None),
    tout__lt: Optional[int] = Query(None),
    tout__gte: Optional[int] = Query(None),
    tout__lte: Optional[int] = Query(None),

    tree_size: Optional[int] = Query(None),
    tree_size__in: Optional[List[int]] = Query(None),
    tree_size__gt: Optional[int] = Query(None),
    tree_size__lt: Optional[int] = Query(None),
    tree_size__gte: Optional[int] = Query(None),
    tree_size__lte: Optional[int] = Query(None),

    is_active: Optional[bool] = Query(None),

    id: Optional[int] = Query(None),
    id__in: Optional[List[int]] = Query(None),
    id__gt: Optional[int] = Query(None),
    id__lt: Optional[int] = Query(None),
    id__gte: Optional[int] = Query(None),
    id__lte: Optional[int] = Query(None),
    id__sort: Optional[str] = Query(None, pattern="^(asc|desc)$"),
    
    limit: Optional[int] = Query(None, ge=1, le=1000),
    
    current_user: User = Depends(get_current_user),
    log: LogCallable = Depends(LoggerInterface("instances"))
):
    params = {
        "name": name,
        "name__like": name__like,
        "name__sort": name__sort,
        "object_id": object_id,
        "object_id__in": object_id__in,
        "object_id__gt": object_id__gt,
        "object_id__lt": object_id__lt,
        "object_id__gte": object_id__gte,
        "object_id__lte": object_id__lte,
        "root_id": root_id,
        "root_id__in": root_id__in,
        "root_id__gt": root_id__gt,
        "root_id__lt": root_id__lt,
        "root_id__gte": root_id__gte,
        "root_id__lte": root_id__lte,
        "parent_id": parent_id,
        "parent_id__in": parent_id__in,
        "parent_id__gt": parent_id__gt,
        "parent_id__lt": parent_id__lt,
        "parent_id__gte": parent_id__gte,
        "parent_id__lte": parent_id__lte,
        "tin": tin,
        "tin__in": tin__in,
        "tin__gt": tin__gt,
        "tin__lt": tin__lt,
        "tin__gte": tin__gte,
        "tin__lte": tin__lte,
        "tout": tout,
        "tout__in": tout__in,
        "tout__gt": tout__gt,
        "tout__lt": tout__lt,
        "tout__gte": tout__gte,
        "tout__lte": tout__lte,
        "tree_size": tree_size,
        "tree_size__in": tree_size__in,
        "tree_size__gt": tree_size__gt,
        "tree_size__lt": tree_size__lt,
        "tree_size__gte": tree_size__gte,
        "tree_size__lte": tree_size__lte,
        "is_active": is_active,
        "id": id,
        "id__in": id__in,
        "id__gt": id__gt,
        "id__lt": id__lt,
        "id__gte": id__gte,
        "id__lte": id__lte,
        "id__sort": id__sort,
    }
    
    QueryBuilder.validate_params(Instances, params, SEARCH_CONFIG[Instances])
    filters = QueryBuilder.parse_query_params(params)
    
     # Use cached permissions from get_current_user()
    user_perms = current_user._permissions if hasattr(current_user, '_permissions') else set()
    has_super_permission = "SUPER_PERMISSION" in user_perms

    # Build query
    query = select(Instances)
    query = QueryBuilder.apply_filters(query, Instances, filters)
    query = QueryBuilder.apply_sorting(query, Instances, filters)

    # Apply access control
    if not has_super_permission:
        # Single UNION ALL query to fetch all allowed root_ids at once
        from sqlalchemy import union_all

        result_access = await session.execute(
            union_all(
                select(UserInstanceAccess.root_id.label("root_id"))
                .where(
                    UserInstanceAccess.user_id == current_user.id,
                    UserInstanceAccess.can_read.is_(True)
                ),
                select(UserObjectAccess.root_id.label("root_id"))
                .where(
                    UserObjectAccess.user_id == current_user.id,
                    UserObjectAccess.can_read.is_(True)
                ),
                select(UserTypeAccess.root_id.label("root_id"))
                .where(
                    UserTypeAccess.user_id == current_user.id,
                    UserTypeAccess.can_read.is_(True)
                )
            )
        )
        allowed_roots = [row[0] for row in result_access.all()]

        if not allowed_roots:
            return []

        query = query.join(Objects, Instances.object_id == Objects.id)
        query = query.join(Types, Objects.type_id == Types.id)
        query = query.where(
            or_(
                Instances.root_id.in_(allowed_roots),
                Objects.root_id.in_(allowed_roots),
                Types.root_id.in_(allowed_roots)
            )
        )

    query = QueryBuilder.apply_limit(query, limit)

    result = await session.execute(query)
    instances = result.scalars().all()
    
    try:
        await log(action="read_instances")
    except Exception:
        pass
    
    return instances


@router.get("/{instance_id}", response_model=InstancesRead)
async def read_instance(
    instance_id: int,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(require_instance_permission(write=False)),
    log: LogCallable = Depends(LoggerInterface("instances")) 
):
    instance = await db.get_instance(session, instance_id)
    if not instance:
        raise HTTPException(status_code=404, detail="Instance not found")
    
    await log(action="read_instance", details={"instance_id": instance_id})
    return instance

@router.get("/{instance_id}/subtree", response_model=list[InstancesRead])
async def read_instance_subtree(
    instance_id: int,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(require_instance_permission(write=False)),
    log: LogCallable = Depends(LoggerInterface("instances"))
):
    instance = await db.get_instance(session, instance_id)
    if not instance:
        raise HTTPException(status_code=404, detail="Instance not found")

    subtree = await db.get_instance_subtree(session, instance.id)
    await log(action="read_instance_subtree", details={"instance_id": instance_id})
    return subtree


@router.get("/{instance_id}/ancestors", response_model=list[InstancesRead])
async def read_instance_ancestors(
    instance_id: int,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(require_instance_permission(write=False)),
    log: LogCallable = Depends(LoggerInterface("instances"))
):
    instance = await db.get_instance(session, instance_id)
    if not instance:
        raise HTTPException(status_code=404, detail="Instance not found")

    ancestors = await db.get_instance_ancestors(session, instance_id)
    await log(action="read_instance_ancestors", details={"instance_id": instance_id})
    return ancestors


@router.patch("/{instance_id}/move", response_model=InstancesRead)
async def move_instance(
    instance_id: int,
    new_parent_id: int = Query(...),
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(require_instance_permission(write=True)),
    log: LogCallable = Depends(LoggerInterface("instances"))
):
    moved = await db.move_instance(session, instance_id, new_parent_id, current_user.id)
    await log(action="move_instance", details={
        "instance_id": instance_id,
        "new_parent_id": new_parent_id
    })
    return moved


@router.post("/", response_model=InstanceCreated)
async def add_instance(
    data: InstancesCreate,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user),
    log: LogCallable = Depends(LoggerInterface("instances")) 
):
    if data.parent_id is None:
        await _check_permission(current_user, session, "create_new_instance")
    else:
        await _check_instance_permission(session, current_user, data.parent_id, write=True)

    new_instance = await db.create_instance(session, data, current_user.id)
    
    await log(
        action="add_instance",
        details={
            "instance_id": new_instance.id,
            "object_id": data.object_id,
            "parent_id": data.parent_id
        }
    )
    return new_instance




@router.delete("/{instance_id}", status_code=204)
async def delete_instances(
    instance_id: int, 
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(require_instance_permission(write=True)),
    log: LogCallable = Depends(LoggerInterface("instances")) 
):
    await db.delete_instance(session, instance_id, current_user.id)
    await log(action="delete_instance", details={"instance_id": instance_id})


@router.patch("/{instance_id}", response_model=InstancesRead)
async def update_instance(
    instance_id: int,
    data: InstancesUpdate,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(require_instance_permission(write=True)),
    log: LogCallable = Depends(LoggerInterface("instances")) 
):
    updated_instance = await db.update_instance(session, instance_id, data, current_user.id)
    if not updated_instance:
        raise HTTPException(
            status_code=404,
            detail="Экземпляр не найден"
        )
    details: dict[str, object] = {"instance_id": instance_id}
    if data.name is not None:
        details["name"] = data.name
    if data.is_active is not None:
        details["is_active"] = data.is_active
    
    await log(action="update_instance", details=details)
    return updated_instance
