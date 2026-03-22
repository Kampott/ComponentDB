from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional

from app.schemas.core import InstancePropertiesRead, InstancePropertiesCreate, InstancePropertiesUpdate
import app.crud.core.instance_properties as db
from app.db.database import get_async_session

from app.logging.deps import LoggerInterface, LogCallable

from app.crud.auth.auth import require_permission as require_permissions
from app.models.auth import User

from typing import List
from datetime import datetime
from app.core.query_builder import QueryBuilder
from app.core.search_config import SEARCH_CONFIG


router = APIRouter(prefix="/instanceproperties", tags=["DB: Core: Instance Properties"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

@router.get("/", response_model=list[InstancePropertiesRead])
async def read_instance_properties(
    session: AsyncSession = Depends(get_async_session),
    # Фильтры
    instance_id: Optional[int] = Query(None),
    instance_id__in: Optional[List[int]] = Query(None),
    
    property_type_id: Optional[int] = Query(None),
    property_type_id__in: Optional[List[int]] = Query(None),
    
    value: Optional[str] = Query(None),
    value__like: Optional[str] = Query(None),
    
    id: Optional[int] = Query(None),
    id__in: Optional[List[int]] = Query(None),
    id__sort: Optional[str] = Query(None, regex="^(asc|desc)$"),
    
    current_user: User = Depends(require_permissions("read_instance_properties")),
    log: LogCallable = Depends(LoggerInterface("instance_properties"))
):
    params = {
        "instance_id": instance_id,
        "instance_id__in": instance_id__in,
        "property_type_id": property_type_id,
        "property_type_id__in": property_type_id__in,
        "value": value,
        "value__like": value__like,
        "id": id,
        "id__in": id__in,
        "id__sort": id__sort,
    }
    
    QueryBuilder.validate_params(InstanceProperties, params, SEARCH_CONFIG[InstanceProperties])
    filters = QueryBuilder.parse_query_params(params)
    
    query = select(InstanceProperties)
    query = QueryBuilder.apply_filters(query, InstanceProperties, filters)
    query = QueryBuilder.apply_sorting(query, InstanceProperties, filters)
    
    result = await session.execute(query)
    instance_properties = result.scalars().all()
    
    try:
        await log(action="read_instance_properties")
    except Exception:
        pass
    
    return instance_properties


@router.post("/", response_model=InstancePropertiesRead)
async def add_instanceproperty(data: InstancePropertiesCreate,
        current_user: User = Depends(require_permissions("create_instance_properties")),
        session: AsyncSession = Depends(get_async_session),
        log: LogCallable = Depends(LoggerInterface("instance_properties"))):
        result = await db.create_instanceproperty(session, data)
        try:
            await log(
            action="read_instance_properties",
            details={
                "value": data.value,
                "instance_id": data.instance_id,
                "property_type_id": data.property_type_id
            }
            )
        except Exception:
            pass 
        return result


@router.delete("/{instance_property_id}", status_code=204)
async def delete_instance_property(instance_property_id: int,
        current_user: User = Depends(require_permissions("delete_instance_properties")),
        session: AsyncSession = Depends(get_async_session),
        log: LogCallable = Depends(LoggerInterface("instance_properties"))):
    await db.delete_instanceproperty(session, instance_property_id)
    try:
        await log(
            action="read_instance_properties",
            details={
                "instance_property_id": instance_property_id
            }
        )
    except Exception:
        pass 


@router.patch("/{instance_property_id}")
async def update_property_type(instance_property_id: int,
                    data: InstancePropertiesUpdate,
                    current_user: User = Depends(require_permissions("update_instance_properties")),
                    session: AsyncSession = Depends(get_async_session),
        log: LogCallable = Depends(LoggerInterface("instance_properties"))) -> InstancePropertiesRead:
    updated_instance_property: InstancePropertiesRead | None = await db.update_instance_property(
        session, instance_property_id, data
    )
    if not updated_instance_property:
        raise HTTPException(
            status_code=404,
            detail="Значение свойства экземпляра не найдено"
        )
    try:
        await log(
            action="read_instance_properties",
            details={
                "value": data.value,
                "instance_id": data.instance_id,
                "property_type_id": data.property_type_id
            }
        )
    except Exception:
        pass 
    return updated_instance_property
