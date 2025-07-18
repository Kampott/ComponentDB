from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.models.core import *
from app.schemas.core import ObjectsCreate, ObjectsUpdate
from typing import List, Optional


#Get all of the available objects
async def get_objects(db: AsyncSession) -> List[Objects]:
    result = await db.execute(select(Objects))
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

    obj = Objects(
        **data.dict(),
        index_of_layer=index_of_layer
    )

    db.add(obj)
    await db.flush() # flushing in order to prevent data corruption (and null root_id)

    if data.parent_id is None:
        obj.root_id = obj.id
        await db.flush()
    
    await db.commit()
    await db.refresh(obj)
    
    return obj
