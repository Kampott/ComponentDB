from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional

from app.schemas.core import ObjectsRead, ObjectsCreate, ObjectsUpdate
import app.crud.core.objects as db
from app.db.database import get_async_session

router = APIRouter(prefix="/objects", tags=["DB: Core: Objects"])


@router.get("/", response_model=list[ObjectsRead])
async def read_objects(
        session: AsyncSession = Depends(get_async_session),
        name: Optional[str] = None,
        type_id: Optional[int] = Query(None),
        parent_id: Optional[int] = Query(None),
        root_id: Optional[int] = Query(None),
        index_of_layer: Optional[int] = Query(None)
):
    return await db.get_objects(session, name, type_id, parent_id, root_id, index_of_layer)


@router.get("/{object_id}", response_model=ObjectsRead)
async def read_object(object_id: int, session: AsyncSession = Depends(get_async_session)):
    obj = await db.get_object(session, object_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Object not found")
    return obj


@router.post("/", response_model=ObjectsCreate)
async def add_object(data: ObjectsCreate, session: AsyncSession = Depends(get_async_session)):
    return await db.create_object(session, data)


@router.delete("/{object_id}", status_code=204)
async def delete_objects(object_id: int, session: AsyncSession = Depends(get_async_session)):
    await db.delete_object(session, object_id)


@router.patch("/{object_id}")
async def update_object(object_id: int, data: ObjectsUpdate,
                        session: AsyncSession = Depends(get_async_session)) -> ObjectsRead | None:
    updated_object: ObjectsRead | None = await db.update_object(session, object_id, data)
    if not updated_object:
        raise HTTPException(
            status_code=404,
            detail="Объект не найден"
        )
    return updated_object
