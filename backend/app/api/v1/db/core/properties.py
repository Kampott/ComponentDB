from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional

from app.schemas.core import PropertiesRead, PropertiesCreate, PropertiesUpdate
import app.crud.core.properties as db
from app.db.database import get_async_session


from app.crud.auth.auth import require_permission as require_permissions
from app.models.auth import User

from app.logging.deps import LoggerInterface, LogCallable 

router = APIRouter(prefix="/properties", tags=["DB: Core: Properties"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

@router.get("/", response_model=list[PropertiesRead])
async def read_properties(session: AsyncSession = Depends(get_async_session),
                        current_user: User = Depends(require_permissions("read_properties")),
                          property_id: Optional[int] = Query(None),
                          value: Optional[str] = Query(None),
                          object_id: Optional[int] = Query(None),
    log: LogCallable = Depends(LoggerInterface("properties"))):
    properties = await db.get_properties(session, property_id, value, object_id)
    
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
    log: LogCallable = Depends(LoggerInterface("properties"))) -> PropertiesRead:
    updated_property: PropertiesRead | None = await db.update_property(session, property_id, data)
    if not updated_property:
        raise HTTPException(
            status_code=404,
            detail="Значение свойства не найдено"
        )
    details = {"property_id": property_id}
    if data.value is not None:
        details["value"] = data.value
    
    await log(action="update_property", details=details)
    return updated_property
