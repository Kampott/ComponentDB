from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.crud.core import get_objects, create_object
from app.schemas.core import ObjectsRead, ObjectsCreate
from app.db.database import get_async_session

router = APIRouter(prefix="/objects", tags=["core"])

@router.get("/", response_model=list[ObjectsRead])
async def read_objects(db: AsyncSession = Depends(get_async_session)):
    return await get_objects(db)

@router.post("/", response_model=ObjectsRead)
async def add_objects(data: ObjectsCreate, db: AsyncSession = Depends(get_async_session)):
    return await create_object(db, data)
