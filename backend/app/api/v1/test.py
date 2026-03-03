from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.db.database import get_async_session

router = APIRouter()

@router.get("/db-check")
async def check_db(session: AsyncSession = Depends(get_async_session)):
    result = await session.execute(text("SELECT 1"))
    return {"db_ok": result.scalar() == 1}
