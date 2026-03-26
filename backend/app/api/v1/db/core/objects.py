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
    name__sort: Optional[str] = Query(None, regex="^(asc|desc)$"),
    
    type_id: Optional[int] = Query(None),
    type_id__in: Optional[List[int]] = Query(None),
    type_id__gte: Optional[int] = Query(None),
    type_id__lte: Optional[int] = Query(None),
    
    parent_id: Optional[int] = Query(None),
    parent_id__in: Optional[List[int]] = Query(None),
    
    root_id: Optional[int] = Query(None),
    root_id__in: Optional[List[int]] = Query(None),
    
    id: Optional[int] = Query(None),
    id__in: Optional[List[int]] = Query(None),
    id__gte: Optional[int] = Query(None),
    id__lte: Optional[int] = Query(None),
    id__sort: Optional[str] = Query(None, regex="^(asc|desc)$"),
    
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
        "type_id__gte": type_id__gte,
        "type_id__lte": type_id__lte,
        "parent_id": parent_id,
        "parent_id__in": parent_id__in,
        "root_id": root_id,
        "root_id__in": root_id__in,
        "id": id,
        "id__in": id__in,
        "id__gte": id__gte,
        "id__lte": id__lte,
        "id__sort": id__sort,
    }
    
    QueryBuilder.validate_params(Objects, params, SEARCH_CONFIG[Objects])
    filters = QueryBuilder.parse_query_params(params)
    
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

    # Build query
    query = select(Objects)
    query = QueryBuilder.apply_filters(query, Objects, filters)
    query = QueryBuilder.apply_sorting(query, Objects, filters)

    # Apply access control
    if not has_super_permission:
        # Fetch allowed root_ids for each level with can_read=True
        result_object = await session.execute(
            select(UserObjectAccess.root_id)
            .where(
                UserObjectAccess.user_id == current_user.id,
                UserObjectAccess.can_read.is_(True)
            )
        )
        allowed_object_roots = [row[0] for row in result_object.all()]

        result_type = await session.execute(
            select(UserTypeAccess.root_id)
            .where(
                UserTypeAccess.user_id == current_user.id,
                UserTypeAccess.can_read.is_(True)
            )
        )
        allowed_type_roots = [row[0] for row in result_type.all()]
        
        query = query.join(Types, Objects.type_id == Types.id)
        query = query.where(
            or_(
                Objects.root_id.in_(allowed_object_roots) if allowed_object_roots else false(),
                Types.root_id.in_(allowed_type_roots) if allowed_type_roots else false()
            )
        )

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

    new_object = await db_objects.create_object(session, data)
    
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
    await db_objects.delete_object(session, object_id)
    await log(action="delete_object", details={"object_id": object_id}) 


@router.post("/{object_id}/instance")
async def create_instance_from_root_object(
    object_id: int,     
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(require_object_permission(write=True)),
    log: LogCallable = Depends(LoggerInterface("objects")) 
) -> InstancesRead: 
    root_instance: InstancesRead | None = await db_instances.create_instance_from_object_tree(session, 
    object_id)
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
) -> ObjectsRead | None:
    updated_object: ObjectsRead | None = await db_objects.update_object(session, object_id, data)
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