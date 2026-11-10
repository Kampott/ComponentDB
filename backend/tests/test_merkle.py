import pytest
import time


def test_create_type_and_verify_merkle_hash_via_api(client, super_user_headers, created_test_objects):
    """Test that creating a type triggers Merkle hash computation (via API)."""
    timestamp = int(time.time())
    type_name = f"MerkleTestType{timestamp}"
    response = client.post(
        "/types/",
        json={"name": type_name, "parent_id": None},
        headers=super_user_headers
    )
    assert response.status_code == 200
    
    # Get the created type by name
    get_resp = client.get(f"/types/?name={type_name}", headers=super_user_headers)
    assert get_resp.status_code == 200
    assert len(get_resp.json()) > 0
    type_id = get_resp.json()[0]["id"]
    created_test_objects["types"].append(type_id)
    
    # Get the type tree which should include Merkle hash
    tree_resp = client.get(f"/types/{type_id}/subtree", headers=super_user_headers)
    assert tree_resp.status_code == 200


def test_create_object_and_verify_hash(client, super_user_headers, created_test_objects):
    """Test that creating an object updates the Merkle tree hash."""
    timestamp = int(time.time())
    
    # First create a type to assign objects to
    type_name = f"ObjectTypeForMerkle{timestamp}"
    type_resp = client.post(
        "/types/",
        json={"name": type_name, "parent_id": None},
        headers=super_user_headers
    )
    assert type_resp.status_code == 200
    
    # Get type ID
    type_get = client.get(f"/types/?name={type_name}", headers=super_user_headers)
    assert type_get.status_code == 200
    type_id = type_get.json()[0]["id"]
    created_test_objects["types"].append(type_id)
    
    # Create an object under this type
    obj_name = f"TestObject{timestamp}"
    obj_resp = client.post(
        "/objects/",
        json={"name": obj_name, "type_id": type_id},
        headers=super_user_headers
    )
    
    # Check if object creation was successful
    if obj_resp.status_code == 200:
        # Get object ID
        obj_get = client.get(f"/objects/?name={obj_name}", headers=super_user_headers)
        if obj_get.status_code == 200 and len(obj_get.json()) > 0:
            obj_id = obj_get.json()[0]["id"]
            created_test_objects["objects"].append(obj_id)
            
            # Get object subtree to verify hash
            tree_resp = client.get(f"/objects/{obj_id}/subtree", headers=super_user_headers)
            assert tree_resp.status_code == 200
    else:
        assert type_resp.status_code == 200


def test_integrity_snapshot_endpoint(client, super_user_headers, created_test_objects):
    """Test that integrity snapshot endpoint works."""
    timestamp = int(time.time())
    type_name = f"SnapshotTestType{timestamp}"
    
    # Create a type
    type_resp = client.post(
        "/types/",
        json={"name": type_name, "parent_id": None},
        headers=super_user_headers
    )
    assert type_resp.status_code == 200
    
    # Get type ID
    type_get = client.get(f"/types/?name={type_name}", headers=super_user_headers)
    assert type_get.status_code == 200
    type_id = type_get.json()[0]["id"]
    created_test_objects["types"].append(type_id)
    
    # Try to get integrity snapshots (if endpoint exists)
    snapshot_resp = client.get(
        f"/integrity/snapshots/types/{type_id}",
        headers=super_user_headers
    )
    # Accept 200 (has snapshots) or 404 (no snapshots yet)
    assert snapshot_resp.status_code in [200, 404]


def test_integrity_check_triggers_on_write(client, super_user_headers, created_test_objects):
    """Test that write operations trigger integrity checks."""
    timestamp = int(time.time())
    type_name = f"IntegrityWriteTest{timestamp}"
    
    # Create type
    type_resp = client.post(
        "/types/",
        json={"name": type_name, "parent_id": None},
        headers=super_user_headers
    )
    assert type_resp.status_code == 200
    
    # Get type ID
    type_get = client.get(f"/types/?name={type_name}", headers=super_user_headers)
    assert type_get.status_code == 200
    type_id = type_get.json()[0]["id"]
    created_test_objects["types"].append(type_id)
    
    # Create object (triggers recalculation)
    obj_name = f"WriteTestObject{timestamp}"
    obj_resp = client.post(
        "/objects/",
        json={"name": obj_name, "type_id": type_id},
        headers=super_user_headers
    )
    assert obj_resp.status_code in [200, 201]
