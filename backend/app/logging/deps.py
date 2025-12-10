import typing
from typing import Optional, Callable, Awaitable
from fastapi import Request, Depends
from app.core.security import get_current_user
from app.models.auth import User

LogCallable = Callable[[Optional[str], Optional[dict]], Awaitable[None]]


def LoggerInterface(resource: Optional[str] = None) -> Callable[..., Awaitable[LogCallable]]:
    """
    Factory dependency. Use like: log: LogCallable = Depends(LoggerInterface("types"))
    - resource: optional logical resource name (e.g. "types", "instances")
    """
    async def _dep(request: Request, current_user: User = Depends(get_current_user)) -> LogCallable:
        # ensure log_context exists
        ctx = getattr(request.state, "log_context", None)
        if ctx is None:
            request.state.log_context = {}
            ctx = request.state.log_context

        # set basic context (don't overwrite if already set by middleware or other deps)
        ctx.setdefault("user_id", getattr(current_user, "id", None))
        if resource:
            ctx.setdefault("resource", resource)

        async def _log(action: Optional[str] = None, details: Optional[dict] = None):
            # mutate context so middleware will pick it up after response
            if action:
                ctx["action"] = action
            if details:
                # be careful: do not put sensitive fields (passwords, tokens)
                existing = ctx.get("details") or {}
                if not isinstance(existing, dict):
                    existing = {}
                # shallow merge
                existing.update(details)
                ctx["details"] = existing

        return _log

    return _dep