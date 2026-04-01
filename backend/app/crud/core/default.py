from typing import TypeVar, Any
from pydantic import BaseModel
from sqlalchemy import update, select, and_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.base import Base


ORMModel = TypeVar("ORMModel", bound=Base)


class DefaultQueries:
    @staticmethod
    async def update(
        session: AsyncSession,
        orm: type[ORMModel],
        id: int,
        data: BaseModel
    ) -> ORMModel | None:
        update_data: dict[str, Any] = data.model_dump(exclude_unset=True)
        orm_id = getattr(orm, "id")

        if update_data:
            query = (
                update(orm)
                .where(orm_id == id)
                .values(**update_data)
                .returning(orm)
            )
        else:
            query = select(orm).where(orm_id == id)

        try:
            result = await session.execute(query)
            updated_obj: ORMModel | None = result.scalar_one_or_none()
            await session.commit()
            return updated_obj
        except IntegrityError:
            await session.rollback()
            return None

    @staticmethod
    async def update_by_filters(
        session: AsyncSession,
        orm: type[ORMModel],
        data: BaseModel,
        filters: dict[str, Any],
    ) -> ORMModel | None:
        update_data = data.model_dump(exclude_unset=True)

        if not filters:
            raise ValueError("Filters cannot be empty for update_by_filters()")

        conditions = [getattr(orm, key) == value for key, value in filters.items()]

        if update_data:
            query = (
                update(orm)
                .where(and_(*conditions))
                .values(**update_data)
                .returning(orm)
            )
        else:
            query = select(orm).where(and_(*conditions))

        try:
            result = await session.execute(query)
            updated_obj: ORMModel | None = result.scalar_one_or_none()
            await session.commit()
            return updated_obj
        except IntegrityError:
            await session.rollback()
            return None
