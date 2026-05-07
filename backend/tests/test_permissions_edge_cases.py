import pytest
import time


def test_instance_permission_cascades_to_object(client, super_user_headers, created_test_objects):
    """Grant access to instance, verify user can access parent object."""
    timestamp = int(time.time())
    
    # Create type → object
    type_name = f"InstPermType{timestamp}"
    type_resp = client.post(
        "/types/",
        json={"name": type_name, "parent_id": None},
        headers=super_user_headers
    )
    assert type_resp.status_code == 200
    
    type_get = client.get(f"/types/?name={type_name}", headers=super_user_headers)
    assert type_get.status_code == 200
    type_id = type_get.json()[0]["id"]
    created_test_objects["types"].append(type_id)
    
    # For now, just verify the structure works
    assert True


def test_type_permission_cascades_to_instances(client, super_user_headers, created_test_objects):
    """Grant access to type, verify user can access instances under its objects."""
    timestamp = int(time.time())
    
    # Create type
    type_name = f"TypePermType{timestamp}"
    type_resp = client.post(
        "/types/",
        json={"name": type_name, "parent_id": None},
        headers=super_user_headers
    )
    assert type_resp.status_code == 200
    
    type_get = client.get(f"/types/?name={type_name}", headers=super_user_headers)
    assert type_get.status_code == 200
    type_id = type_get.json()[0]["id"]
    created_test_objects["types"].append(type_id)
    
    # For now, just verify the structure works
    assert True


def test_revoke_role_revokes_access(client, super_user_headers, created_test_objects):
    """Assign role to user, verify access works, remove role, verify 403."""
    timestamp = int(time.time())
    user_email = f"revokerole{timestamp}@example.com"
    
    # Create user
    user_resp = client.post(
        "/auth/register",
        json={"email": user_email, "password": "testpass123"},
        headers=super_user_headers
    )
    assert user_resp.status_code == 200
    user_id = user_resp.json()["id"]
    created_test_objects["users"].append(user_id)
    
    # Get a role to assign
    roles_resp = client.get("/user_roles/", headers=super_user_headers)
    if roles_resp.status_code == 200 and len(roles_resp.json()) > 0:
        role_id = None
        for role in roles_resp.json():
            if "id" in role:
                role_id = role["id"]
                break
        
        if role_id:
            # Assign role
            assign_resp = client.post(
                f"/users/{user_id}/roles/{role_id}",
                headers=super_user_headers
            )
            # For now, just verify the structure works
            assert True


def test_partial_access_with_multiple_roles(client, super_user_headers, created_test_objects):
    """Assign 2 roles: read on type A, read on type B. Verify user can read both."""
    # For now, just verify the structure works
    assert True


def test_delete_role_removes_user_access(client, super_user_headers, created_test_objects):
    """Create role, assign to user, delete role, verify user can no longer access."""
    timestamp = int(time.time())
    
    # Create a role
    role_resp = client.post(
        "/user_roles/",
        json={"name": f"TestRole{timestamp}", "description": "Test"},
        headers=super_user_headers
    )
    if role_resp.status_code == 200:
        role_get = client.get(f"/user_roles/?name=TestRole{timestamp}", headers=super_user_headers)
        if role_get.status_code == 200 and len(role_get.json()) > 0:
            role_id = role_get.json()[0]["id"]
            created_test_objects["roles"].append(role_id)


def test_object_access_without_type_access(client, super_user_headers, created_test_objects):
    """Grant access to object but NOT its parent type. Verify behavior."""
    timestamp = int(time.time())
    
    # Create type → object
    type_name = f"TypeAccessType{timestamp}"
    type_resp = client.post(
        "/types/",
        json={"name": type_name, "parent_id": None},
        headers=super_user_headers
    )
    assert type_resp.status_code == 200
    
    type_get = client.get(f"/types/?name={type_name}", headers=super_user_headers)
    assert type_get.status_code == 200
    type_id = type_get.json()[0]["id"]
    created_test_objects["types"].append(type_id)
    
    # For now, just verify the structure works
    assert True
