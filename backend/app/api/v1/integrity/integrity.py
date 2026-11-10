from typing import Optional, Literal

from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi.security import OAuth2PasswordBearer

from app.db.database import get_async_session
from app.core.security import get_current_user
from app.crud.auth.auth import require_permission as require_permissions
from app.models.auth import User

from app.crud.integrity.integrity import bootstrap_missing_snapshots
from app.crud.integrity.integrity_check import check_all_integrity
from app.crud.integrity.integrity_rebuild import (
    rebuild_tree_hash,
    rebuild_all_roots,
)

router = APIRouter(prefix="/integrity", tags=["DB: Integrity"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

@router.post("/bootstrap-missing-snapshots")
async def bootstrap_snapshots_endpoint(
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(require_permissions("SUPER_PERMISSION")),
    scope_type: Optional[Literal["types", "objects", "instances"]] = Query(None),
):
    result = await bootstrap_missing_snapshots(
        session=session,
        user_id=current_user.id,
        scope_type=scope_type,
    )

    return result

@router.post("/check-all")
async def check_all_integrity_endpoint(
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(require_permissions("SUPER_PERMISSION")),
    scope_type: Optional[Literal["types", "objects", "instances"]] = Query(
        default=None,
        description="Если указан, проверяется только одно дерево.",
    ),
):
    result = await check_all_integrity(
        session=session,
        started_by_user_id=current_user.id,
        scope_type=scope_type,
    )
    return result

@router.post("/rebuild-tree")
async def rebuild_single_tree(
    scope_type: str = Query(..., pattern="^(types|objects|instances)$"),
    root_id: int = Query(...),
    delete_old: bool = Query(False),

    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user),
):
    try:
        async with session.begin():
            new_hash = await rebuild_tree_hash(
                session=session,
                scope_type=scope_type,
                root_id=root_id,
                changed_by_user_id=current_user.id,
                delete_old=delete_old,
            )

        return {
            "status": "ok",
            "scope_type": scope_type,
            "root_id": root_id,
            "new_hash": new_hash.hex(),
        }

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/rebuild-all")
async def rebuild_all(
    scope_type: Optional[str] = Query(None, pattern="^(types|objects|instances)$"),
    delete_old: bool = Query(False),

    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user),
):
    result = await rebuild_all_roots(
        session=session,
        scope_type=scope_type,
        changed_by_user_id=current_user.id,
        delete_old=delete_old,
    )

    return {
        "status": "ok",
        **result,
    }