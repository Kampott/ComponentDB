from typing import Optional, List
from app.core.query_builder import QueryBuilder

import app.crud.core.types as db
from app.core.security import get_current_user
from app.crud.auth.auth import (
    _check_permission,
    _check_type_permission,
    require_type_permission,
)
from app.db.database import get_async_session
from app.logging.deps import LogCallable, LoggerInterface
from app.models.auth import Role, User, UserTypeAccess
from app.models.core import Types
from app.models.events import EventTypesTypes
from app.schemas.core import TypesCreate, TypesRead, TypesUpdate
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlalchemy.sql import false
from app.core.search_config import SEARCH_CONFIG



router = APIRouter(prefix="/types", tags=["DB: Core: Types"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")



@router.get("/", response_model=list[TypesRead])
async def read_types(
    session: AsyncSession = Depends(get_async_session),
    # Базовые фильтры
    name: Optional[str] = Query(None),
    name__like: Optional[str] = Query(None),
    name__sort: Optional[str] = Query(None, pattern="^(asc|desc)$"),

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
    
    # Специальный фильтр для event_type
    event_type_id: Optional[int] = Query(None),
    
    limit: Optional[int] = Query(None, ge=1, le=1000),
    
    current_user: User = Depends(get_current_user),
    log: LogCallable = Depends(LoggerInterface("types"))
):
    # Собираем все параметры
    params = {
        "name": name,
        "name__like": name__like,
        "name__sort": name__sort,
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
    
    # Валидируем параметры согласно конфигурации
    QueryBuilder.validate_params(Types, params, SEARCH_CONFIG[Types])
    
    # Парсим параметры
    filters = QueryBuilder.parse_query_params(params)
    
     # Use cached permissions from get_current_user()
    user_perms = current_user._permissions if hasattr(current_user, '_permissions') else set()
    has_super_permission = "SUPER_PERMISSION" in user_perms

    # Строим базовый запрос
    query = select(Types)
    
    # Применяем фильтры через QueryBuilder
    query = QueryBuilder.apply_filters(query, Types, filters)
    query = QueryBuilder.apply_sorting(query, Types, filters)
    
    # Специальный фильтр для event_type_id (не через QueryBuilder)
    if event_type_id is not None:
        query = query.join(
            EventTypesTypes,
            Types.id == EventTypesTypes.type_id,
        ).where(EventTypesTypes.event_type_id == event_type_id)
    
    # Применяем контроль доступа
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
        
        query = query.where(
            Types.root_id.in_(allowed_type_roots) if allowed_type_roots else false()
        )

    query = QueryBuilder.apply_limit(query, limit)

    # Выполняем запрос
    result = await session.execute(query)
    types = result.scalars().all()

    try:
        await log(action="read_types")
    except Exception:
        pass
    
    return types


@router.get("/{type_id}", response_model=TypesRead)
async def read_type(
    type_id: int,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(require_type_permission(write=False)),
    log: LogCallable = Depends(LoggerInterface("types"))
):
    type_obj = await db.get_type(session, type_id)
    if not type_obj:
        raise HTTPException(status_code=404, detail="Type not found")

    await log(action="read_type", details={
        "type_id": type_id
    })
    return type_obj

@router.get("/{type_id}/subtree", response_model=list[TypesRead])
async def read_type_subtree(
    type_id: int,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(require_type_permission(write=False)),
    log: LogCallable = Depends(LoggerInterface("types"))
):
    type_obj = await db.get_type(session, type_id)
    if not type_obj:
        raise HTTPException(status_code=404, detail="Type not found")

    subtree = await db.get_type_subtree(session, type_obj.id)
    await log(action="read_type_subtree", details={"type_id": type_id})
    return subtree


@router.get("/{type_id}/ancestors", response_model=list[TypesRead])
async def read_type_ancestors(
    type_id: int,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(require_type_permission(write=False)),
    log: LogCallable = Depends(LoggerInterface("types"))
):
    type_obj = await db.get_type(session, type_id)
    if not type_obj:
        raise HTTPException(status_code=404, detail="Type not found")

    ancestors = await db.get_type_ancestors(session, type_id)
    await log(action="read_type_ancestors", details={"type_id": type_id})
    return ancestors


@router.patch("/{type_id}/move", response_model=TypesRead)
async def move_type(
    type_id: int,
    new_parent_id: int = Query(...),
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(require_type_permission(write=True)),
    log: LogCallable = Depends(LoggerInterface("types"))
):
    moved = await db.move_type(session, type_id, new_parent_id, current_user.id)
    await log(action="move_type", details={
        "type_id": type_id,
        "new_parent_id": new_parent_id
    })
    return moved

@router.post("/", response_model=TypesCreate)
async def add_type(
    data: TypesCreate,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user),
    log: LogCallable = Depends(LoggerInterface("types"))
):
    if data.parent_id is None:
        await _check_permission(current_user, session, "create_new_type")
    else:
        await _check_type_permission(session, current_user, data.parent_id, write=True)

    new_type = await db.create_type(session, data, current_user.id)
    
    await log(
        action="add_type",
        details={
            "id": new_type.id,
            "name": data.name,
            "parent_id": data.parent_id
        }
    )

    return new_type

@router.delete("/{type_id}", status_code=204)
async def delete_types(
    type_id: int,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(require_type_permission(write=True)),
    log: LogCallable = Depends(LoggerInterface("types"))
):
    await db.delete_type(session, type_id, current_user.id)
    await log(
        action="delete_types",
        details={
            "type_id": type_id
        }
    ) 


@router.patch("/{type_id}")
async def update_type(
    type_id: int,
    data: TypesUpdate,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(require_type_permission(write=True)),
    log: LogCallable = Depends(LoggerInterface("types"))
):
    updated_type = await db.update_type(session, type_id, data, current_user.id)
    if not updated_type:
        raise HTTPException(
            status_code=404,
            detail="Тип не найден"
        )
    await log(
        action="update",
        details=
        {
            "type_id": type_id,
            "name": data.name,
        }
    )
    return updated_type
