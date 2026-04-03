from datetime import datetime, timezone
from typing import List, Optional

from sqlalchemy import DateTime, ForeignKey, JSON, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from base import Base


class EventTypes(Base):
    __tablename__ = "event_types"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String)
    counts_as_failure: Mapped[bool] = mapped_column(default=False, nullable=False)

    child_instance_events: Mapped[List["Events"]] = relationship(
        back_populates="event_type",
        cascade="all, delete-orphan",
    )
    related_types: Mapped[List["EventTypesTypes"]] = relationship(
        back_populates="event_type",
        cascade="all, delete-orphan",
    )


class Events(Base):
    __tablename__ = "events"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    event_type_id: Mapped[int] = mapped_column(ForeignKey("event_types.id", ondelete="CASCADE"))
    instance_id: Mapped[int] = mapped_column(ForeignKey("instances.id", ondelete="CASCADE"))
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    info: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)

    event_type: Mapped["EventTypes"] = relationship(back_populates="child_instance_events")
    instance: Mapped["Instances"] = relationship(back_populates="related_events")
    replacement_info: Mapped[List["Replacements"]] = relationship(
        back_populates="event",
        cascade="all, delete-orphan",
    )


class EventTypesTypes(Base):
    __tablename__ = "event_types_types"

    event_type_id: Mapped[int] = mapped_column(
        ForeignKey("event_types.id", ondelete="CASCADE"),
        primary_key=True,
    )
    type_id: Mapped[int] = mapped_column(
        ForeignKey("types.id", ondelete="CASCADE"),
        primary_key=True,
    )

    event_type: Mapped["EventTypes"] = relationship(back_populates="related_types")
    type: Mapped["Types"] = relationship(back_populates="event_types")


class Replacements(Base):
    __tablename__ = "replacements"
    __table_args__ = (UniqueConstraint("event_id"),)

    event_id: Mapped[int] = mapped_column(ForeignKey("events.id", ondelete="CASCADE"), primary_key=True)
    new_instance_id: Mapped[int] = mapped_column(ForeignKey("instances.id", ondelete="CASCADE"), primary_key=True)

    event: Mapped["Events"] = relationship(back_populates="replacement_info")
    new_instance: Mapped["Instances"] = relationship(
        foreign_keys=[new_instance_id],
        back_populates="replacement_links",
    )
