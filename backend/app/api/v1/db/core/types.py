from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional

from app.schemas.core import TypesRead, TypesCreate, TypesUpdate
import app.crud.core.types as db
from app.db.database import get_async_session

router = APIRouter(prefix="/types", tags=["DB: Core: Types"])


@router.get("/", response_model=list[TypesRead])
async def read_types(
        session: AsyncSession = Depends(get_async_session),
        name: Optional[str] = Query(None),
        parent_id: Optional[int] = Query(None),
        root_id: Optional[int] = Query(None)
):
    return await db.get_types(session, name, parent_id, root_id)


@router.get("/{type_id}", response_model=TypesRead)
async def read_type(type_id: int, session: AsyncSession = Depends(get_async_session)):
    type = await db.get_type(session, type_id)
    if not type:
        raise HTTPException(status_code=404, detail="Type not found")
    return type


@router.post("/", response_model=TypesCreate)
async def add_type(data: TypesCreate, session: AsyncSession = Depends(get_async_session)):
    return await db.create_type(session, data)


@router.delete("/{type_id}", status_code=204)
async def delete_types(type_id: int, session: AsyncSession = Depends(get_async_session)):
    await db.delete_type(session, type_id)


@router.patch("/{type_id}")
async def update_type(type_id: int, data: TypesUpdate, session: AsyncSession = Depends(get_async_session)) -> TypesRead:
    updated_type: TypesRead | None = await db.update_type(session, type_id, data)
    if not updated_type:
        raise HTTPException(
            status_code=404,
            detail="Тип не найден"
        )
    return updated_type
