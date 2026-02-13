import asyncio
import json
import traceback
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from sqlalchemy.exc import SQLAlchemyError
from app.models.log import APILog
from app.logging.health import check_log_db_health

FALLBACK_FILE = "/tmp/log_fallback.jsonl"


def _to_datetime(value) -> Optional[datetime]:
    """Try to convert value to a datetime, or return None if not possible."""
    if value is None:
        return None
    if isinstance(value, datetime):
        return value
    if isinstance(value, str):
        try:
            # try isoformat first
            return datetime.fromisoformat(value)
        except Exception:
            try:
                # last-resort: parse as timestamp float/int string
                ts = float(value)
                return datetime.fromtimestamp(ts, tz=timezone.utc)
            except Exception:
                return None
    # fallback
    return None


async def recover_fallback_logs(async_session_maker):
    """Attempt to read fallback JSONL logs and write them to DB.
    The file is truncated after a successful batch insert."""
    fallback_path = Path(FALLBACK_FILE)

    if not fallback_path.exists() or fallback_path.stat().st_size == 0:
        return

    print("[worker] Recovering logs from fallback file...")

    records = []

    try:
        # stream-read to avoid loading everything into memory
        with fallback_path.open("r") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    record = json.loads(line)
                except Exception as e:
                    print(f"[worker] Failed to parse fallback log line: {e} -- line: {line!r}")
                    continue

                ts = _to_datetime(record.get("ts"))
                log = APILog(
                    ts=ts,
                    user_id=record.get("user_id"),
                    method=record.get("method"),
                    path=record.get("path"),
                    status_code=int(record.get("status_code") or 0),
                    duration_ms=float(record.get("duration_ms") or 0.0),
                    resource=record.get("resource"),
                    action=record.get("action"),
                    details=record.get("details"),
                )
                records.append(log)

        if not records:
            return

        # insert in DB using transaction context manager
        try:
            async with async_session_maker() as session:
                async with session.begin():
                    session.add_all(records)
            # truncate the fallback file only after successful commit
            with fallback_path.open("w") as f:
                f.truncate(0)
            print(f"[worker] Recovered {len(records)} logs from fallback")
        except Exception as e:
            print(f"[worker] Failed inserting recovered logs to DB: {e}")
            # keep fallback file intact for next attempt
            return

    except Exception as e:
        print(f"[worker] Failed to recover fallback logs: {e}")


async def _write_batch_to_fallback(batch):
    """Append an iterable of APILog instances (or dict-like) to the fallback file."""
    try:
        with open(FALLBACK_FILE, "a") as f:
            for log_obj in batch:
                # handle both APILog instances and plain dicts
                if isinstance(log_obj, dict):
                    f.write(json.dumps(log_obj, default=str) + "\n")
                else:
                    ts = getattr(log_obj, "ts", None)
                    ts_s = ts.isoformat() if isinstance(ts, datetime) else str(ts)
                    f.write(json.dumps({
                        "ts": ts_s,
                        "user_id": str(getattr(log_obj, "user_id", None)) if getattr(log_obj, "user_id", None) is not None else None,
                        "method": getattr(log_obj, "method", None),
                        "path": getattr(log_obj, "path", None),
                        "status_code": getattr(log_obj, "status_code", None),
                        "duration_ms": getattr(log_obj, "duration_ms", None),
                        "resource": getattr(log_obj, "resource", None),
                        "action": getattr(log_obj, "action", None),
                        "details": getattr(log_obj, "details", None),
                    }, default=str) + "\n")
    except Exception as e:
        print(f"[worker] Failed to write batch to fallback: {e}")


