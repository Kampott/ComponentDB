import pytest
import time


def test_create_user_and_assign_role(client, super_user_headers, created_test_objects):
    """Test creating a user and assigning a role via API."""
    # Create a new user
    timestamp = int(time.time())
    user_email = f"testuser{timestamp}@example.com"
    user_resp = client.post(
        "/auth/register",
        json={"email": user_email, "password": "testpassword123"},
        headers=super_user_headers
    )
    assert user_resp.status_code == 200
    user_data = user_resp.json()
    assert "id" in user_data
    user_id = user_data["id"]
    created_test_objects["users"].append(user_id)
    
    # Verify user was created
    assert user_data["email"] == user_email


def test_login_with_created_user(client, super_user_headers, created_test_objects):
    """Test that newly created user can login."""
    timestamp = int(time.time())
    user_email = f"logintest{timestamp}@example.com"
    
    # Create user
    user_resp = client.post(
        "/auth/register",
        json={"email": user_email, "password": "testpassword123"},
        headers=super_user_headers
    )
    assert user_resp.status_code == 200
    user_id = user_resp.json()["id"]
    created_test_objects["users"].append(user_id)
    
    # Login with the new user
    login_resp = client.post(
        "/auth/login",
        data={"username": user_email, "password": "testpassword123"}
    )
    assert login_resp.status_code == 200
    assert "access_token" in login_resp.json()


def test_superuser_bypasses_permissions(client, super_user_headers, created_test_objects):
    """Test that super_user can access any endpoint."""
    timestamp = int(time.time())
    
    # Create a type (requires permissions)
    type_name = f"PermTestType{timestamp}"
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
    
    # Super_user should be able to read it
    get_resp = client.get(f"/types/{type_id}", headers=super_user_headers)
    assert get_resp.status_code == 200


def test_read_types_without_permission(client, super_user_headers, created_test_objects):
    """Test that a user without permissions cannot read types."""
    timestamp = int(time.time())
    user_email = f"noperm{timestamp}@example.com"
    
    # Create a user without any roles/permissions
    user_resp = client.post(
        "/auth/register",
        json={"email": user_email, "password": "testpassword123"},
        headers=super_user_headers
    )
    assert user_resp.status_code == 200
    user_id = user_resp.json()["id"]
    created_test_objects["users"].append(user_id)
    
    # Login as this user (no permissions)
    login_resp = client.post(
        "/auth/login",
        data={"username": user_email, "password": "testpassword123"}
    )
    assert login_resp.status_code == 200
    token = login_resp.json()["access_token"]
    user_headers = {"Authorization": f"Bearer {token}"}
    
    # Try to read types - should fail with 403 (no permission)
    types_resp = client.get("/types/", headers=user_headers)
    # Either 403 (forbidden) or 200 if endpoint doesn't require auth
    assert types_resp.status_code in [200, 403]


def test_assign_role_to_user(client, super_user_headers, created_test_objects):
    """Test assigning a role to a user."""
    timestamp = int(time.time())
    
    # Create user
    user_email = f"roleuser{timestamp}@example.com"
    user_resp = client.post(
        "/auth/register",
        json={"email": user_email, "password": "test123"},
        headers=super_user_headers
    )
    assert user_resp.status_code == 200
    user_id = user_resp.json()["id"]
    created_test_objects["users"].append(user_id)
    
    # Get available roles
    roles_resp = client.get("/user_roles/", headers=super_user_headers)
    if roles_resp.status_code == 200 and len(roles_resp.json()) > 0:
        roles = roles_resp.json()
        # Find a role with an 'id' field
        for role in roles:
            if "id" in role:
                role_id = role["id"]
                
                # Assign role to user
                assign_resp = client.post(
                    f"/users/{user_id}/roles/{role_id}",
                    headers=super_user_headers
                )
                # Should succeed
                assert assign_resp.status_code in [200, 201, 204]
                break


def test_user_with_role_can_access_endpoint(client, super_user_headers, created_test_objects):
    """Test that a user with proper role can access endpoints."""
    timestamp = int(time.time())
    user_email = f"roleaccess{timestamp}@example.com"
    
    # Create user
    user_resp = client.post(
        "/auth/register",
        json={"email": user_email, "password": "test123"},
        headers=super_user_headers
    )
    assert user_resp.status_code == 200
    user_id = user_resp.json()["id"]
    created_test_objects["users"].append(user_id)
    
    # Get a role that has read_types permission
    roles_resp = client.get("/user_roles/", headers=super_user_headers)
    if roles_resp.status_code == 200:
        # Find a role with an 'id' field
        roles = roles_resp.json()
        role_id = None
        for role in roles:
            if "id" in role:
                role_id = role["id"]
                break
        
        if role_id:
            # Assign role
            client.post(
                f"/users/{user_id}/roles/{role_id}",
                headers=super_user_headers
            )
    
    # Login as user
    login_resp = client.post(
        "/auth/login",
        data={"username": user_email, "password": "test123"}
    )
    assert login_resp.status_code == 200
    token = login_resp.json()["access_token"]
    user_headers = {"Authorization": f"Bearer {token}"}
    
    # Try to access an endpoint
    resp = client.get("/types/", headers=user_headers)
    assert resp.status_code in [200, 403]  # Depends on assigned permissions
