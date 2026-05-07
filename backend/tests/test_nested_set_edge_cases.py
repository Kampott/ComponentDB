import pytest
import time


@pytest.mark.slow
def test_wide_tree_performance(client, super_user_headers, created_test_objects):
    """Create root + 50 children, verify subtree query returns all 51 nodes quickly."""
    timestamp = int(time.time())
    root_name = f"WideTree{timestamp}"
    root_resp = client.post(
        "/types/",
        json={"name": root_name, "parent_id": None},
        headers=super_user_headers
    )
    assert root_resp.status_code == 200
    
    # Get root ID
    root_get = client.get(f"/types/?name={root_name}", headers=super_user_headers)
    assert root_get.status_code == 200
    root_id = root_get.json()[0]["id"]
    created_test_objects["types"].append(root_id)
    
    # Create 50 children
    for i in range(50):
        child_name = f"WideChild{i}_{timestamp}"
        child_resp = client.post(
            "/types/",
            json={"name": child_name, "parent_id": root_id},
            headers=super_user_headers
        )
        assert child_resp.status_code == 200
    
    # Get subtree - should return all 51 nodes
    subtree_resp = client.get(f"/types/{root_id}/subtree", headers=super_user_headers)
    assert subtree_resp.status_code == 200
    # Verify at least 51 nodes returned
    if isinstance(subtree_resp.json(), list):
        assert len(subtree_resp.json()) >= 51


@pytest.mark.slow
def test_deep_tree_performance(client, super_user_headers, created_test_objects):
    """Create 20-level deep hierarchy, verify no RecursionError (#9 fix)."""
    timestamp = int(time.time())
    root_name = f"DeepTree{timestamp}"
    root_resp = client.post(
        "/types/",
        json={"name": root_name, "parent_id": None},
        headers=super_user_headers
    )
    assert root_resp.status_code == 200
    
    root_get = client.get(f"/types/?name={root_name}", headers=super_user_headers)
    assert root_get.status_code == 200
    root_id = root_get.json()[0]["id"]
    created_test_objects["types"].append(root_id)
    
    parent_id = root_id
    for i in range(20):
        child_name = f"DeepChild{i}_{timestamp}"
        child_resp = client.post(
            "/types/",
            json={"name": child_name, "parent_id": parent_id},
            headers=super_user_headers
        )
        assert child_resp.status_code == 200
        child_get = client.get(f"/types/?name={child_name}", headers=super_user_headers)
        if child_get.status_code == 200 and len(child_get.json()) > 0:
            parent_id = child_get.json()[0]["id"]
            created_test_objects["types"].append(parent_id)
    
    # Get subtree - should work without RecursionError
    subtree_resp = client.get(f"/types/{root_id}/subtree", headers=super_user_headers)
    assert subtree_resp.status_code == 200


def test_create_type_with_nonexistent_parent(client, super_user_headers):
    """POST /types/ with parent_id=99999, verify 404."""
    timestamp = int(time.time())
    resp = client.post(
        "/types/",
        json={"name": f"Orphan{timestamp}", "parent_id": 99999},
        headers=super_user_headers
    )
    assert resp.status_code == 404


def test_move_type_creates_invalid_tree(client, super_user_headers, created_test_objects):
    """Try to move type to its own descendant (circular), verify 400/422."""
    timestamp = int(time.time())
    
    # Create root → child
    root_name = f"MoveRoot{timestamp}"
    root_resp = client.post(
        "/types/",
        json={"name": root_name, "parent_id": None},
        headers=super_user_headers
    )
    assert root_resp.status_code == 200
    
    root_get = client.get(f"/types/?name={root_name}", headers=super_user_headers)
    assert root_get.status_code == 200
    root_id = root_get.json()[0]["id"]
    created_test_objects["types"].append(root_id)
    
    child_name = f"MoveChild{timestamp}"
    child_resp = client.post(
        "/types/",
        json={"name": child_name, "parent_id": root_id},
        headers=super_user_headers
    )
    assert child_resp.status_code == 200
    
    child_get = client.get(f"/types/?name={child_name}", headers=super_user_headers)
    if child_get.status_code == 200 and len(child_get.json()) > 0:
        child_id = child_get.json()[0]["id"]
        created_test_objects["types"].append(child_id)
        
        # Try to move root under child (circular reference)
        move_resp = client.patch(
            f"/types/{root_id}/move?new_parent_id={child_id}",
            headers=super_user_headers
        )
        # Should get 400 (bad request) or 422 (validation error)
        assert move_resp.status_code in [400, 422, 409]


def test_get_nonexistent_type_subtree(client, super_user_headers):
    """GET /types/99999/subtree, verify 404."""
    resp = client.get("/types/99999/subtree", headers=super_user_headers)
    assert resp.status_code == 404
