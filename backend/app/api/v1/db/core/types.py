from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional

from app.schemas.core import TypesRead, TypesCreate, TypesUpdate
import app.crud.core.types as db
from app.db.database import get_async_session

from app.crud.auth.auth import require_permission as require_permissions
from app.models.auth import User

router = APIRouter(prefix="/types", tags=["DB: Core: Types"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

@router.get("/", response_model=list[TypesRead])
async def read_types(
        session: AsyncSession = Depends(get_async_session),
        current_user: User = Depends(require_permissions("read_types")),
        name: Optional[str] = Query(None),
        parent_id: Optional[int] = Query(None),
        root_id: Optional[int] = Query(None)
):
    return await db.get_types(session, name, parent_id, root_id)


@router.get("/{type_id}", response_model=TypesRead)
async def read_type(type_id: int,
        current_user: User = Depends(require_permissions("read_types")),
        session: AsyncSession = Depends(get_async_session)):
    type = await db.get_type(session, type_id)
    if not type:
        raise HTTPException(status_code=404, detail="Type not found")
    return type


@router.post("/", response_model=TypesCreate)
async def add_type(data: TypesCreate,
        current_user: User = Depends(require_permissions("create_types")),
        session: AsyncSession = Depends(get_async_session)):
    return await db.create_type(session, data)


@router.delete("/{type_id}", status_code=204)
async def delete_types(
        type_id: int,
        current_user: User = Depends(require_permissions("delete_types")),
        session: AsyncSession = Depends(get_async_session)):
    await db.delete_type(session, type_id)


@router.patch("/{type_id}")
async def update_type(type_id: int, data: TypesUpdate, current_user: User = Depends(require_permissions("edit_types")), session: AsyncSession = Depends(get_async_session)) -> TypesRead:
    updated_type: TypesRead | None = await db.update_type(session, type_id, data)
    if not updated_type:
        raise HTTPException(
            status_code=404,
            detail="Тип не найден"
        )
    return updated_type
