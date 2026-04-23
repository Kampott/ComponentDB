from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import Boolean, DateTime, String, LargeBinary, ARRAY, Integer, ForeignKey, UniqueConstraint, Index
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
import uuid

from base import Base


class IntegritySnapshot(Base):
    __tablename__ = "integrity_snapshots"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    scope_type: Mapped[str] = mapped_column(String(10), nullable=False) # nstances/types/objects
    root_id: Mapped[int] = mapped_column(index=True, nullable=False)
    root_hash: Mapped[bytes] = mapped_column(LargeBinary, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )
    changed_by_user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("users.id"),
        nullable=True
    )

    __table_args__ = (
        UniqueConstraint("scope_type", "root_id", "created_at"),
        Index("ix_integrity_snapshots_scope_root_created", "scope_type", "root_id", "created_at"),
    )

class IntegrityChecks(Base):
    __tablename__ = "integrity_checks"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )
    reason: Mapped[str] = mapped_column(String(20), nullable=False)
    started_by_user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("users.id"), nullable=True  # NULL if system
    )
    is_valid: Mapped[bool] = mapped_column(Boolean, nullable=False)
    invalid_trees: Mapped[dict | list | None] = mapped_column(JSONB, nullable=True)

