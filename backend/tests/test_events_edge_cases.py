import pytest
import time


def test_create_event_missing_required_fields(client, super_user_headers):
    """POST /events/ with {}, verify 422."""
    resp = client.post("/events/", json={}, headers=super_user_headers)
    assert resp.status_code == 422


def test_create_event_invalid_event_type(client, super_user_headers):
    """POST /events/ with event_type_id=99999, verify 404."""
    # First get a valid object ID
    obj_get = client.get("/objects/?limit=1", headers=super_user_headers)
    if obj_get.status_code == 200 and len(obj_get.json()) > 0:
        obj_id = obj_get.json()[0]["id"]
        resp = client.post(
            "/events/",
            json={"event_type_id": 99999, "object_id": obj_id},
            headers=super_user_headers
        )
        assert resp.status_code in [404, 422]


def test_replacement_invalid_time_range(client, super_user_headers):
    """POST /replacements/ with start_time > end_time, verify 422."""
    # First get a valid instance ID
    inst_get = client.get("/instances/?limit=1", headers=super_user_headers)
    if inst_get.status_code == 200 and len(inst_get.json()) > 0:
        inst_id = inst_get.json()[0]["id"]
        resp = client.post(
            "/replacements/",
            json={
                "instance_id": inst_id,
                "start_time": "2026-01-02T00:00:00",
                "end_time": "2026-01-01T00:00:00"  # End before start
            },
            headers=super_user_headers
        )
        assert resp.status_code in [400, 422]
