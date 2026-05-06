from typing import Optional, List
from app.core.query_builder import QueryBuilder

import app.crud.core.types as db
from app.core.security import get_current_user
from app.crud.auth.auth import (
    _check_permission,
    _check_type_permission,
    require_type_permission,
)
from app.db.database import get_async_session
from app.logging.deps import LogCallable, LoggerInterface
from app.models.auth import Role, User, UserTypeAccess
from app.models.core import Types
from app.schemas.core import TypesCreate
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlalchemy.sql import false
from app.core.search_config import SEARCH_CONFIG

router = APIRouter(prefix="/debug", tags=["DB: Debug"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

@router.post("/", response_model=TypesCreate)
async def add_type_no_rehash(
    data: TypesCreate,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user),
    log: LogCallable = Depends(LoggerInterface("types"))
):
    if data.parent_id is None:
        await _check_permission(current_user, session, "SUPER_PERMISSION")
    else:
        await _check_type_permission(session, current_user, data.parent_id, write=True)

    new_type = await db.create_type_no_rehash(session, data, current_user.id)
    
    await log(
        action="add_type_no_rehash",
        details={
            "id": new_type.id,
            "name": data.name,
            "parent_id": data.parent_id
        }
    )

    return new_type