import sys
import os
from pathlib import Path

# Add backend root to sys.path so the 'app' package is discoverable
_backend_root = Path(__file__).parent.parent
if str(_backend_root) not in sys.path:
    sys.path.append(str(_backend_root))

import pytest
import httpx

SUPERUSER_EMAIL = os.getenv("SUPERUSER_EMAIL", "root@example.com")
SUPERUSER_PASSWORD = os.getenv("SUPERUSER_PASSWORD", "changeme")

# The backend is running inside the same container
# Use localhost and the backend port from environment
BACKEND_URL = "http://localhost:8000"


@pytest.fixture(scope="session")
def client():
    """Create a synchronous HTTP client for the running backend."""
    with httpx.Client(base_url=BACKEND_URL) as c:
        yield c


@pytest.fixture(scope="session")
def super_user_headers(client):
    """Get authentication headers for the super_user."""
    response = client.post(
        "/auth/login",
        data={"username": SUPERUSER_EMAIL, "password": SUPERUSER_PASSWORD}
    )
    assert response.status_code == 200, f"Super user login failed: {response.text}"
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def created_test_objects():
    """Track created object IDs for cleanup."""
    created = {
        "types": [],
        "objects": [],
        "instances": [],
        "users": [],
        "roles": [],
        "event_types": [],
    }
    yield created


def _cleanup_objects(client, headers, created):
    """Delete all test data created during tests."""
    # Delete in dependency order: instances -> objects -> types
    for instance_id in created.get("instances", []):
        try:
            client.delete(f"/instances/{instance_id}", headers=headers)
        except Exception:
            pass
    
    for object_id in created.get("objects", []):
        try:
            client.delete(f"/objects/{object_id}", headers=headers)
        except Exception:
            pass
    
    for type_id in created.get("types", []):
        try:
            client.delete(f"/types/{type_id}", headers=headers)
        except Exception:
            pass
    
    for user_id in created.get("users", []):
        try:
            client.delete(f"/users/{user_id}", headers=headers)
        except Exception:
            pass
    
    for role_id in created.get("roles", []):
        try:
            client.delete(f"/user_roles/{role_id}", headers=headers)
        except Exception:
            pass
    
    for event_type_id in created.get("event_types", []):
        try:
            client.delete(f"/event_types/{event_type_id}", headers=headers)
        except Exception:
            pass


@pytest.fixture
def cleanup_test_data(client, super_user_headers, created_test_objects):
    """Cleanup fixture that deletes test data after test completes."""
    yield
    _cleanup_objects(client, super_user_headers, created_test_objects)
