import pytest
import time


def test_create_type_missing_name(client, super_user_headers):
    """POST /types/ with {} (missing name), verify 422."""
    resp = client.post("/types/", json={}, headers=super_user_headers)
    assert resp.status_code == 422


def test_create_type_empty_name(client, super_user_headers):
    """POST /types/ with {"name": ""}, verify behavior."""
    resp = client.post(
        "/types/",
        json={"name": "", "parent_id": None},
        headers=super_user_headers
    )
    # Accept 200 (if lenient) or 422 (if strict)
    assert resp.status_code in [200, 422]


def test_create_object_nonexistent_type(client, super_user_headers):
    """POST /objects/ with type_id=99999, verify 404."""
    resp = client.post(
        "/objects/",
        json={"name": "Test", "type_id": 99999},
        headers=super_user_headers
    )
    assert resp.status_code == 404


def test_update_nonexistent_type(client, super_user_headers):
    """PATCH /types/99999, verify 404."""
    resp = client.patch(
        "/types/99999",
        json={"name": "NewName"},
        headers=super_user_headers
    )
    assert resp.status_code == 404


def test_delete_nonexistent_type_204_idempotent(client, super_user_headers):
    """Verify deleting already-deleted type returns 404 (not idempotent)."""
    resp = client.delete("/types/99999", headers=super_user_headers)
    assert resp.status_code == 404


def test_create_type_very_long_name(client, super_user_headers):
    """POST /types/ with 500-char name, verify behavior."""
    long_name = "A" * 500
    resp = client.post(
        "/types/",
        json={"name": long_name, "parent_id": None},
        headers=super_user_headers
    )
    # Accept 200 (if truncated) or 422 (if validation error)
    assert resp.status_code in [200, 422]


def test_invalid_json_in_request(client, super_user_headers):
    """POST /types/ with invalid JSON body, verify 422."""
    # Use data instead of json to send invalid JSON
    resp = client.post(
        "/types/",
        data="not valid json",
        headers={**super_user_headers, "Content-Type": "application/json"}
    )
    assert resp.status_code == 422
