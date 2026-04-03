from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional

from app.schemas.core import PropertyTypesRead, PropertyTypesCreate, PropertyTypesUpdate
import app.crud.core.property_types as db
from app.db.database import get_async_session

from app.crud.auth.auth import require_permission as require_permissions
from app.models.auth import User
from app.models.core import PropertyTypes

from app.logging.deps import LoggerInterface, LogCallable
from app.core.query_builder import QueryBuilder
from app.core.search_config import SEARCH_CONFIG

router = APIRouter(prefix="/property_types", tags=["DB: Core: Property Types"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


@router.get("/", response_model=list[PropertyTypesRead])
async def list_property_types(
    session: AsyncSession = Depends(get_async_session),
    # Фильтры
    type_id: Optional[int] = Query(None),
    type_id__in: Optional[List[int]] = Query(None),
    type_id__gt: Optional[int] = Query(None),
    type_id__lt: Optional[int] = Query(None),
    type_id__gte: Optional[int] = Query(None),
    type_id__lte: Optional[int] = Query(None),
    
    name: Optional[str] = Query(None),
    name__like: Optional[str] = Query(None),
    name__sort: Optional[str] = Query(None, regex="^(asc|desc)$"),
    
    is_static: Optional[bool] = Query(None),
    
    id: Optional[int] = Query(None),
    id__in: Optional[List[int]] = Query(None),
    id__gt: Optional[int] = Query(None),
    id__lt: Optional[int] = Query(None),
    id__gte: Optional[int] = Query(None),
    id__lte: Optional[int] = Query(None),
    id__sort: Optional[str] = Query(None, regex="^(asc|desc)$"),
    
    limit: Optional[int] = Query(None, ge=1, le=1000),
    
    current_user: User = Depends(require_permissions("read_property_types")),
    log: LogCallable = Depends(LoggerInterface("property_types"))
):
    params = {
        "type_id": type_id,
        "type_id__in": type_id__in,
        "type_id__gt": type_id__gt,
        "type_id__lt": type_id__lt,
        "type_id__gte": type_id__gte,
        "type_id__lte": type_id__lte,
        "name": name,
        "name__like": name__like,
        "name__sort": name__sort,
        "is_static": is_static,
        "id": id,
        "id__in": id__in,
        "id__gt": id__gt,
        "id__lt": id__lt,
        "id__gte": id__gte,
        "id__lte": id__lte,
        "id__sort": id__sort,
    }
    
    QueryBuilder.validate_params(PropertyTypes, params, SEARCH_CONFIG[PropertyTypes])
    filters = QueryBuilder.parse_query_params(params)
    
    query = select(PropertyTypes)
    query = QueryBuilder.apply_filters(query, PropertyTypes, filters)
    query = QueryBuilder.apply_sorting(query, PropertyTypes, filters)
    query = QueryBuilder.apply_limit(query, limit)
    
    result = await session.execute(query)
    property_types = result.scalars().all()
    
    try:
        await log(action="read_property_types")
    except Exception:
        pass
    
    return property_types


@router.get("/{property_type_id}", response_model=PropertyTypesRead)
async def read_property_type(property_type_id: int, current_user: User = Depends(require_permissions("read_property_types")), session: AsyncSession = Depends(get_async_session),
    log: LogCallable = Depends(LoggerInterface("property_types"))):
    property_type = await db.get_propertytype(session, property_type_id)
    if not property_type:
        raise HTTPException(status_code=404, detail="Type proprety not found")
    await log(action="read_property_type", details={"property_type_id": property_type_id}) 
    return property_type

@router.post("/", response_model=PropertyTypesCreate)
async def add_property_type(data: PropertyTypesCreate, current_user: User = Depends(require_permissions("create_property_types")), session: AsyncSession = Depends(get_async_session),
    log: LogCallable = Depends(LoggerInterface("property_types"))):
    new_property_type = await db.create_propertytype(session, data)
    
    await log(  # ✅ Add
        action="add_property_type",
        details={
            "property_type_id": new_property_type.id,
            "type_id": data.type_id,
            "is_static": data.is_static
        }
    )
    return new_property_type


@router.delete("/{property_type_id}", status_code=204)
async def delete_property_types(property_type_id: int, current_user: User = Depends(require_permissions("delete_property_types")), session: AsyncSession = Depends(get_async_session),
    log: LogCallable = Depends(LoggerInterface("property_types"))):
    await db.delete_property_type(session, property_type_id)
    await log(action="delete_property_type", details={"property_type_id": property_type_id}) 


@router.patch("/{property_type_id}")
async def update_property_type(property_type_id: int, data: PropertyTypesUpdate,  current_user: User = Depends(require_permissions("edit_property_types")),
                          session: AsyncSession = Depends(get_async_session),
    log: LogCallable = Depends(LoggerInterface("property_types"))  ):
    updated_property_type = await db.update_property_type(session, property_type_id, data)
    if not updated_property_type:
        raise HTTPException(
            status_code=404,
            detail="Тип свойства не найден"
        )
    details: dict[str, object] = {"property_type_id": property_type_id}
    if data.name is not None:
        details["name"] = data.name
    if data.is_static is not None:
        details["is_static"] = data.is_static
    
    await log(action="update_property_type", details=details)
    return updated_property_type
