from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import joinedload
from sqlalchemy.future import select
from sqlalchemy.sql import and_
from app.models.core import *
from app.schemas.core import *
from typing import List, Optional
from fastapi import HTTPException



############ Objects

#Get all of the available objects
async def get_objects(
    db: AsyncSession,
    type_id: Optional[int] = None,
    parent_id: Optional[int] = None,
    root_id: Optional[int] = None,
    index_of_layer: Optional[int] = None
) -> List[Objects]:

    query = select(Objects)

    filters = []
    if type_id is not None:
        filters.append(Objects.type_id == type_id)
    if parent_id is not None:
        filters.append(Objects.parent_id == parent_id)
    if root_id is not None:
        filters.append(Objects.root_id == root_id)
    if index_of_layer is not None:
        filters.append(Objects.index_of_layer == index_of_layer)

    if filters:
        query = query.where(and_(*filters))

    result = await db.execute(query)
    return result.scalars().all()

#Get one object using the object's id
async def get_object(db: AsyncSession, object_id: int) -> Optional[Objects]:
    result = await db.execute(select(Objects).where(Objects.id == object_id))
    return result.scalar_one_or_none()


#Create an object
async def create_object(db: AsyncSession, data: ObjectsCreate):
    #recieving parent, if parent_id is given
    index_of_layer = 1
    root_id = None

    #if parent_id present - getting the index of layer and adding 1, root = parent.root
    if data.parent_id:
        parent_obj = await db.get(Objects, data.parent_id)
        if not parent_obj:
            raise HTTPException(status_code=404, detail="Parent object not found")
        
        index_of_layer = parent_obj.index_of_layer + 1
        root_id = parent_obj.root_id
    
    #checking if type exists
    type_obj = await db.get(Types, data.type_id)
    if not type_obj:
        raise HTTPException(status_code=404, detail="Type not found")

    obj = Objects(
        **data.dict(),
        index_of_layer=index_of_layer,
        root_id=root_id
    )

    db.add(obj)
    await db.flush() # flushing in order to prevent data corruption (and null root_id)

    if data.parent_id is None:
        obj.root_id = obj.id
        await db.flush()
    
    await db.commit()
    await db.refresh(obj)
    
    return obj

async def delete_object(db: AsyncSession, object_id: int) -> None:
    result = await db.execute(select(Objects).where(Objects.id == object_id))
    obj = result.scalar_one_or_none()

    if obj is None:
        raise HTTPException(status_code=404, detail="Object not found")

    await db.delete(obj)
    await db.commit()