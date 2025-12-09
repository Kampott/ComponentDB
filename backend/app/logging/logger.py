import asyncio
import json
import traceback
from datetime import datetime, timezone

from sqlalchemy.exc import SQLAlchemyError
from app.models.log import APILog  # Adjusted import to match assumed model location

async def worker(queue: asyncio.Queue, async_session_maker, stop_event: asyncio.Event):
    print("[worker] Worker function started")  # Debug: confirm entry
    BATCH_SIZE = 1  # Adjust as needed
    batch = []

    while True:
        try:
            record = await queue.get()
            if record is None:
                print("[worker] Received sentinel, draining batch and exiting")
                break  # Sentinel for shutdown

            print(f"[worker] Got record: {record.get('method')} {record.get('path')} | user_id: {record.get('user_id')}")

            log = APILog(
                ts=record.get("ts"),
                user_id=record.get("user_id"),
                method=record.get("method"),
                path=record.get("path"),
                status_code=int(record.get("status_code") or 0),
                duration_ms=float(record.get("duration_ms") or 0.0),
                resource=record.get("resource"),
                action=record.get("action"),
                details=record.get("details"),
            )
            batch.append(log)

            if len(batch) >= BATCH_SIZE:
                async with async_session_maker() as session:
                    session.add_all(batch)
                    await session.commit()
                print(f"[worker] Committed batch of {len(batch)} logs")
                batch = []
        except Exception as exc:
            tb = traceback.format_exc()
            print(f"[worker] Error in loop: {exc}\n{tb}")
            if isinstance(record, dict):  # Fallback only if record valid
                try:
                    with open("/tmp/log_fallback.jsonl", "a") as f:
                        f.write(json.dumps(record, default=str) + "\n")
                except Exception:
                    print("[worker] Failed to write fallback log")
        finally:
            queue.task_done()

    # Drain any remaining batch on exit
    if batch:
        try:
            async with async_session_maker() as session:
                session.add_all(batch)
                await session.commit()
            print(f"[worker] Committed final batch of {len(batch)} logs")
        except Exception as exc:
            print(f"[worker] Error committing final batch: {exc}")

    print("[worker] exiting")