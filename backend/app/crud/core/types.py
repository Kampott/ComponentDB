from sqlalchemy.exc import DatabaseError, IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text, update
from sqlalchemy.sql import and_
from app.models.core import *
from app.schemas.core import *
from typing import List, Optional
from fastapi import HTTPException


# Get all of the available types
async def get_types(db: AsyncSession,
                    name: Optional[str] = None,
                    parent_id: Optional[int] = None,
                    root_id: Optional[int] = None,
                    index_of_layer: Optional[int] = None
                    ) -> List[Types]:
    query = select(Types)

    filters = []
    if name is not None:
        filters.append(Types.name == name)
    if parent_id is not None:
        filters.append(Types.parent_id == parent_id)
    if root_id is not None:
        filters.append(Types.root_id == root_id)
    if index_of_layer is not None:
        filters.append(Types.index_of_layer == index_of_layer)

    if filters:
        query = query.where(and_(*filters))

    result = await db.execute(query)
    return result.scalars().all()


# Get one type using the types's id
async def get_type(db: AsyncSession, type_id: int) -> Optional[Types]:
    result = await db.execute(select(Types).where(Types.id == type_id))
    return result.scalar_one_or_none()


# Create a type
async def create_type(db: AsyncSession, data: TypesCreate):
    if data.parent_id:
        # Child type
        parent_type = await db.get(Types, data.parent_id)
        if not parent_type:
            raise HTTPException(status_code=404, detail="Parent type not found")

        type_ = Types(
            **data.dict(),
            index_of_layer=parent_type.index_of_layer + 1,
            root_id=parent_type.root_id
        )
        db.add(type_)
        await db.commit()
        await db.refresh(type_)
        return type_

    else:
        # Root type - getting the id first through nextval
        result = await db.execute(text("SELECT nextval('types_id_seq')"))
        next_id = result.scalar()

        type_ = Types(
            id=next_id,
            **data.dict(),
            index_of_layer=1,
            root_id=next_id
        )
        db.add(type_)
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


async def update_type(session: AsyncSession, type_id: int, data: TypesUpdate) -> Types | None:
    update_data: dict = data.model_dump(exclude_unset=True)

    query = (
        update(Types)
        .where(Types.id == type_id)
        .values(**update_data)
        .returning(Types)
    )

    try:
        updated_type: Types | None = (await session.execute(query)).scalar_one_or_none()

        await session.commit()
        return updated_type
    except IntegrityError:
        return None
