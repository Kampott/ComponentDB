import uuid
from datetime import datetime, timezone
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.database import Base
from typing import Optional, List
from sqlalchemy import Index, ForeignKey, String, Integer, Boolean, DateTime, Text, UniqueConstraint, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func


class EventTypes(Base):
    __tablename__ = "event_types"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String)

    child_instance_events: Mapped[List["Events"]] = relationship(back_populates="event_type", cascade="all, delete-orphan")
    related_types: Mapped[List["EventTypesTypes"]] = relationship(back_populates="event_type", cascade="all, delete-orphan")


class Events(Base):
    __tablename__ = "events"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    event_type_id: Mapped[int] = mapped_column(ForeignKey("event_types.id", ondelete="CASCADE"))
    instance_id: Mapped[int] = mapped_column(ForeignKey("instances.id", ondelete="CASCADE"))
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    info: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)

    event_type: Mapped["EventTypes"] = relationship(back_populates="child_instance_events")
    instance: Mapped["Instances"] = relationship(back_populates="related_events")
    replacement_info: Mapped[List["Replacements"]] = relationship(back_populates="event", cascade="all, delete-orphan")


class EventTypesTypes(Base):
    __tablename__ = "event_types_types"
    __table_args__ = (UniqueConstraint("event_type_id", "type_id"),)

    event_type_id: Mapped[int] = mapped_column(ForeignKey("event_types.id", ondelete="CASCADE"), primary_key=True)
    type_id: Mapped[int] = mapped_column(ForeignKey("types.id", ondelete="CASCADE"), primary_key=True)

    event_type: Mapped["EventTypes"] = relationship(back_populates="related_types")
    type: Mapped["Types"] = relationship(back_populates="event_types")


class Replacements(Base):
    __tablename__ = "replacements"
    __table_args__ = (UniqueConstraint("replaced_id"),)

    event_id: Mapped[int] = mapped_column(ForeignKey("events.id", ondelete="CASCADE"), primary_key=True)
    replaced_id: Mapped[int] = mapped_column(ForeignKey("instances.id", ondelete="CASCADE"), primary_key=True)
    replacement_id: Mapped[int] = mapped_column(ForeignKey("instances.id", ondelete="CASCADE"), primary_key=True)

    event: Mapped["Events"] = relationship(back_populates="replacement_info")
    replaced: Mapped["Instances"] = relationship(foreign_keys=[replaced_id], back_populates="replaced_by")
    replacement: Mapped["Instances"] = relationship(foreign_keys=[replacement_id], back_populates="did_replace")