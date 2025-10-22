from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional

from app.schemas.core import ObjectsRead, ObjectsCreate, ObjectsUpdate, InstancesRead
import app.crud.core.objects as db_objects
import app.crud.core.instances as db_instances
from app.db.database import get_async_session
from app.crud.auth.auth import require_permissions
from app.models.auth import User

router = APIRouter(prefix="/objects", tags=["DB: Core: Objects"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


@router.get("/", response_model=list[ObjectsRead])
async def read_objects(
        session: AsyncSession = Depends(get_async_session),
        current_user: User = Depends(require_permissions("read_objects")),
        name: Optional[str] = None,
        type_id: Optional[int] = Query(None),
        parent_id: Optional[int] = Query(None),
        root_id: Optional[int] = Query(None),
):
    return await db_objects.get_objects(session, name, type_id, parent_id, root_id)

@router.get("/{object_id}", response_model=ObjectsRead)
async def read_object(
    object_id: int,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(require_permissions("read_objects"))
):
    obj = await db_objects.get_object(session, object_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Object not found")
    return obj


@router.post("/", response_model=ObjectsCreate)
async def add_object(
    data: ObjectsCreate,
    current_user: User = Depends(require_permissions("create_objects")),
    session: AsyncSession = Depends(get_async_session)
):
    return await db_objects.create_object(session, data)


@router.delete("/{object_id}", status_code=204)
async def delete_objects(
    object_id: int,
    current_user: User = Depends(require_permissions("delete_objects")),
    session: AsyncSession = Depends(get_async_session)):
    await db_objects.delete_object(session, object_id)


@router.post("/{object_id}/instance")
async def create_instance_from_root_object(
    object_id: int,     
    current_user: User = Depends(require_permissions("create_instance_from_root_object")),
    session: AsyncSession = Depends(get_async_session)) -> InstancesRead: 
    root_instance: InstancesRead | None = await db_instances.create_instance_from_object_tree(session, 
    object_id)
    if root_instance is None:
        raise HTTPException(status_code=422, detail="Something went wrong")
    return root_instance


@router.patch("/{object_id}")
async def update_object(
    object_id: int,
    data: ObjectsUpdate,
    current_user: User = Depends(require_permissions("edit_objects")),
    session: AsyncSession = Depends(get_async_session)
    ) -> ObjectsRead | None:
    updated_object: ObjectsRead | None = await db_objects.update_object(session, object_id, data)
    if not updated_object:
        raise HTTPException(
            status_code=404,
            detail="Объект не найден"
        )
    return updated_object
