import asyncio
import traceback
import os
from app.crud.integrity.integrity_check import check_all_integrity

async def periodic_integrity_check(async_session, stop_event: asyncio.Event):
    integrity_interval_hours = float(os.getenv("INTEGRITY_CHECK_INTERVAL_HOURS", "24"))
    interval_seconds = integrity_interval_hours * 3600

    # Run first check immediately
    print("[integrity] Starting initial integrity check...")
    try:
        async with async_session() as session:
            result = await check_all_integrity(session=session)
        print(f"[integrity] Initial check completed: {result}")
    except Exception:
        print(f"[integrity] Initial check failed: {traceback.format_exc()}")

    while not stop_event.is_set():  # <- проверка здесь уже есть, но...
        print("[integrity] Starting scheduled integrity check...")
        try:
            async with async_session() as session:
                result = await check_all_integrity(session=session)
            print(f"[integrity] Check completed: {result}")
        except Exception:
            print(f"[integrity] Check failed: {traceback.format_exc()}")

        try:
            await asyncio.wait_for(stop_event.wait(), timeout=interval_seconds)
            break
        except asyncio.TimeoutError:
            pass