from sqlalchemy.exc import DatabaseError, IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text, update
from sqlalchemy.sql import and_
from watchfiles import awatch


from app.crud.core.default import DefaultQueries
from app.models.events import *
from app.models.core import Instances, Objects
from app.schemas.events import *
from typing import List, Optional
from fastapi import HTTPException


async def get_valid_event_types_for_instance(
    db: AsyncSession,
    instance_id: int
) -> List[EventTypes]:
    """Get all event types valid for a specific instance (based on its type)"""
    # Get instance
    instance_result = await db.execute(
        select(Instances).where(Instances.id == instance_id)
    )
    instance = instance_result.scalar_one_or_none()
    
    if not instance:
        raise HTTPException(status_code=404, detail="Instance not found")
    
    # Get instance's object
    object_result = await db.execute(
        select(Objects).where(Objects.id == instance.object_id)
    )
    obj = object_result.scalar_one_or_none()
    if obj is None:
        raise HTTPException(status_code=404, detail="Object not found")
    
    # Get all event types linked to this type
    result = await db.execute(
        select(EventTypes)
        .join(EventTypesTypes, EventTypes.id == EventTypesTypes.event_type_id)
        .where(EventTypesTypes.type_id == obj.type_id)
    )
    
    return list(result.scalars().all())

async def get_event_types(
    db: AsyncSession,
    name: Optional[str] = None,
    type_id: Optional[int] = None,
) -> List[EventTypes]:
    query = select(EventTypes)
    
    filters = []
    if name is not None:
        filters.append(EventTypes.name == name)
    if type_id is not None:
        query = query.join(
            EventTypesTypes,
            EventTypes.id == EventTypesTypes.event_type_id,
        )
        filters.append(EventTypesTypes.type_id == type_id)
    
    if filters:
        query = query.where(and_(*filters))

    result = await db.execute(query)
    return list(result.scalars().all())

async def get_event_type(db: AsyncSession, event_type_id: int) -> Optional[EventTypes]:
    result = await db.execute(select(EventTypes).where(EventTypes.id == event_type_id))
    return result.scalar_one_or_none()


async def create_event_type(db: AsyncSession, data: EventTypesCreate):
    if data.name:
        event_type_ = EventTypes(**data.model_dump())
        db.add(event_type_)
        await db.commit()
        await db.refresh(event_type_)
        return event_type_
    else:
        raise HTTPException(status_code=400, detail="Please specify a name for the event")

async def delete_event_type(db: AsyncSession, event_type_id: int) -> None:
    result = await db.execute(select(EventTypes).where(EventTypes.id == event_type_id))
    event_type_ = result.scalar_one_or_none()

    if event_type_ is None:
        raise HTTPException(status_code=404, detail="Event Type not found")

    await db.delete(event_type_)
    await db.commit()

async def update_event_type(db: AsyncSession, event_type_id: int, data: EventTypesUpdate) -> EventTypes | None:
    return await DefaultQueries.update(db, EventTypes, event_type_id, data)
