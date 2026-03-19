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
    name__sort: Optional[str] = Query(None, regex="^(asc|desc)$"),
    
    object_id: Optional[int] = Query(None),
    object_id__in: Optional[List[int]] = Query(None),
    object_id__gte: Optional[int] = Query(None),
    object_id__lte: Optional[int] = Query(None),
    
    root_id: Optional[int] = Query(None),
    root_id__in: Optional[List[int]] = Query(None),
    
    parent_id: Optional[int] = Query(None),
    parent_id__in: Optional[List[int]] = Query(None),
    
    is_active: Optional[bool] = Query(None),
    
    id: Optional[int] = Query(None),
    id__in: Optional[List[int]] = Query(None),
    id__gte: Optional[int] = Query(None),
    id__lte: Optional[int] = Query(None),
    id__sort: Optional[str] = Query(None, regex="^(asc|desc)$"),
    
    current_user: User = Depends(get_current_user),
    log: LogCallable = Depends(LoggerInterface("instances"))
):
    params = {
        "name": name,
        "name__like": name__like,
        "name__sort": name__sort,
        "object_id": object_id,
        "object_id__in": object_id__in,
        "object_id__gte": object_id__gte,
        "object_id__lte": object_id__lte,
        "root_id": root_id,
        "root_id__in": root_id__in,
        "parent_id": parent_id,
        "parent_id__in": parent_id__in,
        "is_active": is_active,
        "id": id,
        "id__in": id__in,
        "id__gte": id__gte,
        "id__lte": id__lte,
        "id__sort": id__sort,
    }
    
    QueryBuilder.validate_params(Instances, params, SEARCH_CONFIG[Instances])
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
    query = select(Instances)
    query = QueryBuilder.apply_filters(query, Instances, filters)
    query = QueryBuilder.apply_sorting(query, Instances, filters)

    # Apply access control
    if not has_super_permission:
        # Fetch allowed root_ids for each level with can_read=True
        result_instance = await session.execute(
            select(UserInstanceAccess.root_id)
            .where(
                UserInstanceAccess.user_id == current_user.id,
                UserInstanceAccess.can_read.is_(True)
            )
        )
        allowed_instance_roots = [row[0] for row in result_instance.all()]

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
        
        query = query.join(Objects, Instances.object_id == Objects.id)
        query = query.join(Types, Objects.type_id == Types.id)
        query = query.where(
            or_(
                Instances.root_id.in_(allowed_instance_roots) if allowed_instance_roots else false(),
                Objects.root_id.in_(allowed_object_roots) if allowed_object_roots else false(),
                Types.root_id.in_(allowed_type_roots) if allowed_type_roots else false()
            )
        )

    result = await session.execute(query)
    instances = result.scalars().all()
    
    try:
        await log(action="read_instances")
    except Exception:
        pass
    
    return instances


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

    new_instance = await db.create_instance(session, data)
    
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
    await db.delete_instance(session, instance_id)
    await log(action="delete_instance", details={"instance_id": instance_id})


@router.patch("/{instance_id}", response_model=InstancesRead)
async def update_instance(
    instance_id: int,
    data: InstancesUpdate,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(require_instance_permission(write=True)),
    log: LogCallable = Depends(LoggerInterface("instances")) 
):
    updated_instance: InstancesRead | None = await db.update_instance(session, instance_id, data)
    if not updated_instance:
        raise HTTPException(
            status_code=404,
            detail="Экземпляр не найден"
        )
    details = {"instance_id": instance_id}
    if data.name is not None:
        details["name"] = data.name
    if data.is_active is not None:
        details["is_active"] = data.is_active
    
    await log(action="update_instance", details=details)
    return updated_instance

