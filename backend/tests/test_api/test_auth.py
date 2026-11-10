import pytest
import time


def test_root_endpoint(client):
    """Test that the API root responds."""
    response = client.get("/")
    assert response.status_code == 404  # No root endpoint exists


def test_auth_login_wrong_credentials(client):
    """Test login endpoint rejects bad credentials."""
    response = client.post(
        "/auth/login",
        data={"username": "wrong@example.com", "password": "wrong"}
    )
    assert response.status_code == 401


def test_auth_login_correct_superuser(client):
    """Test login with super_user credentials works."""
    response = client.post(
        "/auth/login",
        data={"username": "root@example.com", "password": "changeme"}
    )
    assert response.status_code == 200
    assert "access_token" in response.json()
    assert "token_type" in response.json()


def test_register_requires_permission(client):
    """Test register endpoint requires super_user permission."""
    timestamp = int(time.time())
    response = client.post(
        "/auth/register",
        json={"email": f"regtest_{timestamp}@example.com", "password": "test123"}
    )
    assert response.status_code == 401  # no auth header → Unauthorized


def test_access_protected_endpoint_without_token(client):
    """Test that protected endpoints reject requests without token."""
    response = client.get("/types/")
    assert response.status_code in [401, 403]  # requires auth


def test_access_protected_endpoint_with_invalid_token(client):
    """Test that protected endpoints reject invalid tokens."""
    headers = {"Authorization": "Bearer invalid_token_here"}
    response = client.get("/types/", headers=headers)
    assert response.status_code in [401, 403]