async def worker(queue: asyncio.Queue, async_session_maker, stop_event: asyncio.Event):
    print("[worker] Worker function started")

    BATCH_SIZE = int(os.getenv("LOG_BATCH_SIZE", "50"))
    RECONNECT_INTERVAL = int(os.getenv("LOG_RECONNECT_INTERVAL_SECONDS", "30"))
    FLUSH_INTERVAL = int(os.getenv("LOG_FLUSH_INTERVAL_SECONDS", "5"))  # flush small batches periodically

    batch = []
    db_healthy = await check_log_db_health()
    last_health_check = asyncio.get_running_loop().time()
    last_flush_time = last_health_check

    # Try to recover fallback logs on startup
    if db_healthy:
        await recover_fallback_logs(async_session_maker)

    while not stop_event.is_set():
        record = None
        try:
            # Periodic health check
            current_time = asyncio.get_running_loop().time()
            if current_time - last_health_check >= RECONNECT_INTERVAL:
                db_healthy = await check_log_db_health()
                last_health_check = current_time

                if db_healthy:
                    print("[worker] Log DB is healthy")
                    # Try to recover fallback logs if DB just became healthy
                    await recover_fallback_logs(async_session_maker)
                else:
                    print("[worker] Log DB is unhealthy, using fallback")

            # Try to get a record with timeout
            try:
                record = await asyncio.wait_for(queue.get(), timeout=1.0)
            except asyncio.TimeoutError:
                # Periodic flush for small batches
                now = asyncio.get_running_loop().time()
                if batch and (now - last_flush_time >= FLUSH_INTERVAL):
                    if db_healthy:
                        try:
                            async with async_session_maker() as session:
                                async with session.begin():
                                    session.add_all(batch)
                            print(f"[worker] Flushed small batch of {len(batch)} logs")
                            batch = []
                        except Exception as e:
                            print(f"[worker] Failed to flush small batch: {e}")
                            db_healthy = False
                            await _write_batch_to_fallback(batch)
                            batch = []
                    else:
                        # DB unhealthy: persist batch to fallback
                        await _write_batch_to_fallback(batch)
                        batch = []
                    last_flush_time = now
                continue  # go back to loop

            # if we got here we have an item from queue
            if record is None:
                # sentinel -> mark task done and exit
                try:
                    queue.task_done()
                except Exception:
                    pass
                print("[worker] Received sentinel, draining batch and exiting")
                break

            # Process record
            try:
                # Normalize ts to datetime if possible
                ts = record.get("ts")
                ts_parsed = _to_datetime(ts)

                log = APILog(
                    ts=ts_parsed,
                    user_id=record.get("user_id"),
                    method=record.get("method"),
                    path=record.get("path"),
                    status_code=int(record.get("status_code") or 0),
                    duration_ms=float(record.get("duration_ms") or 0.0),
                    resource=record.get("resource"),
                    action=record.get("action"),
                    details=record.get("details"),
                )

                print(f"[worker] Got record: {log.method} {log.path} | user_id: {log.user_id}")

                if db_healthy:
                    batch.append(log)

                    if len(batch) >= BATCH_SIZE:
                        try:
                            async with async_session_maker() as session:
                                async with session.begin():
                                    session.add_all(batch)
                            print(f"[worker] Committed batch of {len(batch)} logs")
                            batch = []
                            last_flush_time = asyncio.get_running_loop().time()
                        except Exception as e:
                            print(f"[worker] Error committing batch: {e}")
                            db_healthy = False
                            await _write_batch_to_fallback(batch)
                            batch = []
                else:
                    # DB unhealthy, write record immediately to fallback
                    await _write_batch_to_fallback([record])

            finally:
                # ensure task_done for the item we got
                try:
                    queue.task_done()
                except Exception:
                    pass

        except Exception as exc:
            tb = traceback.format_exc()
            print(f"[worker] Error in loop: {exc}\n{tb}")
            # If record exists (we took it from the queue) write it to fallback
            try:
                if record is not None:
                    await _write_batch_to_fallback([record])
            except Exception:
                print("[worker] Failed to write fallback log for failed iteration")

    # Drain remaining batch on exit
    if batch:
        if db_healthy:
            try:
                async with async_session_maker() as session:
                    async with session.begin():
                        session.add_all(batch)
                print(f"[worker] Committed final batch of {len(batch)} logs")
            except Exception as exc:
                print(f"[worker] Error committing final batch: {exc}")
                await _write_batch_to_fallback(batch)
        else:
            await _write_batch_to_fallback(batch)

    print("[worker] exiting")