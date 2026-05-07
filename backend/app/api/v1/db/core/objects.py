from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from sqlalchemy import select, or_
from sqlalchemy.sql import true, false
from sqlalchemy.orm import selectinload

from app.schemas.core import ObjectsRead, ObjectsCreate, ObjectsUpdate, InstancesRead
import app.crud.core.objects as db_objects
import app.crud.core.instances as db_instances
from app.db.database import get_async_session
from app.crud.auth.auth import require_permission as require_permissions
from app.models.auth import User

from app.crud.auth.auth import require_object_permission, get_object_root_id, _check_object_permission, _check_permission
from app.models.auth import User, Role, Permission, UserObjectAccess, UserTypeAccess, UserRole, RolePermission
from app.core.security import get_current_user
from app.models.core import Objects, Types

from app.logging.deps import LoggerInterface, LogCallable 

from typing import List
from datetime import datetime
from app.core.query_builder import QueryBuilder
from app.core.search_config import SEARCH_CONFIG

router = APIRouter(prefix="/objects", tags=["DB: Core: Objects"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


@router.get("/", response_model=list[ObjectsRead])
async def read_objects(
    session: AsyncSession = Depends(get_async_session),
    # Фильтры
    name: Optional[str] = Query(None),
    name__like: Optional[str] = Query(None),
    name__in: Optional[List[str]] = Query(None),
    name__sort: Optional[str] = Query(None, pattern="^(asc|desc)$"),

    type_id: Optional[int] = Query(None),
    type_id__in: Optional[List[int]] = Query(None),
    type_id__gt: Optional[int] = Query(None),
    type_id__lt: Optional[int] = Query(None),
    type_id__gte: Optional[int] = Query(None),
    type_id__lte: Optional[int] = Query(None),

    parent_id: Optional[int] = Query(None),
    parent_id__in: Optional[List[int]] = Query(None),
    parent_id__gt: Optional[int] = Query(None),
    parent_id__lt: Optional[int] = Query(None),
    parent_id__gte: Optional[int] = Query(None),
    parent_id__lte: Optional[int] = Query(None),

    root_id: Optional[int] = Query(None),
    root_id__in: Optional[List[int]] = Query(None),
    root_id__gt: Optional[int] = Query(None),
    root_id__lt: Optional[int] = Query(None),
    root_id__gte: Optional[int] = Query(None),
    root_id__lte: Optional[int] = Query(None),

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

    id: Optional[int] = Query(None),
    id__in: Optional[List[int]] = Query(None),
    id__gt: Optional[int] = Query(None),
    id__lt: Optional[int] = Query(None),
    id__gte: Optional[int] = Query(None),
    id__lte: Optional[int] = Query(None),
    id__sort: Optional[str] = Query(None, pattern="^(asc|desc)$"),
    
    limit: Optional[int] = Query(None, ge=1, le=1000),
    
    current_user: User = Depends(get_current_user),
    log: LogCallable = Depends(LoggerInterface("objects"))
):
    params = {
        "name": name,
        "name__like": name__like,
        "name__in": name__in,
        "name__sort": name__sort,
        "type_id": type_id,
        "type_id__in": type_id__in,
        "type_id__gt": type_id__gt,
        "type_id__lt": type_id__lt,
        "type_id__gte": type_id__gte,
        "type_id__lte": type_id__lte,
        "parent_id": parent_id,
        "parent_id__in": parent_id__in,
        "parent_id__gt": parent_id__gt,
        "parent_id__lt": parent_id__lt,
        "parent_id__gte": parent_id__gte,
        "parent_id__lte": parent_id__lte,
        "root_id": root_id,
        "root_id__in": root_id__in,
        "root_id__gt": root_id__gt,
        "root_id__lt": root_id__lt,
        "root_id__gte": root_id__gte,
        "root_id__lte": root_id__lte,
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
        "id": id,
        "id__in": id__in,
        "id__gt": id__gt,
        "id__lt": id__lt,
        "id__gte": id__gte,
        "id__lte": id__lte,
        "id__sort": id__sort,
    }
    
    QueryBuilder.validate_params(Objects, params, SEARCH_CONFIG[Objects])
    filters = QueryBuilder.parse_query_params(params)
    
     # Use cached permissions from get_current_user()
    user_perms = current_user._permissions if hasattr(current_user, '_permissions') else set()
    has_super_permission = "SUPER_PERMISSION" in user_perms

    # Build query
    query = select(Objects)
    query = QueryBuilder.apply_filters(query, Objects, filters)
    query = QueryBuilder.apply_sorting(query, Objects, filters)

    # Apply access control
    if not has_super_permission:
        # Single UNION ALL query to fetch all allowed root_ids at once
        from sqlalchemy import union_all

        result_access = await session.execute(
            union_all(
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

        query = query.join(Types, Objects.type_id == Types.id)
        query = query.where(
            or_(
                Objects.root_id.in_(allowed_roots),
                Types.root_id.in_(allowed_roots)
            )
        )

    query = QueryBuilder.apply_limit(query, limit)

    result = await session.execute(query)
    objects = result.scalars().all()
    
    try:
        await log(action="read_objects")
    except Exception:
        pass
    
    return objects

@router.get("/{object_id}", response_model=ObjectsRead)
async def read_object(
    object_id: int,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(require_object_permission(write=False)),
    log: LogCallable = Depends(LoggerInterface("objects"))
):
    obj = await db_objects.get_object(session, object_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Object not found")
    await log(action="read_object", details={"object_id": object_id})
    return obj

@router.get("/{object_id}/subtree", response_model=list[ObjectsRead])
async def read_object_subtree(
    object_id: int,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(require_object_permission(write=False)),
    log: LogCallable = Depends(LoggerInterface("objects"))
):
    obj = await db_objects.get_object(session, object_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Object not found")

    subtree = await db_objects.get_object_subtree(session, obj.id)
    await log(action="read_object_subtree", details={"object_id": object_id})
    return subtree


@router.get("/{object_id}/ancestors", response_model=list[ObjectsRead])
async def read_object_ancestors(
    object_id: int,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(require_object_permission(write=False)),
    log: LogCallable = Depends(LoggerInterface("objects"))
):
    obj = await db_objects.get_object(session, object_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Object not found")

    ancestors = await db_objects.get_object_ancestors(session, object_id)
    await log(action="read_object_ancestors", details={"object_id": object_id})
    return ancestors


@router.patch("/{object_id}/move", response_model=ObjectsRead)
async def move_object(
    object_id: int,
    new_parent_id: int = Query(...),
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(require_object_permission(write=True)),
    log: LogCallable = Depends(LoggerInterface("objects"))
):
    moved = await db_objects.move_object(session, object_id, new_parent_id, current_user.id)
    await log(action="move_object", details={
        "object_id": object_id,
        "new_parent_id": new_parent_id
    })
    return moved


@router.post("/", response_model=ObjectsCreate)
async def add_object(
    data: ObjectsCreate,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user),
    log: LogCallable = Depends(LoggerInterface("objects")) 
):
    if data.parent_id is None:
        await _check_permission(current_user, session, "create_new_object")
    else:
        await _check_object_permission(session, current_user, data.parent_id, write=True)

    new_object = await db_objects.create_object(session, data, current_user.id)
    
    await log(
        action="add_object",
        details={
            "object_id": new_object.id,
            "type_id": data.type_id,
            "parent_id": data.parent_id
        }
    )
    return new_object

@router.delete("/{object_id}", status_code=204)
async def delete_objects(
    object_id: int,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(require_object_permission(write=True)),
    log: LogCallable = Depends(LoggerInterface("objects")) 
):
    await db_objects.delete_object(session, object_id, current_user.id)
    await log(action="delete_object", details={"object_id": object_id}) 


@router.post("/{object_id}/instance")
async def create_instance_from_root_object(
    object_id: int,     
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(require_object_permission(write=True)),
    log: LogCallable = Depends(LoggerInterface("objects")) 
):
    root_instance = await db_instances.create_instance_from_object_tree(session, object_id, current_user.id)
    if root_instance is None:
        raise HTTPException(status_code=422, detail="Something went wrong")
    await log(
        action="create_instance",
        details={
            "object_id": object_id,
            "instance_id": root_instance.id
        }
    )
    return root_instance


@router.patch("/{object_id}")
async def update_object(
    object_id: int,
    data: ObjectsUpdate,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(require_object_permission(write=True)),
    log: LogCallable = Depends(LoggerInterface("objects"))
):
    updated_object = await db_objects.update_object(session, object_id, data, current_user.id)
    if not updated_object:
        raise HTTPException(
            status_code=404,
            detail="Объект не найден"
        )
    await log( 
        action="update_object",
        details={
            "object_id": object_id,
            "updated_fields": data.model_dump(exclude_unset=True)
        }
    )
    return updated_object
