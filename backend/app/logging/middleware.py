import asyncio, json, time
from datetime import datetime, timezone
from fastapi import Request
from starlette.types import ASGIApp, Receive, Scope, Send
from fastapi.responses import Response

async def logging_middleware(request: Request, call_next):
    start = time.perf_counter()
    try:
        response = await call_next(request)
        status_code = response.status_code
    except Exception:
        status_code = 500
        raise
    finally:
        duration_ms = (time.perf_counter() - start) * 1000.0
        ctx = getattr(request.state, "log_context", {}) or {}

        record = {
            "ts": datetime.now(timezone.utc),
            "user_id": ctx.get("user_id"),
            "method": request.method,
            "path": request.url.path,
            "status_code": status_code,
            "duration_ms": float(duration_ms),
            "resource": ctx.get("resource"),
            "action": ctx.get("action"),
            "details": ctx.get("details"),
        }
        if not (record.get("resource") or record.get("action")):
                    return response
        queue = getattr(request.app.state, "log_queue", None)
        if queue:
            try:
                queue.put_nowait(record)
                print(f"[middleware] Put record into queue for {request.method} {request.url.path}, qsize now: {queue.qsize()}")
            except asyncio.QueueFull:
                # fallback: write to file to not lose logs
                print("[middleware] Queue full, falling back to file")
                try:
                    with open("/tmp/log_fallback.jsonl", "a") as f:
                        f.write(json.dumps(record, default=str) + "\n")
                except Exception:
                    pass

    return response