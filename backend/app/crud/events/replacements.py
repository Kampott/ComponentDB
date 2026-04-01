from typing import Optional

from fastapi import HTTPException
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.core import Instances
from app.models.events import Events, Replacements
from app.schemas.events import ReplacementsCreate


async def get_replacements(
    db: AsyncSession,
    event_id: Optional[int] = None,
    new_instance_id: Optional[int] = None,
) -> list[Replacements]:
    query = select(Replacements)

    filters = []
    if event_id is not None:
        filters.append(Replacements.event_id == event_id)
    if new_instance_id is not None:
        filters.append(Replacements.new_instance_id == new_instance_id)

    if filters:
        query = query.where(and_(*filters))

    result = await db.execute(query)
    return list(result.scalars().all())


async def get_replacement(
    db: AsyncSession,
    event_id: int,
    new_instance_id: int,
) -> Optional[Replacements]:
    result = await db.execute(
        select(Replacements).where(
            and_(
                Replacements.event_id == event_id,
                Replacements.new_instance_id == new_instance_id,
            )
        )
    )
    return result.scalar_one_or_none()


async def _deactivate_instance_tree(db: AsyncSession, instance_id: int) -> None:
    result = await db.execute(select(Instances).where(Instances.id == instance_id))
    instance = result.scalar_one_or_none()
    if not instance:
        return

    instance.is_active = False

    children_result = await db.execute(
        select(Instances).where(Instances.parent_id == instance_id)
    )
    for child in children_result.scalars().all():
        await _deactivate_instance_tree(db, child.id)


async def _reactivate_instance_tree(db: AsyncSession, instance_id: int) -> None:
    result = await db.execute(select(Instances).where(Instances.id == instance_id))
    instance = result.scalar_one_or_none()
    if not instance:
        return

    instance.is_active = True

    children_result = await db.execute(
        select(Instances).where(Instances.parent_id == instance_id)
    )
    for child in children_result.scalars().all():
        await _reactivate_instance_tree(db, child.id)


async def _get_replaced_instance_from_event(
    db: AsyncSession,
    event_id: int,
) -> tuple[Events, Instances]:
    event_result = await db.execute(select(Events).where(Events.id == event_id))
    event = event_result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    replaced_result = await db.execute(
        select(Instances).where(Instances.id == event.instance_id)
    )
    replaced_instance = replaced_result.scalar_one_or_none()
    if not replaced_instance:
        raise HTTPException(status_code=404, detail="Replaced instance not found")

    return event, replaced_instance


async def create_replacement(
    db: AsyncSession,
    data: ReplacementsCreate,
) -> Replacements:
    _, replaced_instance = await _get_replaced_instance_from_event(db, data.event_id)

    replacement_result = await db.execute(
        select(Instances).where(Instances.id == data.new_instance_id)
    )
    replacement_instance = replacement_result.scalar_one_or_none()
    if not replacement_instance:
        raise HTTPException(status_code=404, detail="Replacement instance not found")

    existing_replacement = await db.execute(
        select(Replacements).where(Replacements.event_id == data.event_id)
    )
    if existing_replacement.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="This event already has a replacement")

    if replacement_instance.is_active:
        raise HTTPException(
            status_code=400,
            detail="Replacement instance is already active. It must be inactive before being used as a replacement.",
        )

    replacement_instance.parent_id = replaced_instance.parent_id
    replacement_instance.is_active = True

    await _deactivate_instance_tree(db, replaced_instance.id)

    replacement = Replacements(**data.model_dump())
    db.add(replacement)

    await db.commit()
    await db.refresh(replacement)
    return replacement


async def delete_replacement(
    db: AsyncSession,
    event_id: int,
    new_instance_id: int,
) -> None:
    replacement = await get_replacement(db, event_id, new_instance_id)
    if replacement is None:
        raise HTTPException(status_code=404, detail="Replacement not found")

    await db.delete(replacement)
    await db.commit()


async def undo_replacement(
    db: AsyncSession,
    event_id: int,
    new_instance_id: int,
) -> None:
    replacement = await get_replacement(db, event_id, new_instance_id)
    if replacement is None:
        raise HTTPException(status_code=404, detail="Replacement not found")

    _, replaced_instance = await _get_replaced_instance_from_event(db, event_id)

    replacement_instance_result = await db.execute(
        select(Instances).where(Instances.id == new_instance_id)
    )
    replacement_instance = replacement_instance_result.scalar_one_or_none()
    if not replacement_instance:
        raise HTTPException(status_code=404, detail="Replacement instance not found")

    await _reactivate_instance_tree(db, replaced_instance.id)
    replacement_instance.is_active = False

    await db.delete(replacement)
    await db.commit()
