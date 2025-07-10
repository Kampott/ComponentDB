from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.db.deps import get_db

router = APIRouter()

@router.get("/db-check")
async def check_db(session: AsyncSession = Depends(get_db)):
    result = await session.execute(text("SELECT 1"))
    return {"db_ok": result.scalar() == 1}
