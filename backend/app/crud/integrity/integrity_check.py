from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Literal, Optional, Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.core import Types, Objects, Instances
from app.models.integrity import IntegritySnapshot, IntegrityChecks
from app.services.integrity_service import compute_scope_root_hash

ScopeType = Literal["types", "objects", "instances"]


def _bytes_to_hex(value: bytes | None) -> str | None:
    return value.hex() if value is not None else None


async def check_all_integrity(
    session: AsyncSession,
    started_by_user_id: uuid.UUID | None = None,
    scope_type: Optional[ScopeType] = None,
) -> dict[str, Any]:
    scopes: list[tuple[str, type]] = [
        ("types", Types),
        ("objects", Objects),
        ("instances", Instances),
    ]

    if scope_type is not None:
        scopes = [item for item in scopes if item[0] == scope_type]

    invalid_trees: list[dict[str, Any]] = []
    checked_trees = 0
    valid_trees = 0
    missing_snapshots = 0
    mismatched_snapshots = 0

    try:
        for current_scope, model in scopes:
            try:
                roots_result = await session.execute(
                    select(model.id).where(model.parent_id.is_(None))
                )
                root_ids = list(roots_result.scalars().all())

                if not root_ids:
                    continue

                snapshots_result = await session.execute(
                    select(IntegritySnapshot)
                    .where(IntegritySnapshot.scope_type == current_scope)
                    .order_by(
                        IntegritySnapshot.root_id.asc(),
                        IntegritySnapshot.created_at.desc(),
                        IntegritySnapshot.id.desc(),
                    )
                )
                snapshots = snapshots_result.scalars().all()

                latest_snapshot_by_root: dict[int, IntegritySnapshot] = {}
                for snapshot in snapshots:
                    if snapshot.root_id not in latest_snapshot_by_root:
                        latest_snapshot_by_root[snapshot.root_id] = snapshot

                for root_id in root_ids:
                    checked_trees += 1

                    try:
                        current_hash = await compute_scope_root_hash(
                            session=session,
                            scope_type=current_scope,  # type: ignore[arg-type]
                            root_id=root_id,
                        )
                    except Exception as exc:
                        invalid_trees.append(
                            {
                                "scope_type": current_scope,
                                "root_id": root_id,
                                "reason": "hash_computation_error",
                                "error": str(exc),
                            }
                        )
                        continue

                    snapshot = latest_snapshot_by_root.get(root_id)

                    if snapshot is None:
                        missing_snapshots += 1
                        invalid_trees.append(
                            {
                                "scope_type": current_scope,
                                "root_id": root_id,
                                "reason": "missing_snapshot",
                                "expected_root_hash": None,
                                "actual_root_hash": _bytes_to_hex(current_hash),
                            }
                        )
                        continue

                    if current_hash != snapshot.root_hash:
                        mismatched_snapshots += 1
                        invalid_trees.append(
                            {
                                "scope_type": current_scope,
                                "root_id": root_id,
                                "reason": "hash_mismatch",
                                "expected_root_hash": _bytes_to_hex(snapshot.root_hash),
                                "actual_root_hash": _bytes_to_hex(current_hash),
                                "snapshot_id": snapshot.id,
                                "snapshot_created_at": snapshot.created_at.isoformat() if snapshot.created_at else None,
                            }
                        )
                        continue

                    valid_trees += 1

            except Exception as exc:
                # Ошибка на уровне scope не должна ломать проверку всех остальных деревьев
                invalid_trees.append(
                    {
                        "scope_type": current_scope,
                        "root_id": None,
                        "reason": "scope_processing_error",
                        "error": str(exc),
                    }
                )
                continue

        is_valid = len(invalid_trees) == 0

        check = IntegrityChecks(
            started_at=datetime.now(timezone.utc),
            reason="manual" if started_by_user_id else "automatic",
            started_by_user_id=started_by_user_id,
            is_valid=is_valid,
            invalid_trees=invalid_trees or None,
        )
        session.add(check)

        # commit сам сделает flush перед записью в БД
        await session.commit()

        return {
            "is_valid": is_valid,
            "checked_trees": checked_trees,
            "valid_trees": valid_trees,
            "missing_snapshots": missing_snapshots,
            "mismatched_snapshots": mismatched_snapshots,
            "invalid_trees": invalid_trees,
        }

    except Exception:
        await session.rollback()
        raise