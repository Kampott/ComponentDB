from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date, datetime
from typing import Any


class ApiError(RuntimeError):
    pass


@dataclass
class ApiClient:
    base_url: str
    timeout: float = 30.0
    concurrency: int = 20
    _access_token: str | None = field(default=None, init=False)
    _client: Any = field(default=None, init=False)
    _httpx: Any = field(default=None, init=False)
    _semaphore: Any = field(default=None, init=False)
    _httpx_import_error: Exception | None = field(default=None, init=False)
    _username: str | None = field(default=None, init=False)
    _password: str | None = field(default=None, init=False)
    _auth_lock: Any = field(default=None, init=False)

    async def __aenter__(self) -> "ApiClient":
        import asyncio

        self.base_url = self.base_url.rstrip("/")
        self._semaphore = asyncio.Semaphore(self.concurrency)
        self._auth_lock = asyncio.Lock()
        try:
            import httpx
            self._httpx = httpx
            self._client = httpx.AsyncClient(
                base_url=self.base_url,
                timeout=self.timeout,
                headers={"Accept": "application/json"},
            )
        except ImportError as exc:
            self._httpx_import_error = exc
        return self

    async def __aexit__(self, exc_type, exc, tb) -> None:
        if self._client is not None:
            await self._client.aclose()

    async def login(self, username: str, password: str) -> None:
        self._username = username
        self._password = password
        response = await self._request(
            "POST",
            "/auth/login",
            data={"username": username, "password": password},
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            retry_on_401=False,
        )
        token = response.get("access_token")
        if not token:
            raise ApiError("Login succeeded without access token")
        self._access_token = token
        self._client.headers["Authorization"] = f"Bearer {token}"

    async def get(self, path: str, query: dict[str, Any] | None = None) -> Any:
        return await self._request("GET", path, params=self._to_jsonable(query) if query else query)

    async def post(self, path: str, payload: dict[str, Any] | None = None) -> Any:
        return await self._request("POST", path, json=self._to_jsonable(payload or {}))

    async def patch(self, path: str, payload: dict[str, Any]) -> Any:
        return await self._request("PATCH", path, json=self._to_jsonable(payload))

    def _to_jsonable(self, value: Any) -> Any:
        if isinstance(value, datetime | date):
            return value.isoformat()
        if isinstance(value, dict):
            return {key: self._to_jsonable(item) for key, item in value.items()}
        if isinstance(value, list):
            return [self._to_jsonable(item) for item in value]
        if isinstance(value, tuple):
            return [self._to_jsonable(item) for item in value]
        return value

    async def _request(self, method: str, path: str, retry_on_401: bool = True, **kwargs: Any) -> Any:
        if self._client is None:
            if self._httpx_import_error is not None:
                raise RuntimeError(
                    "postgres.api_seeder now requires 'httpx'. Install it before running the seeder."
                ) from self._httpx_import_error
            raise RuntimeError("ApiClient must be used as an async context manager")

        async with self._semaphore:
            response = await self._client.request(method, path, **kwargs)

        if response.status_code == 401 and retry_on_401 and path != "/auth/login":
            await self._relogin(response.request.headers.get("Authorization"))
            async with self._semaphore:
                response = await self._client.request(method, path, **kwargs)

        if response.is_error:
            raise ApiError(
                f"{method} {self.base_url}/{path.lstrip('/')} failed: "
                f"{response.status_code} {response.text}"
            )
        if response.status_code == 204 or not response.content:
            return None
        return response.json()

    async def _relogin(self, failed_authorization: str | None) -> None:
        if not self._username or not self._password:
            raise ApiError("Received 401 but no stored credentials are available for relogin")
        async with self._auth_lock:
            if failed_authorization != self._client.headers.get("Authorization"):
                return
            response = await self._request(
                "POST",
                "/auth/login",
                data={"username": self._username, "password": self._password},
                headers={"Content-Type": "application/x-www-form-urlencoded"},
                retry_on_401=False,
            )
            token = response.get("access_token")
            if not token:
                raise ApiError("Relogin succeeded without access token")
            self._access_token = token
            self._client.headers["Authorization"] = f"Bearer {token}"
