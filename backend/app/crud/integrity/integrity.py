from typing import Optional, Literal, Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.core import Types, Objects, Instances
from app.models.integrity import IntegritySnapshot
from app.services.integrity_service import rebuild_and_store_snapshot


ScopeType = Literal["types", "objects", "instances"]


async def bootstrap_missing_snapshots(
    session: AsyncSession,
    user_id,
    scope_type: Optional[ScopeType] = None,
) -> dict[str, Any]:
    scopes: list[tuple[str, type]] = [
        ("types", Types),
        ("objects", Objects),
        ("instances", Instances),
    ]

    if scope_type is not None:
        scopes = [item for item in scopes if item[0] == scope_type]

    created = 0
    skipped = 0
    details = {"types": [], "objects": [], "instances": []}
    errors = []

    for current_scope, model in scopes:
        roots_result = await session.execute(
            select(model.id).where(model.parent_id.is_(None))
        )
        root_ids = list(roots_result.scalars().all())

        existing_result = await session.execute(
            select(IntegritySnapshot.root_id).where(
                IntegritySnapshot.scope_type == current_scope
            )
        )
        existing_root_ids = set(existing_result.scalars().all())

        for root_id in root_ids:
            if root_id in existing_root_ids:
                skipped += 1
                continue

            try:
                root_hash = await rebuild_and_store_snapshot(
                    session=session,
                    scope_type=current_scope,
                    root_id=root_id,
                    changed_by_user_id=user_id,
                )
                if root_hash is None:
                    skipped += 1
                    continue

                await session.commit()   # фиксируем один root
                created += 1
                details[current_scope].append(root_id)

            except Exception as exc:
                await session.rollback()
                errors.append(
                    {
                        "scope_type": current_scope,
                        "root_id": root_id,
                        "error": str(exc),
                    }
                )

    return {
        "created": created,
        "skipped": skipped,
        "errors": errors,
        "details": details,
    }