from sqlalchemy.exc import DatabaseError, IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text, update
from sqlalchemy.sql import and_
from watchfiles import awatch


from app.crud.core.default import DefaultQueries
from app.models.events import *
from app.schemas.events import *
from typing import List, Optional
from fastapi import HTTPException

from app.models.core import Instances


async def get_events(
    db: AsyncSession,
    event_type_id: Optional[int] = None,
    instance_id: Optional[int] = None
) -> List[Events]:
    """Get events, optionally filtered"""
    query = select(Events)
    
    filters = []
    if event_type_id is not None:
        filters.append(Events.event_type_id == event_type_id)
    if instance_id is not None:
        filters.append(Events.instance_id == instance_id)
    
    if filters:
        query = query.where(and_(*filters))
    
    query = query.order_by(Events.timestamp.desc())
    
    result = await db.execute(query)
    return result.scalars().all()


async def get_event(db: AsyncSession, event_id: int) -> Optional[Events]:
    """Get a specific event"""
    result = await db.execute(select(Events).where(Events.id == event_id))
    return result.scalar_one_or_none()


async def create_event(db: AsyncSession, data: EventsCreate) -> Events:
    """Create a new event"""
    # Validate event_type exists
    event_type_exists = await db.execute(
        select(EventTypes).where(EventTypes.id == data.event_type_id)
    )
    if not event_type_exists.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Event type not found")
    
    # Validate instance exists and get its type
    instance_result = await db.execute(
        select(Instances).where(Instances.id == data.instance_id)
    )
    instance = instance_result.scalar_one_or_none()
    if not instance:
        raise HTTPException(status_code=404, detail="Instance not found")
    
    # Get the instance's object and type
    object_result = await db.execute(
        select(Objects).where(Objects.id == instance.object_id)
    )
    obj = object_result.scalar_one_or_none()
    
    # Check if this event type is allowed for this instance's type
    event_type_link = await db.execute(
        select(EventTypesTypes).where(
            and_(
                EventTypesTypes.event_type_id == data.event_type_id,
                EventTypesTypes.type_id == obj.type_id
            )
        )
    )
    
    if not event_type_link.scalar_one_or_none():
        raise HTTPException(
            status_code=400,
            detail=f"Event type {data.event_type_id} is not valid for instances of type {obj.type_id}"
        )
    
    event = Events(**data.model_dump())
    db.add(event)
    await db.commit()
    await db.refresh(event)
    return event


async def delete_event(db: AsyncSession, event_id: int) -> None:
    """Delete an event"""
    result = await db.execute(select(Events).where(Events.id == event_id))
    event = result.scalar_one_or_none()
    
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")
    
    await db.delete(event)
    await db.commit()


async def update_event(db: AsyncSession, event_id: int, data: EventsUpdate) -> Optional[Events]:
    """Update an event"""
    result = await db.execute(select(Events).where(Events.id == event_id))
    event = result.scalar_one_or_none()
    
    if not event:
        return None
    
    update_data = data.model_dump(exclude_unset=True)
    
    # Validate event_type if being updated
    if "event_type_id" in update_data:
        event_type_exists = await db.execute(
            select(EventTypes).where(EventTypes.id == update_data["event_type_id"])
        )
        if not event_type_exists.scalar_one_or_none():
            raise HTTPException(status_code=404, detail="Event type not found")
    
    # Validate instance if being updated
    if "instance_id" in update_data:
        instance_exists = await db.execute(
            select(Instances).where(Instances.id == update_data["instance_id"])
        )
        if not instance_exists.scalar_one_or_none():
            raise HTTPException(status_code=404, detail="Instance not found")
    
    for key, value in update_data.items():
        setattr(event, key, value)
    
    await db.commit()
    await db.refresh(event)
    return event