import pytest
import time


def test_create_type_missing_name(client, super_user_headers):
    """POST /types/ with {} (missing name), verify 422."""
    resp = client.post("/types/", json={}, headers=super_user_headers)
    assert resp.status_code == 422


def test_create_type_empty_name(client, super_user_headers):
    """POST /types/ with {"name": ""}, verify accepted."""
    resp = client.post(
        "/types/",
        json={"name": "", "parent_id": None},
        headers=super_user_headers
    )
    assert resp.status_code == 200


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
    """POST /types/ with 500-char name, verify accepted."""
    long_name = "A" * 500
    resp = client.post(
        "/types/",
        json={"name": long_name, "parent_id": None},
        headers=super_user_headers
    )
    assert resp.status_code == 200


def test_invalid_json_in_request(client, super_user_headers):
    """POST /types/ with invalid JSON body, verify 422."""
    resp = client.post(
        "/types/",
        data="not valid json",
        headers={**super_user_headers, "Content-Type": "application/json"}
    )
    assert resp.status_code == 422


def test_create_object_with_nonexistent_parent(client, super_user_headers, created_test_objects):
    """POST /objects/ with parent_id=99999, verify 404."""
    timestamp = int(time.time())
    type_resp = client.post("/types/", json={"name": f"ParentObjTest{timestamp}", "parent_id": None}, headers=super_user_headers)
    assert type_resp.status_code == 200
    type_id = client.get(f"/types/?name=ParentObjTest{timestamp}", headers=super_user_headers).json()[0]["id"]
    created_test_objects["types"].append(type_id)

    resp = client.post("/objects/", json={"name": "OrphanObj", "type_id": type_id, "parent_id": 99999}, headers=super_user_headers)
    assert resp.status_code == 404


def test_get_nonexistent_object_by_id(client, super_user_headers):
    """GET /objects/99999, verify 404."""
    resp = client.get("/objects/99999", headers=super_user_headers)
    assert resp.status_code == 404


def test_get_nonexistent_instance_by_id(client, super_user_headers):
    """GET /instances/99999, verify 404."""
    resp = client.get("/instances/99999", headers=super_user_headers)
    assert resp.status_code == 404


def test_delete_object_twice(client, super_user_headers, created_test_objects):
    """Create object, delete, delete again — second should return 404."""
    timestamp = int(time.time())
    type_resp = client.post("/types/", json={"name": f"DelObjTwiceType{timestamp}", "parent_id": None}, headers=super_user_headers)
    assert type_resp.status_code == 200
    type_id = client.get(f"/types/?name=DelObjTwiceType{timestamp}", headers=super_user_headers).json()[0]["id"]
    created_test_objects["types"].append(type_id)

    obj_resp = client.post("/objects/", json={"name": f"DelObjTwice{timestamp}", "type_id": type_id}, headers=super_user_headers)
    assert obj_resp.status_code == 200
    obj_id = client.get(f"/objects/?name=DelObjTwice{timestamp}", headers=super_user_headers).json()[0]["id"]
    created_test_objects["objects"].append(obj_id)

    del1 = client.delete(f"/objects/{obj_id}", headers=super_user_headers)
    assert del1.status_code == 204

    del2 = client.delete(f"/objects/{obj_id}", headers=super_user_headers)
    assert del2.status_code == 404


def test_delete_instance_twice(client, super_user_headers, created_test_objects):
    """Create instance, delete, delete again — second should return 404."""
    timestamp = int(time.time())
    type_resp = client.post("/types/", json={"name": f"DelInstTwiceType{timestamp}", "parent_id": None}, headers=super_user_headers)
    assert type_resp.status_code == 200
    type_id = client.get(f"/types/?name=DelInstTwiceType{timestamp}", headers=super_user_headers).json()[0]["id"]
    created_test_objects["types"].append(type_id)

    obj_resp = client.post("/objects/", json={"name": f"DelInstTwiceObj{timestamp}", "type_id": type_id}, headers=super_user_headers)
    assert obj_resp.status_code == 200
    obj_id = client.get(f"/objects/?name=DelInstTwiceObj{timestamp}", headers=super_user_headers).json()[0]["id"]
    created_test_objects["objects"].append(obj_id)

    inst_resp = client.post("/instances/", json={"name": f"DelInstTwice{timestamp}", "object_id": obj_id, "is_active": True}, headers=super_user_headers)
    assert inst_resp.status_code == 200
    inst_id = inst_resp.json()["id"]
    created_test_objects["instances"].append(inst_id)

    del1 = client.delete(f"/instances/{inst_id}", headers=super_user_headers)
    assert del1.status_code == 204

    del2 = client.delete(f"/instances/{inst_id}", headers=super_user_headers)
    assert del2.status_code == 404


def test_update_object_name(client, super_user_headers, created_test_objects):
    """PATCH /objects/{id} with new name, verify 200."""
    timestamp = int(time.time())
    type_resp = client.post("/types/", json={"name": f"UpdObjType{timestamp}", "parent_id": None}, headers=super_user_headers)
    assert type_resp.status_code == 200
    type_id = client.get(f"/types/?name=UpdObjType{timestamp}", headers=super_user_headers).json()[0]["id"]
    created_test_objects["types"].append(type_id)

    obj_resp = client.post("/objects/", json={"name": f"UpdObj{timestamp}", "type_id": type_id}, headers=super_user_headers)
    assert obj_resp.status_code == 200
    obj_id = client.get(f"/objects/?name=UpdObj{timestamp}", headers=super_user_headers).json()[0]["id"]
    created_test_objects["objects"].append(obj_id)

    patch_resp = client.patch(f"/objects/{obj_id}", json={"name": f"UpdObjRenamed{timestamp}"}, headers=super_user_headers)
    assert patch_resp.status_code == 200
    assert patch_resp.json()["name"] == f"UpdObjRenamed{timestamp}"


def test_update_instance_name(client, super_user_headers, created_test_objects):
    """PATCH /instances/{id} with new name, verify 200."""
    timestamp = int(time.time())
    type_resp = client.post("/types/", json={"name": f"UpdInstType{timestamp}", "parent_id": None}, headers=super_user_headers)
    assert type_resp.status_code == 200
    type_id = client.get(f"/types/?name=UpdInstType{timestamp}", headers=super_user_headers).json()[0]["id"]
    created_test_objects["types"].append(type_id)

    obj_resp = client.post("/objects/", json={"name": f"UpdInstObj{timestamp}", "type_id": type_id}, headers=super_user_headers)
    assert obj_resp.status_code == 200
    obj_id = client.get(f"/objects/?name=UpdInstObj{timestamp}", headers=super_user_headers).json()[0]["id"]
    created_test_objects["objects"].append(obj_id)

    inst_resp = client.post("/instances/", json={"name": f"UpdInst{timestamp}", "object_id": obj_id, "is_active": True}, headers=super_user_headers)
    assert inst_resp.status_code == 200
    inst_id = inst_resp.json()["id"]
    created_test_objects["instances"].append(inst_id)

    patch_resp = client.patch(f"/instances/{inst_id}", json={"name": f"UpdInstRenamed{timestamp}"}, headers=super_user_headers)
    assert patch_resp.status_code == 200
    assert patch_resp.json()["name"] == f"UpdInstRenamed{timestamp}"
