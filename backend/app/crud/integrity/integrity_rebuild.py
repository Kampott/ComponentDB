from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Literal, Optional

from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.core import Types, Objects, Instances
from app.models.integrity import IntegritySnapshot
from app.services.integrity_service import compute_scope_root_hash

ScopeType = Literal["types", "objects", "instances"]


MODEL_MAP = {
    "types": Types,
    "objects": Objects,
    "instances": Instances,
}


async def rebuild_tree_hash(
    session: AsyncSession,
    scope_type: ScopeType,
    root_id: int,
    changed_by_user_id: Optional[uuid.UUID] = None,
    delete_old: bool = False,
) -> bytes:
    """
    Пересчитывает Merkle root и сохраняет новый snapshot.

    delete_old=True → удаляет старые snapshot'ы (режим "починки")
    """

    model = MODEL_MAP[scope_type]

    # Проверка: существует ли root
    root = await session.get(model, root_id)
    if not root:
        raise ValueError(f"{scope_type} root {root_id} not found")

    if root.parent_id is not None:
        raise ValueError(f"{scope_type} {root_id} is not a root")

    # --- 1. считаем новый hash ---
    new_hash = await compute_scope_root_hash(
        session=session,
        scope_type=scope_type,
        root_id=root_id,
    )

    # --- 2. optionally удаляем старые snapshot ---
    if delete_old:
        await session.execute(
            delete(IntegritySnapshot).where(
                IntegritySnapshot.scope_type == scope_type,
                IntegritySnapshot.root_id == root_id,
            )
        )

    # --- 3. создаём новый snapshot ---
    snapshot = IntegritySnapshot(
        scope_type=scope_type,
        root_id=root_id,
        root_hash=new_hash,
        created_at=datetime.now(timezone.utc),
        changed_by_user_id=changed_by_user_id,
    )

    session.add(snapshot)

    # ВАЖНО: flush, но не commit (контролирует вызывающий код)
    await session.flush()

    return new_hash


async def rebuild_all_roots(
    session: AsyncSession,
    scope_type: Optional[ScopeType] = None,
    changed_by_user_id: Optional[uuid.UUID] = None,
    delete_old: bool = False,
) -> dict:
    scopes = [
        ("types", Types),
        ("objects", Objects),
        ("instances", Instances),
    ]

    if scope_type:
        scopes = [s for s in scopes if s[0] == scope_type]

    rebuilt = 0
    errors = []

    try:
        for scope_name, model in scopes:
            roots_result = await session.execute(
                select(model.id).where(model.parent_id.is_(None))
            )
            root_ids = list(roots_result.scalars().all())

            for root_id in root_ids:
                try:
                    await rebuild_tree_hash(
                        session=session,
                        scope_type=scope_name,
                        root_id=root_id,
                        changed_by_user_id=changed_by_user_id,
                        delete_old=delete_old,
                    )
                    rebuilt += 1
                except Exception as e:
                    errors.append({
                        "scope_type": scope_name,
                        "root_id": root_id,
                        "error": str(e),
                    })

        await session.commit()

    except Exception:
        await session.rollback()
        raise

    return {
        "rebuilt": rebuilt,
        "errors": errors,
    }