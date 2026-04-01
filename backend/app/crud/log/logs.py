from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import insert
from app.models.log import APILog
from datetime import datetime
from typing import List

async def create_log(session: AsyncSession, log_obj: dict) -> APILog:
    """
    log_obj keys: user_id, method, path, status_code, duration_ms, resource, action, details
    """
    log = APILog(
        ts = datetime.utcnow(),
        user_id = log_obj.get("user_id"),
        method = log_obj["method"],
        path = log_obj["path"],
        status_code = log_obj["status_code"],
        duration_ms = log_obj["duration_ms"],
        resource = log_obj.get("resource"),
        action = log_obj.get("action"),
        details = log_obj.get("details"),
    )
    session.add(log)
    await session.flush()  # doesn't commit
    return log

async def create_logs_bulk(session: AsyncSession, logs: List[dict]) -> None:
    records = [{
        "ts": l.get("ts", datetime.utcnow()),
        "user_id": l.get("user_id"),
        "method": l["method"],
        "path": l["path"],
        "status_code": l["status_code"],
        "duration_ms": l["duration_ms"],
        "resource": l.get("resource"),
        "action": l.get("action"),
        "details": l.get("details"),
    } for l in logs]
    """
    records — список словарей с ключами: user_id, method, path, status_code, duration_ms, resource, action, details, ts(optional)
    Используем insert(...).values(list_of_dicts) — это efficient bulk insert.
    """
    if not records:
        return

    # Нормализуем поля (если нужно): например, ensure duration_ms is float, strip oversized strings, convert uuid -> str etc.
    for r in records:
        if "duration_ms" in r:
            r["duration_ms"] = float(r["duration_ms"])

    query = insert(APILog).values(records)
    await session.execute(query)
