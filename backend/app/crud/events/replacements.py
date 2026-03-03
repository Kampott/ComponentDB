from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from typing import List, Optional
from fastapi import HTTPException

from app.models.events import Replacements, Events
from app.models.core import Instances
from app.schemas.events import ReplacementsCreate


async def get_replacements(
    db: AsyncSession,
    event_id: Optional[int] = None,
    replaced_id: Optional[int] = None,
    replacement_id: Optional[int] = None
) -> List[Replacements]:
    """Get replacements, optionally filtered"""
    query = select(Replacements)
    
    filters = []
    if event_id is not None:
        filters.append(Replacements.event_id == event_id)
    if replaced_id is not None:
        filters.append(Replacements.replaced_id == replaced_id)
    if replacement_id is not None:
        filters.append(Replacements.replacement_id == replacement_id)
    
    if filters:
        query = query.where(and_(*filters))
    
    result = await db.execute(query)
    return result.scalars().all()


async def get_replacement(
    db: AsyncSession,
    event_id: int,
    replaced_id: int,
    replacement_id: int
) -> Optional[Replacements]:
    """Get a specific replacement"""
    result = await db.execute(
        select(Replacements).where(
            and_(
                Replacements.event_id == event_id,
                Replacements.replaced_id == replaced_id,
                Replacements.replacement_id == replacement_id
            )
        )
    )
    return result.scalar_one_or_none()


async def _deactivate_instance_tree(db: AsyncSession, instance_id: int):
    """Recursively deactivate an instance and all its children"""
    # Get the instance
    result = await db.execute(
        select(Instances).where(Instances.id == instance_id)
    )
    instance = result.scalar_one_or_none()
    
    if not instance:
        return
    
    # Set is_active to False
    instance.is_active = False
    
    # Get all children
    children_result = await db.execute(
        select(Instances).where(Instances.parent_id == instance_id)
    )
    children = children_result.scalars().all()
    
    # Recursively deactivate children
    for child in children:
        await _deactivate_instance_tree(db, child.id)


async def create_replacement(
    db: AsyncSession,
    data: ReplacementsCreate
) -> Replacements:
    """Create a replacement and deactivate the replaced instance tree"""
    # Validate event exists
    event_exists = await db.execute(
        select(Events).where(Events.id == data.event_id)
    )
    if not event_exists.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Event not found")
    
    # Validate replaced instance exists
    replaced_result = await db.execute(
        select(Instances).where(Instances.id == data.replaced_id)
    )
    replaced_instance = replaced_result.scalar_one_or_none()
    if not replaced_instance:
        raise HTTPException(status_code=404, detail="Replaced instance not found")
    
    # Validate replacement instance exists
    replacement_result = await db.execute(
        select(Instances).where(Instances.id == data.replacement_id)
    )
    replacement_instance = replacement_result.scalar_one_or_none()
    if not replacement_instance:
        raise HTTPException(status_code=404, detail="Replacement instance not found")
    
    # Check if replaced instance has already been replaced
    existing_replacement = await db.execute(
        select(Replacements).where(Replacements.replaced_id == data.replaced_id)
    )
    if existing_replacement.scalar_one_or_none():
        raise HTTPException(
            status_code=400,
            detail="This instance has already been replaced"
        )
    
    # Check if replacement instance is already active somewhere
    if replacement_instance.is_active:
        raise HTTPException(
            status_code=400,
            detail="Replacement instance is already active. It must be inactive before being used as a replacement."
        )
    
    # Set replacement to same parent as replaced
    replacement_instance.parent_id = replaced_instance.parent_id
    replacement_instance.is_active = True
    
    # Deactivate the replaced instance and its entire subtree
    await _deactivate_instance_tree(db, data.replaced_id)
    
    # Create the replacement record
    replacement = Replacements(**data.model_dump())
    db.add(replacement)
    
    await db.commit()
    await db.refresh(replacement)
    
    return replacement


async def delete_replacement(
    db: AsyncSession,
    event_id: int,
    replaced_id: int,
    replacement_id: int
) -> None:
    """Delete a replacement (Note: does NOT reverse the deactivation)"""
    result = await db.execute(
        select(Replacements).where(
            and_(
                Replacements.event_id == event_id,
                Replacements.replaced_id == replaced_id,
                Replacements.replacement_id == replacement_id
            )
        )
    )
    replacement = result.scalar_one_or_none()
    
    if replacement is None:
        raise HTTPException(status_code=404, detail="Replacement not found")
    
    await db.delete(replacement)
    await db.commit()

async def _reactivate_instance_tree(db: AsyncSession, instance_id: int):
    """Recursively reactivate an instance and all its children"""
    # Get the instance
    result = await db.execute(
        select(Instances).where(Instances.id == instance_id)
    )
    instance = result.scalar_one_or_none()
    
    if not instance:
        return
    
    # Set is_active to True
    instance.is_active = True
    
    # Get all children
    children_result = await db.execute(
        select(Instances).where(Instances.parent_id == instance_id)
    )
    children = children_result.scalars().all()
    
    # Recursively reactivate children
    for child in children:
        await _reactivate_instance_tree(db, child.id)


async def undo_replacement(
    db: AsyncSession,
    event_id: int,
    replaced_id: int,
    replacement_id: int
) -> None:
    # Get the replacement record
    result = await db.execute(
        select(Replacements).where(
            and_(
                Replacements.event_id == event_id,
                Replacements.replaced_id == replaced_id,
                Replacements.replacement_id == replacement_id
            )
        )
    )
    replacement = result.scalar_one_or_none()
    
    if replacement is None:
        raise HTTPException(status_code=404, detail="Replacement not found")
    
    # Get the replaced and replacement instances
    replaced_result = await db.execute(
        select(Instances).where(Instances.id == replaced_id)
    )
    replaced_instance = replaced_result.scalar_one_or_none()
    
    replacement_instance_result = await db.execute(
        select(Instances).where(Instances.id == replacement_id)
    )
    replacement_instance = replacement_instance_result.scalar_one_or_none()
    
    if not replaced_instance or not replacement_instance:
        raise HTTPException(status_code=404, detail="Instance not found")
    
    # Reactivate the replaced instance and its entire subtree
    await _reactivate_instance_tree(db, replaced_id)
        
    # Delete the replacement record
    await db.delete(replacement)
    
    await db.commit()