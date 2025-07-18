from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.schemas.core import ObjectsRead, ObjectsCreate, ObjectsUpdate
from app.crud.core import create_object, get_objects
from app.db.database import get_async_session

router = APIRouter(prefix="/objects", tags=["core"])

@router.get("/", response_model=list[ObjectsRead])
async def read_objects(db: AsyncSession = Depends(get_async_session)):
    return await get_objects(db)

@router.post("/", response_model=ObjectsRead)
async def add_objects(data: ObjectsCreate, db: AsyncSession = Depends(get_async_session)):
    return await create_object(db, data)
