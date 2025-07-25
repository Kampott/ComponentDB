from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.models.core import *
from app.schemas.core import *
from typing import List, Optional
from fastapi import HTTPException


#Get all of the available types
async def get_types(db: AsyncSession) -> List[Types]:
    result = await db.execute(select(Types))
    return result.scalars().all()

#Get one type using the types's id
async def get_type(db: AsyncSession, type_id: int) -> Optional[Types]:
    result = await db.execute(select(Types).where(Types.id == type_id))
    return result.scalar_one_or_none()


#Create a type
async def create_type(db: AsyncSession, data: TypesCreate):
    #recieving parent, if parent_id is given
    index_of_layer = 1
    root_id = None

    #if parent_id present - getting the index of layer and adding 1, root = parent.root
    if data.parent_id:
        parent_type = await db.get(Types, data.parent_id)
        if not parent_type:
            raise HTTPException(status_code=404, detail="Parent type not found")
        
        index_of_layer = parent_type.index_of_layer + 1
        root_id = parent_type.root_id

    type_ = Types(
        **data.dict(),
        index_of_layer=index_of_layer,
        root_id=root_id
    )

    db.add(type_)
    await db.flush() # flushing in order to prevent data corruption (and null root_id)

    if data.parent_id is None:
        type_.root_id = type_.id
        await db.flush()
    
    await db.commit()
    await db.refresh(type_)
    
    return type_

async def delete_type(db: AsyncSession, type_id: int) -> None:
    result = await db.execute(select(Types).where(Types.id == type_id))
    type_ = result.scalar_one_or_none()

    if type_ is None:
        raise HTTPException(status_code=404, detail="Type not found")

    await db.delete(type_)
    await db.commit()