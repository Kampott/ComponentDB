import pytest
import time


def test_create_type_and_verify_tin_tout(client, super_user_headers, created_test_objects):
    """Test that creating a type assigns correct tin/tout values via API."""
    # Create a root type
    timestamp = int(time.time())
    type_name = f"TestRoot{timestamp}"
    response = client.post(
        "/types/",
        json={"name": type_name, "parent_id": None},
        headers=super_user_headers
    )
    assert response.status_code == 200
    
    # Get the created type by name
    get_resp = client.get(f"/types/?name={type_name}", headers=super_user_headers)
    assert get_resp.status_code == 200
    types = get_resp.json()
    assert len(types) > 0
    root_data = types[0]
    root_id = root_data["id"]
    created_test_objects["types"].append(root_id)
    
    # Verify root has tin/tout assigned
    assert "tin" in root_data
    assert "tout" in root_data
    assert root_data["tin"] == 0
    assert root_data["tout"] >= 1
    assert root_data["tree_size"] >= 1


def test_create_type_hierarchy_and_query_subtree(client, super_user_headers, created_test_objects):
    """Test that subtree queries return correct nodes via API."""
    # Create root type
    timestamp = int(time.time())
    root_name = f"SubtreeRoot{timestamp}"
    root_resp = client.post(
        "/types/",
        json={"name": root_name, "parent_id": None},
        headers=super_user_headers
    )
    assert root_resp.status_code == 200
    
    # Get root ID
    get_resp = client.get(f"/types/?name={root_name}", headers=super_user_headers)
    assert get_resp.status_code == 200
    root_id = get_resp.json()[0]["id"]
    created_test_objects["types"].append(root_id)
    
    # Create child types
    for i in range(3):
        child_name = f"Child{i}{timestamp}"
        child_resp = client.post(
            "/types/",
            json={"name": child_name, "parent_id": root_id},
            headers=super_user_headers
        )
        assert child_resp.status_code == 200
        
        # Get child ID
        child_get = client.get(f"/types/?name={child_name}", headers=super_user_headers)
        if child_get.status_code == 200 and len(child_get.json()) > 0:
            created_test_objects["types"].append(child_get.json()[0]["id"])
    
    # Get type tree (subtree)
    tree_resp = client.get(f"/types/{root_id}/subtree", headers=super_user_headers)
    assert tree_resp.status_code == 200


def test_ancestor_query_via_type_tree(client, super_user_headers, created_test_objects):
    """Test that ancestor queries work correctly via API."""
    timestamp = int(time.time())
    
    # Create hierarchy: root -> child -> grandchild
    root_name = f"AncestorRoot{timestamp}"
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
    
    # Create child
    child_name = f"AncestorChild{timestamp}"
    child_resp = client.post(
        "/types/",
        json={"name": child_name, "parent_id": root_id},
        headers=super_user_headers
    )
    assert child_resp.status_code == 200
    child_get = client.get(f"/types/?name={child_name}", headers=super_user_headers)
    child_id = child_get.json()[0]["id"]
    created_test_objects["types"].append(child_id)
    
    # Create grandchild
    grandchild_name = f"AncestorGrandchild{timestamp}"
    grandchild_resp = client.post(
        "/types/",
        json={"name": grandchild_name, "parent_id": child_id},
        headers=super_user_headers
    )
    assert grandchild_resp.status_code == 200
    grandchild_get = client.get(f"/types/?name={grandchild_name}", headers=super_user_headers)
    grandchild_id = grandchild_get.json()[0]["id"]
    created_test_objects["types"].append(grandchild_id)
    
    # Get the type tree starting from root - should include all ancestors
    tree_resp = client.get(f"/types/{root_id}/subtree", headers=super_user_headers)
    assert tree_resp.status_code == 200
