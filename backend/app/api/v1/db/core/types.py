from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional

from app.schemas.core import TypesRead, TypesCreate, TypesUpdate
from app.crud.core.types import create_type, get_types, get_type, delete_type
from app.db.database import get_async_session

router = APIRouter(prefix="/types", tags=["DB: Core: Types"])


@router.get("/", response_model=list[TypesRead])
async def read_types(
        db: AsyncSession = Depends(get_async_session),
        name: Optional[str] = Query(None),
        parent_id: Optional[int] = Query(None),
        root_id: Optional[int] = Query(None),
        index_of_layer: Optional[int] = Query(None)
):
    return await get_types(db, name, parent_id, root_id, index_of_layer)


@router.get("/{type_id}", response_model=TypesRead)
async def read_type(type_id: int, db: AsyncSession = Depends(get_async_session)):
    type = await get_type(db, type_id)
    if not type:
        raise HTTPException(status_code=404, detail="Type not found")
    return type


@router.post("/", response_model=TypesCreate)
async def add_type(data: TypesCreate, db: AsyncSession = Depends(get_async_session)):
    return await create_type(db, data)


@router.delete("/{type_id}", status_code=204)
async def delete_types(type_id: int, db: AsyncSession = Depends(get_async_session)):
    await delete_type(db, type_id)
