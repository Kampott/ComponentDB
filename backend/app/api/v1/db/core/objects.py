from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional

from app.schemas.core import ObjectsRead, ObjectsCreate, ObjectsUpdate
from app.crud.core.objects import create_object, get_objects, get_object, delete_object
from app.db.database import get_async_session

router = APIRouter(prefix="/objects", tags=["DB: Core: Objects"])

@router.get("/", response_model=list[ObjectsRead])
async def read_objects(
    db: AsyncSession = Depends(get_async_session),
    name: Optional[str] = None,
    type_id: Optional[int] = Query(None),
    parent_id: Optional[int] = Query(None),
    root_id: Optional[int] = Query(None),
    index_of_layer: Optional[int] = Query(None)
):
    return await get_objects(db, name, type_id, parent_id, root_id, index_of_layer)

@router.get("/{object_id}", response_model=ObjectsRead)
async def read_object(object_id: int, db: AsyncSession = Depends(get_async_session)):
    obj = await get_object(db, object_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Object not found")
    return obj

@router.post("/", response_model=ObjectsCreate)
async def add_object(data: ObjectsCreate, db: AsyncSession = Depends(get_async_session)):
    return await create_object(db, data)

@router.delete("/{object_id}", status_code=204)
async def delete_objects(object_id: int, db: AsyncSession = Depends(get_async_session)):
    await delete_object(db, object_id)