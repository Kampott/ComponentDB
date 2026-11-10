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
    assert child_get.status_code == 200
    assert len(child_get.json()) > 0
    child_id = child_get.json()[0]["id"]
    created_test_objects["types"].append(child_id)
    
    # Delete parent (should cascade to child)
    del_resp = client.delete(f"/types/{parent_id}", headers=super_user_headers)
    assert del_resp.status_code == 204

    # Verify child type is also gone (cascade)
    child_check = client.get(f"/types/{child_id}", headers=super_user_headers)
    assert child_check.status_code == 404


def test_delete_type_cascades_to_objects(client, super_user_headers, created_test_objects):
    """Delete type → objects under it should be cascade-deleted."""
    timestamp = int(time.time())
    type_name = f"CascadeTypeObj{timestamp}"
    type_resp = client.post("/types/", json={"name": type_name, "parent_id": None}, headers=super_user_headers)
    assert type_resp.status_code == 200
    type_get = client.get(f"/types/?name={type_name}", headers=super_user_headers)
    assert type_get.status_code == 200
    type_id = type_get.json()[0]["id"]
    created_test_objects["types"].append(type_id)

    obj_name = f"CascadeObj{timestamp}"
    obj_resp = client.post("/objects/", json={"name": obj_name, "type_id": type_id}, headers=super_user_headers)
    assert obj_resp.status_code == 200, f"Object creation failed: {obj_resp.text}"
    obj_get = client.get(f"/objects/?name={obj_name}", headers=super_user_headers)
    assert obj_get.status_code == 200
    obj_id = obj_get.json()[0]["id"]
    created_test_objects["objects"].append(obj_id)

    # Delete type — objects should cascade
    del_resp = client.delete(f"/types/{type_id}", headers=super_user_headers)
    assert del_resp.status_code == 204

    obj_check = client.get(f"/objects/{obj_id}", headers=super_user_headers)
    assert obj_check.status_code == 404, f"Object should be cascade-deleted, got {obj_check.status_code}"


def test_delete_object_cascades_to_instances(client, super_user_headers, created_test_objects):
    """Delete object → instances under it should be cascade-deleted."""
    timestamp = int(time.time())
    type_name = f"CascadeTypeInst{timestamp}"
    type_resp = client.post("/types/", json={"name": type_name, "parent_id": None}, headers=super_user_headers)
    assert type_resp.status_code == 200
    type_get = client.get(f"/types/?name={type_name}", headers=super_user_headers)
    type_id = type_get.json()[0]["id"]
    created_test_objects["types"].append(type_id)

    obj_name = f"CascadeObjInst{timestamp}"
    obj_resp = client.post("/objects/", json={"name": obj_name, "type_id": type_id}, headers=super_user_headers)
    assert obj_resp.status_code == 200
    obj_get = client.get(f"/objects/?name={obj_name}", headers=super_user_headers)
    obj_id = obj_get.json()[0]["id"]
    created_test_objects["objects"].append(obj_id)

    inst_name = f"CascadeInst{timestamp}"
    inst_resp = client.post("/instances/", json={
        "name": inst_name, "object_id": obj_id, "parent_id": None, "is_active": True
    }, headers=super_user_headers)
    assert inst_resp.status_code == 200, f"Instance creation failed: {inst_resp.text}"
    inst_id = inst_resp.json()["id"]
    created_test_objects["instances"].append(inst_id)

    # Delete object — instances should cascade
    del_resp = client.delete(f"/objects/{obj_id}", headers=super_user_headers)
    assert del_resp.status_code == 204

    inst_check = client.get(f"/instances/{inst_id}", headers=super_user_headers)
    assert inst_check.status_code == 404, f"Instance should be cascade-deleted, got {inst_check.status_code}"


def test_delete_type_cascades_entire_chain(client, super_user_headers, created_test_objects):
    """Delete type → objects cascade → instances cascade (full chain verification)."""
    timestamp = int(time.time())
    type_name = f"FullChainType{timestamp}"
    type_resp = client.post("/types/", json={"name": type_name, "parent_id": None}, headers=super_user_headers)
    assert type_resp.status_code == 200
    type_get = client.get(f"/types/?name={type_name}", headers=super_user_headers)
    type_id = type_get.json()[0]["id"]
    created_test_objects["types"].append(type_id)

    obj_name = f"FullChainObj{timestamp}"
    obj_resp = client.post("/objects/", json={"name": obj_name, "type_id": type_id}, headers=super_user_headers)
    assert obj_resp.status_code == 200
    obj_get = client.get(f"/objects/?name={obj_name}", headers=super_user_headers)
    obj_id = obj_get.json()[0]["id"]
    created_test_objects["objects"].append(obj_id)

    inst_name = f"FullChainInst{timestamp}"
    inst_resp = client.post("/instances/", json={
        "name": inst_name, "object_id": obj_id, "parent_id": None, "is_active": True
    }, headers=super_user_headers)
    assert inst_resp.status_code == 200
    inst_id = inst_resp.json()["id"]
    created_test_objects["instances"].append(inst_id)

    # Delete type — entire chain should cascade
    del_resp = client.delete(f"/types/{type_id}", headers=super_user_headers)
    assert del_resp.status_code == 204

    obj_check = client.get(f"/objects/{obj_id}", headers=super_user_headers)
    assert obj_check.status_code == 404, f"Object should be cascade-deleted, got {obj_check.status_code}"

    inst_check = client.get(f"/instances/{inst_id}", headers=super_user_headers)
    assert inst_check.status_code == 404, f"Instance should be cascade-deleted, got {inst_check.status_code}"
