from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional

from app.schemas.core import PropertiesRead, PropertiesCreate, PropertiesUpdate
import app.crud.core.properties as db
from app.db.database import get_async_session


from app.crud.auth.auth import require_permission as require_permissions
from app.models.auth import User
from app.models.core import Properties

from app.logging.deps import LoggerInterface, LogCallable 
from app.core.query_builder import QueryBuilder
from app.core.search_config import SEARCH_CONFIG

router = APIRouter(prefix="/properties", tags=["DB: Core: Properties"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

@router.get("/", response_model=list[PropertiesRead])
async def read_properties(
    session: AsyncSession = Depends(get_async_session),
    # Фильтры
    object_id: Optional[int] = Query(None),
    object_id__in: Optional[List[int]] = Query(None),
    
    property_id: Optional[int] = Query(None),
    property_id__in: Optional[List[int]] = Query(None),
    
    value: Optional[str] = Query(None),
    value__like: Optional[str] = Query(None),
    
    id: Optional[int] = Query(None),
    id__in: Optional[List[int]] = Query(None),
    id__sort: Optional[str] = Query(None, regex="^(asc|desc)$"),
    
    current_user: User = Depends(require_permissions("read_properties")),
    log: LogCallable = Depends(LoggerInterface("properties"))
):
    params = {
        "object_id": object_id,
        "object_id__in": object_id__in,
        "property_id": property_id,
        "property_id__in": property_id__in,
        "value": value,
        "value__like": value__like,
        "id": id,
        "id__in": id__in,
        "id__sort": id__sort,
    }
    
    QueryBuilder.validate_params(Properties, params, SEARCH_CONFIG[Properties])
    filters = QueryBuilder.parse_query_params(params)
    
    query = select(Properties)
    query = QueryBuilder.apply_filters(query, Properties, filters)
    query = QueryBuilder.apply_sorting(query, Properties, filters)
    
    result = await session.execute(query)
    properties = result.scalars().all()
    
    try:
        await log(action="read_properties")
    except Exception:
        pass
    
    return properties




@router.get("/{property_id}", response_model=PropertiesRead)
async def read_property(property_id: int,
                         current_user: User = Depends(require_permissions("read_properties")),
                         session: AsyncSession = Depends(get_async_session),
    log: LogCallable = Depends(LoggerInterface("properties"))):
    property_ = await db.get_property(session, property_id)
    if not property_:
        raise HTTPException(status_code=404, detail="Property not found")
    await log(action="read_property", details={"property_id": property_id})
    return property_

@router.post("/", response_model=PropertiesCreate)
async def add_properties(data: PropertiesCreate,
                        current_user: User = Depends(require_permissions("create_properties")),
                        session: AsyncSession = Depends(get_async_session),
    log: LogCallable = Depends(LoggerInterface("properties"))):
    new_property = await db.create_property(session, data)
    
    await log(
        action="add_property",
        details={
            "property_id": new_property.id,
            "object_id": data.object_id
        }
    )
    return new_property


@router.delete("/{property_id}", status_code=204)
async def delete_properties(property_id: int,
                        current_user: User = Depends(require_permissions("delete_properties")),
                        session: AsyncSession = Depends(get_async_session),
    log: LogCallable = Depends(LoggerInterface("properties")) ):
    await db.delete_property(session, property_id)
    await log(action="delete_property", details={"property_id": property_id}) 


@router.patch("/{property_id}")
async def update_property(property_id: int, data: PropertiesUpdate,
                        current_user: User = Depends(require_permissions("edit_properties")),
                               session: AsyncSession = Depends(get_async_session),
    log: LogCallable = Depends(LoggerInterface("properties"))):
    updated_property = await db.update_property(session, property_id, data)
    if not updated_property:
        raise HTTPException(
            status_code=404,
            detail="Значение свойства не найдено"
        )
    details: dict[str, object] = {"property_id": property_id}
    if data.value is not None:
        details["value"] = data.value
    
    await log(action="update_property", details=details)
    return updated_property
