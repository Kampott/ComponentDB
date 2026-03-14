from pathlib import Path
import os

from dotenv import load_dotenv


CORE_DIR = Path(__file__).resolve().parents[1]
CORE_ENV_FILE = CORE_DIR / ".env"

_env_loaded = False


def load_core_env() -> Path:
    global _env_loaded

    if not _env_loaded:
        load_dotenv(CORE_ENV_FILE, override=False)
        _env_loaded = True

    return CORE_ENV_FILE


def get_required_env(name: str) -> str:
    load_core_env()
    value = os.getenv(name)
    if not value:
        raise RuntimeError(
            f"{name} is not set. Define it in {CORE_ENV_FILE} or pass it explicitly in the environment."
        )
    return value
