from sqlalchemy.exc import DatabaseError, IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text, update
from sqlalchemy.sql import and_
from watchfiles import awatch


from app.crud.core.default import DefaultQueries
from app.models.events import *
from app.models.core import Types
from app.schemas.events import *
from typing import List, Optional
from fastapi import HTTPException

async def get_event_types_types(
    db: AsyncSession, 
    event_type_id: Optional[int] = None,
    type_id: Optional[int] = None
) -> List[EventTypesTypes]:

    query = select(EventTypesTypes)
    
    filters = []
    if event_type_id is not None:
        filters.append(EventTypesTypes.event_type_id == event_type_id)
    if type_id is not None:
        filters.append(EventTypesTypes.type_id == type_id)
    
    if filters:
        query = query.where(and_(*filters))
    
    result = await db.execute(query)
    return list(result.scalars().all())

async def get_event_types_type(
    db: AsyncSession, 
    event_type_id: int, 
    type_id: int
) -> Optional[EventTypesTypes]:
    result = await db.execute(
        select(EventTypesTypes).where(
            and_(
                EventTypesTypes.event_type_id == event_type_id,
                EventTypesTypes.type_id == type_id
            )
        )
    )
    return result.scalar_one_or_none()

async def create_event_types_type(
    db: AsyncSession, 
    data: EventTypesTypesCreate
) -> EventTypesTypes:

    # Validate that both event_type and type exist
    event_type_exists = await db.execute(
        select(EventTypes).where(EventTypes.id == data.event_type_id)
    )
    if not event_type_exists.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Event type not found")
    
    type_exists = await db.execute(
        select(Types).where(Types.id == data.type_id)
    )
    if not type_exists.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Type not found")
    
    # Check if relationship already exists
    existing = await get_event_types_type(db, data.event_type_id, data.type_id)
    if existing:
        raise HTTPException(
            status_code=400, 
            detail="This event type is already linked to this type"
        )
    
    event_types_type = EventTypesTypes(**data.model_dump())
    db.add(event_types_type)
    await db.commit()
    await db.refresh(event_types_type)
    return event_types_type


async def delete_event_types_type(
    db: AsyncSession, 
    event_type_id: int, 
    type_id: int
) -> None:
    """Unlink an EventType from a Type"""
    result = await db.execute(
        select(EventTypesTypes).where(
            and_(
                EventTypesTypes.event_type_id == event_type_id,
                EventTypesTypes.type_id == type_id
            )
        )
    )
    event_types_type = result.scalar_one_or_none()
    
    if event_types_type is None:
        raise HTTPException(
            status_code=404, 
            detail="Event type-type relationship not found"
        )
    
    await db.delete(event_types_type)
    await db.commit()


async def get_types_for_event_type(
    db: AsyncSession, 
    event_type_id: int
) -> List[Types]:
    """Get all Types linked to a specific EventType"""
    result = await db.execute(
        select(Types)
        .join(EventTypesTypes, Types.id == EventTypesTypes.type_id)
        .where(EventTypesTypes.event_type_id == event_type_id)
    )
    return list(result.scalars().all())


async def get_event_types_for_type(
    db: AsyncSession, 
    type_id: int
) -> List[EventTypes]:
    """Get all EventTypes linked to a specific Type"""
    result = await db.execute(
        select(EventTypes)
        .join(EventTypesTypes, EventTypes.id == EventTypesTypes.event_type_id)
        .where(EventTypesTypes.type_id == type_id)
    )
    return list(result.scalars().all())
