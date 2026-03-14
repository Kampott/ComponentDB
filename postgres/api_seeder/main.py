from __future__ import annotations

import argparse
import asyncio
from pathlib import Path

from .client import ApiClient
from .progress import build_progress_reporter
from .seed import SeedConfig, Seeder


REPO_ROOT = Path(__file__).resolve().parents[2]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Seed ComponentDB via FastAPI endpoints.")
    parser.add_argument("--base-url", default=default_base_url(), help="Backend base URL, for example http://localhost:8000")
    parser.add_argument("--username", default=default_superuser_email(), help="User email for /auth/login")
    parser.add_argument("--password", default=default_superuser_password(), help="User password for /auth/login")
    parser.add_argument("--prefix", default="seed-techdb", help="Unique prefix for all root trees and event types")
    parser.add_argument("--instances-per-root-object", type=int, default=5)
    parser.add_argument("--events-per-instance-min", type=int, default=10)
    parser.add_argument("--events-per-instance-max", type=int, default=12)
    parser.add_argument("--replacement-probability", type=float, default=0.18)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--concurrency", type=int, default=20)
    parser.add_argument("--progress", choices=("none", "text", "tqdm"), default="text")
    parser.add_argument("--dry-run", action="store_true", help="Build the seeding plan without API writes")
    return parser.parse_args()


def default_base_url() -> str:
    frontend_env = load_env_file(REPO_ROOT / "frontend" / ".env")
    if frontend_env.get("VITE_API_BASE_URL"):
        return frontend_env["VITE_API_BASE_URL"]
    backend_env = load_env_file(REPO_ROOT / "backend" / ".env")
    if backend_env.get("BACKEND_PORT"):
        return f"http://localhost:{backend_env['BACKEND_PORT']}"
    root_env = load_env_file(REPO_ROOT / ".env")
    return f"http://localhost:{root_env.get('BACKEND_PORT', '8000')}"


def default_superuser_email() -> str:
    values = load_env_file(REPO_ROOT / "postgres" / "python_core" / ".env")
    return values.get("SUPERUSER_EMAIL", "root@example.com")


def default_superuser_password() -> str:
    values = load_env_file(REPO_ROOT / "postgres" / "python_core" / ".env")
    return values.get("SUPERUSER_PASSWORD", "changeme")


def load_env_file(path: Path) -> dict[str, str]:
    if not path.exists():
        return {}
    values: dict[str, str] = {}
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        values[key.strip()] = value.strip().strip('"').strip("'")
    return values


async def async_main() -> None:
    args = parse_args()
    progress = build_progress_reporter(args.progress)
    async with ApiClient(base_url=args.base_url, concurrency=args.concurrency) as client:
        try:
            if not args.dry_run:
                await client.login(args.username, args.password)

            config = SeedConfig(
                prefix=args.prefix,
                base_url=args.base_url,
                username=args.username,
                password=args.password,
                instances_per_root_object=args.instances_per_root_object,
                events_per_instance_min=args.events_per_instance_min,
                events_per_instance_max=args.events_per_instance_max,
                replacement_probability=args.replacement_probability,
                seed=args.seed,
                dry_run=args.dry_run,
                concurrency=args.concurrency,
            )
            stats = await Seeder(client=client, config=config, progress=progress).run()
        finally:
            await progress.close()
    print("Seed completed")
    print(f"  prefix: {args.prefix}")
    print(f"  dry_run: {args.dry_run}")
    print(f"  types: {stats.types}")
    print(f"  objects: {stats.objects}")
    print(f"  property_types: {stats.property_types}")
    print(f"  object_properties: {stats.object_properties}")
    print(f"  root_instances: {stats.root_instances}")
    print(f"  instances_total: {stats.instances_total}")
    print(f"  instance_properties: {stats.instance_properties}")
    print(f"  event_types: {stats.event_types}")
    print(f"  event_links: {stats.event_links}")
    print(f"  events: {stats.events}")
    print(f"  replacements: {stats.replacements}")


def main() -> None:
    asyncio.run(async_main())


if __name__ == "__main__":
    main()
