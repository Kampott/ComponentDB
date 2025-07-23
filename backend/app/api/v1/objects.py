from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.schemas.core import ObjectsRead, ObjectsCreate, ObjectsUpdate
from app.crud.core import create_object, get_objects, get_object
from app.db.database import get_async_session

router = APIRouter(prefix="/objects", tags=["core"])

@router.get("/", response_model=list[ObjectsRead])
async def read_objects(db: AsyncSession = Depends(get_async_session)):
    return await get_objects(db)

@router.get("/{object_id}", response_model=ObjectsRead)
async def read_object(object_id: int, db: AsyncSession = Depends(get_async_session)):
    obj = await get_object(db, object_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Object not found")
    return obj

@router.post("/", response_model=ObjectsCreate)
async def add_object(data: ObjectsCreate, db: AsyncSession = Depends(get_async_session)):
    return await create_object(db, data)