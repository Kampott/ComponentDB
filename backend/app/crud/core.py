from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.models.core import Objects
from app.schemas.core import ObjectsCreate

async def get_objects(db: AsyncSession):
    res = await db.execute(select(Objects))
    return res.scalars().all()

async def create_object(db: AsyncSession, data: ObjectsCreate):
    obj = Object(**data.dict())
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj
