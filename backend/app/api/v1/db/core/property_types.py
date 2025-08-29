from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional

from app.schemas.core import PropertyTypesRead, PropertyTypesCreate, PropertyTypesUpdate
import app.crud.core.property_types as db
from app.db.database import get_async_session

router = APIRouter(prefix="/property_types", tags=["DB: Core: Property Types"])


@router.get("/", response_model=list[PropertyTypesRead])
async def list_property_types(
        type_id: Optional[int] = Query(None),
        name: Optional[str] = Query(None),
        is_static: Optional[bool] = Query(None),
        session: AsyncSession = Depends(get_async_session)
):
    return await db.get_propertytypes(session, type_id, name, is_static)


@router.get("/{property_type_id}", response_model=PropertyTypesRead)
async def read_property_type(property_type_id: int, session: AsyncSession = Depends(get_async_session)):
    property_type = await db.get_propertytype(session, property_type_id)
    if not property_type:
        raise HTTPException(status_code=404, detail="Type proprety not found")
    return property_type


@router.post("/", response_model=PropertyTypesCreate)
async def add_property_type(data: PropertyTypesCreate, session: AsyncSession = Depends(get_async_session)):
    return await db.create_propertytype(session, data)


@router.delete("/{property_type_id}", status_code=204)
async def delete_property_types(property_type_id: int, session: AsyncSession = Depends(get_async_session)):
    await db.delete_property_type(session, property_type_id)


@router.patch("/{property_type_id}")
async def update_property_type(property_type_id: int, data: PropertyTypesUpdate,
                          session: AsyncSession = Depends(get_async_session)) -> PropertyTypesRead:
    updated_property_type: PropertyTypesRead | None = await db.update_property_type(session, property_type_id, data)
    if not updated_property_type:
        raise HTTPException(
            status_code=404,
            detail="Тип свойства не найден"
        )
    return updated_property_type
