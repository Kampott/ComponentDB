from typing import Optional, Literal
import uuid

from sqlalchemy.ext.asyncio import AsyncSession
from app.services.integrity_service import compute_scope_root_hash
from app.models.integrity import IntegritySnapshot
from datetime import datetime, timezone

ScopeType = Literal["types", "objects", "instances"]

async def update_merkle_snapshot_no_commit(
    session: AsyncSession,
    scope_type: ScopeType,
    root_id: int,
    changed_by_user_id: Optional[uuid.UUID] = None,
):
    root_hash = await compute_scope_root_hash(
        session=session,
        scope_type=scope_type,
        root_id=root_id,
    )

    snapshot = IntegritySnapshot(
        scope_type=scope_type,
        root_id=root_id,
        root_hash=root_hash,
        created_at=datetime.now(timezone.utc),
        changed_by_user_id=changed_by_user_id,
    )
    session.add(snapshot)
    await session.flush()   # только отправка в текущую транзакцию, без commit
    return root_hash