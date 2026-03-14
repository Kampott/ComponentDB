from __future__ import annotations

import asyncio
from dataclasses import dataclass


@dataclass(frozen=True)
class ProgressPhase:
    key: str
    total: int


class ProgressReporter:
    async def add_phase(self, key: str, total: int) -> None:
        raise NotImplementedError

    async def advance(self, key: str, amount: int = 1) -> None:
        raise NotImplementedError

    async def close(self) -> None:
        raise NotImplementedError


class NullProgressReporter(ProgressReporter):
    async def add_phase(self, key: str, total: int) -> None:
        return None

    async def advance(self, key: str, amount: int = 1) -> None:
        return None

    async def close(self) -> None:
        return None


class TextProgressReporter(ProgressReporter):
    def __init__(self) -> None:
        self._lock = asyncio.Lock()
        self._totals: dict[str, int] = {}
        self._current: dict[str, int] = {}
        self._last_percent: dict[str, int] = {}

    async def add_phase(self, key: str, total: int) -> None:
        async with self._lock:
            self._totals[key] = total
            self._current[key] = 0
            self._last_percent[key] = -1
            print(f"[progress] {key}: 0/{total}")

    async def advance(self, key: str, amount: int = 1) -> None:
        async with self._lock:
            total = self._totals.get(key, 0)
            current = min(self._current.get(key, 0) + amount, total if total > 0 else amount)
            self._current[key] = current
            if total <= 0:
                print(f"[progress] {key}: {current}")
                return
            percent = int((current / total) * 100)
            if percent == 100 or percent >= self._last_percent[key] + 10:
                self._last_percent[key] = percent
                print(f"[progress] {key}: {current}/{total} ({percent}%)")

    async def close(self) -> None:
        return None


class TqdmProgressReporter(ProgressReporter):
    def __init__(self) -> None:
        try:
            from tqdm import tqdm
        except ImportError as exc:
            raise RuntimeError("Progress mode 'tqdm' requires the 'tqdm' package") from exc
        self._tqdm = tqdm
        self._bars: dict[str, object] = {}
        self._lock = asyncio.Lock()
        self._position = 0

    async def add_phase(self, key: str, total: int) -> None:
        async with self._lock:
            bar = self._tqdm(total=total, desc=key, position=self._position, leave=True)
            self._bars[key] = bar
            self._position += 1

    async def advance(self, key: str, amount: int = 1) -> None:
        async with self._lock:
            bar = self._bars.get(key)
            if bar is not None:
                bar.update(amount)

    async def close(self) -> None:
        async with self._lock:
            for bar in self._bars.values():
                bar.close()
            self._bars.clear()


def build_progress_reporter(mode: str) -> ProgressReporter:
    if mode == "none":
        return NullProgressReporter()
    if mode == "text":
        return TextProgressReporter()
    if mode == "tqdm":
        return TqdmProgressReporter()
    raise ValueError(f"Unknown progress mode: {mode}")
