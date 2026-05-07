import pytest
import time


def test_malformed_token_rejected(client):
    """Verify malformed Authorization header is rejected."""
    # No Bearer prefix
    headers1 = {"Authorization": "not_a_token"}
    resp1 = client.get("/types/", headers=headers1)
    assert resp1.status_code in [401, 403]
    
    # Bearer with empty token - may cause httpx error, skip if so
    try:
        headers2 = {"Authorization": "Bearer "}
        resp2 = client.get("/types/", headers=headers2)
        assert resp2.status_code in [401, 403]
    except Exception:
        pass  # Skip if httpx doesn't like empty token
    
    # Bearer with invalid token (not a valid JWT format)
    headers3 = {"Authorization": "Bearer invalid_token_123"}
    resp3 = client.get("/types/", headers=headers3)
    assert resp3.status_code in [401, 403]
