# app/logging/worker.py
import asyncio
import json
import time
from typing import Any, Dict, List
from app.crud.log.logs import create_logs_bulk
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import sessionmaker
from datetime import datetime

BATCH_SIZE = 50
BATCH_TIMEOUT = 2.0  # seconds

async def worker(queue: "asyncio.Queue", session_maker: sessionmaker, stop_event: asyncio.Event):
    buffer: List[Dict[str, Any]] = []
    last_flush = time.time()

    while not stop_event.is_set():
        try:
            timeout = max(0, BATCH_TIMEOUT - (time.time() - last_flush))
            item = await asyncio.wait_for(queue.get(), timeout=timeout)
            # добавляем временную метку, если нет
            if "ts" not in item:
                item["ts"] = datetime.now(timezone.utc)
            buffer.append(item)
            queue.task_done()
        except asyncio.TimeoutError:
            item = None

        if len(buffer) >= BATCH_SIZE or (buffer and (time.time() - last_flush) >= BATCH_TIMEOUT):
            try:
                async with session_maker() as session:  # session_maker == async_session
                    async with session.begin():
                        await create_logs_bulk(session, buffer)
                buffer.clear()
                last_flush = time.time()
            except Exception as e:
                print("Log worker write error:", e)
                # fallback: записать локально
                try:
                    with open("/tmp/log_fallback.jsonl", "a") as f:
                        for rec in buffer:
                            f.write(json.dumps(rec, default=str) + "\n")
                except Exception:
                    pass
                buffer.clear()
                last_flush = time.time()

    # final flush
    if buffer:
        try:
            async with session_maker() as session:
                async with session.begin():
                    await create_logs_bulk(session, buffer)
        except Exception as e:
            print("Final flush failed:", e)