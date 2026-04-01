from typing import Any, Optional, Protocol, Callable
from fastapi import Request, Depends
from app.core.security import get_current_user
from app.models.auth import User


class LogCallable(Protocol):
    async def __call__(
        self,
        action: Optional[str] = None,
        details: Optional[dict[str, Any]] = None,
    ) -> None: ...


def LoggerInterface(resource: Optional[str] = None) -> Callable[..., object]:
    """
    Factory dependency. Use like: log: LogCallable = Depends(LoggerInterface("types"))
    - resource: optional logical resource name (e.g. "types", "instances")
    """
    
    if resource == "auth":
        # For auth endpoints, don't require current_user
        async def auth_dep(request: Request) -> LogCallable:
            ctx = getattr(request.state, "log_context", None)
            if ctx is None:
                request.state.log_context = {}
                ctx = request.state.log_context

            if resource:
                ctx.setdefault("resource", resource)

            async def _log(action: Optional[str] = None, details: Optional[dict] = None):
                if action:
                    ctx["action"] = action
                if details:
                    existing = ctx.get("details") or {}
                    if not isinstance(existing, dict):
                        existing = {}
                    existing.update(details)
                    ctx["details"] = existing

            return _log
        
        return auth_dep
    else:
        # For normal endpoints, require current_user
        async def user_dep(request: Request, current_user: User = Depends(get_current_user)) -> LogCallable:
            ctx = getattr(request.state, "log_context", None)
            if ctx is None:
                request.state.log_context = {}
                ctx = request.state.log_context

            ctx.setdefault("user_id", getattr(current_user, "id", None))
            if resource:
                ctx.setdefault("resource", resource)

            async def _log(action: Optional[str] = None, details: Optional[dict] = None):
                if action:
                    ctx["action"] = action
                if details:
                    existing = ctx.get("details") or {}
                    if not isinstance(existing, dict):
                        existing = {}
                    existing.update(details)
                    ctx["details"] = existing

            return _log
        
        return user_dep
