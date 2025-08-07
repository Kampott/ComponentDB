from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import joinedload
from sqlalchemy.future import select
from sqlalchemy.sql import and_
from app.models.core import *
from app.schemas.core import *
from typing import List, Optional
from fastapi import HTTPException

# Get all available instances with optional filters
async def get_instances(
    db: AsyncSession,
    object_id: Optional[int] = None,
    is_active: Optional[bool] = None,
    root_id: Optional[int] = None,
) -> List[Instances]:
    query = select(Instances)

    filters = []
    if object_id is not None:
        filters.append(Instances.object_id == object_id)
    if is_active is not None:
        filters.append(Instances.is_active == is_active)
    if root_id is not None:
        filters.append(Instances.root_id == root_id)

    if filters:
        query = query.where(and_(*filters))

    result = await db.execute(query)
    return result.scalars().all()

#Get one type using the instances's id
async def get_instance(db: AsyncSession, instance_id: int) -> Optional[Instances]:
    result = await db.execute(select(Instances).where(Instances.id == instance_id))
    return result.scalar_one_or_none()

# Create instance and add to InstanceTreeMap
async def create_instance(db: AsyncSession, data: InstancesCreate):
    # Checking that object exists
    obj = await db.get(Objects, data.object_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Object not found")

    # If parent_instance_id is included, let's check for it's existence
    if data.parent_instance_id is not None:
        parent_instance = await db.get(Instances, data.parent_instance_id)
        if not parent_instance:
            raise HTTPException(status_code=404, detail="Parent instance not found")
    else:
        parent_instance = None

    # Creating instance
    instance = Instances(
        object_id=data.object_id,
        is_active=data.is_active
    )

    db.add(instance)
    await db.flush()  # Needed to get instance.id before commit.

    # Creating an InstanceTreeMap entry to link with parent
    tree_map = InstanceTreeMap(
        instance_id=instance.id,
        parent_instance_id=parent_instance.id if parent_instance else None,
        root_instance_id=parent_instance.root_instance_id if parent_instance else instance.id,
        # If no parent, then it's a root — root_instance_id = self
    )

    db.add(tree_map)
    await db.commit()
    await db.refresh(instance)

    return instance

async def delete_instance(db: AsyncSession, instance_id: int) -> None:
    instance = await db.get(Instances, instance_id)
    if instance is None:
        raise HTTPException(status_code=404, detail="Instance not found")

    await db.delete(instance)
    await db.commit()
