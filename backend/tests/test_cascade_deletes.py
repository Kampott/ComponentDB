import pytest
import time


def test_create_type_and_verify_deletion(client, super_user_headers, created_test_objects):
    """Verify type creation and deletion works."""
    timestamp = int(time.time())
    type_name = f"DeleteType{timestamp}"
    type_resp = client.post(
        "/types/",
        json={"name": type_name, "parent_id": None},
        headers=super_user_headers
    )
    assert type_resp.status_code == 200
    
    # Get type ID
    type_get = client.get(f"/types/?name={type_name}", headers=super_user_headers)
    assert type_get.status_code == 200
    assert len(type_get.json()) > 0
    type_id = type_get.json()[0]["id"]
    created_test_objects["types"].append(type_id)
    
    # Delete the type
    del_resp = client.delete(f"/types/{type_id}", headers=super_user_headers)
    assert del_resp.status_code == 204
    
    # Verify type is gone
    type_check = client.get(f"/types/{type_id}", headers=super_user_headers)
    assert type_check.status_code == 404


def test_delete_nonexistent_type_returns_404(client, super_user_headers):
    """Verify deleting non-existent type returns 404."""
    resp = client.delete("/types/99999", headers=super_user_headers)
    assert resp.status_code == 404


def test_delete_nonexistent_object_returns_404(client, super_user_headers):
    """Verify deleting non-existent object returns 404."""
    resp = client.delete("/objects/99999", headers=super_user_headers)
    assert resp.status_code == 404


def test_delete_nonexistent_instance_returns_404(client, super_user_headers):
    """Verify deleting non-existent instance returns 404."""
    resp = client.delete("/instances/99999", headers=super_user_headers)
    assert resp.status_code == 404


def test_create_type_with_children_and_delete(client, super_user_headers, created_test_objects):
    """Verify deleting type with children works."""
    timestamp = int(time.time())
    
    # Create parent type
    parent_name = f"ParentType{timestamp}"
    parent_resp = client.post(
        "/types/",
        json={"name": parent_name, "parent_id": None},
        headers=super_user_headers
    )
    assert parent_resp.status_code == 200
    
    parent_get = client.get(f"/types/?name={parent_name}", headers=super_user_headers)
    assert parent_get.status_code == 200
    parent_id = parent_get.json()[0]["id"]
    created_test_objects["types"].append(parent_id)
    
    # Create child type
    child_name = f"ChildType{timestamp}"
    child_resp = client.post(
        "/types/",
        json={"name": child_name, "parent_id": parent_id},
        headers=super_user_headers
    )
    assert child_resp.status_code == 200
    
    child_get = client.get(f"/types/?name={child_name}", headers=super_user_headers)
    if child_get.status_code == 200 and len(child_get.json()) > 0:
        child_id = child_get.json()[0]["id"]
        created_test_objects["types"].append(child_id)
    
    # Delete parent (should cascade to child)
    del_resp = client.delete(f"/types/{parent_id}", headers=super_user_headers)
    assert del_resp.status_code == 204
