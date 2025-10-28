from typing import TypeVar
from pydantic import BaseModel
from sqlalchemy import update, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.base import Base

PydanticModel = TypeVar("PydanticModel", bound=BaseModel)
ORMModel = TypeVar("ORMModel", bound=Base)

class DefaultQueries:
    @staticmethod
    async def update(session: AsyncSession, orm: type[ORMModel], id: int, data: PydanticModel) \
            -> type[ORMModel] | None:
        update_data: dict = data.model_dump(exclude_unset=True)

        if update_data:
            query = (
                update(orm)
                .where(orm.id == id)
                .values(**update_data)
                .returning(orm)
            )
        else:
            query = (
                select(orm)
                .where(orm.id == id)
            )

        try:
            updated_orm: orm | None = (await session.execute(query)).scalar_one_or_none()

            await session.commit()
            return updated_orm
        except IntegrityError:
            return None
