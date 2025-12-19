import pytest
import requests
import jwt
import time
import os

# Configuration
GATEWAY_URL = os.getenv("GATEWAY_URL", "http://localhost:8000")
JWT_SECRET = os.getenv("JWT_SECRET", "your-256-bit-secret-key-here-change-this-in-production") # Must match kong.yml/backend

def generate_token(role, user_id="test-user"):
    payload = {
        "iss": "studio-idp",
        "sub": user_id,
        "role": role,
        "exp": time.time() + 3600
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")

@pytest.fixture
def auth_headers():
    roles = ["admin", "manager", "auditor", "customer", "compliance"]
    return {role: {"Authorization": f"Bearer {generate_token(role)}"} for role in roles}

# MATRIX DATA: Role, Endpoint, Method, Expected Status
MATRIX = [
    # Admin
    ("admin", "/api/admin/settings", "GET", 200),
    ("admin", "/api/projects", "GET", 200),
    
    # Manager
    ("manager", "/api/admin/settings", "GET", 403), # Denied
    ("manager", "/api/manager/projects", "GET", 200),
    
    # Auditor
    ("auditor", "/api/admin/settings", "GET", 403),
    ("auditor", "/api/auditor/dashboard", "GET", 200),
    ("auditor", "/api/evidence/123", "DELETE", 403), # Read/Write sep
    
    # Customer
    ("customer", "/api/admin/settings", "GET", 403),
    ("customer", "/api/projects", "GET", 200), # Own projects
    
    # Compliance (Restricted)
    ("compliance", "/api/evidence/details", "POST", 403), # No write
    ("compliance", "/api/chat/send", "POST", 403), # No chat
    ("compliance", "/api/projects", "GET", 200), # Read ok
    
    # Validations
    ("admin", "/api/projects/123", "PATCH", 404), # Should pass OPA (200/404), fail DB
]

@pytest.mark.parametrize("role, endpoint, method, expected_status", MATRIX)
def test_rbac_access(role, endpoint, method, expected_status, auth_headers):
    url = f"{GATEWAY_URL}{endpoint}"
    headers = auth_headers[role]
    
    try:
        if method == "GET":
            response = requests.get(url, headers=headers)
        elif method == "POST":
            response = requests.post(url, headers=headers, json={})
        elif method == "PUT":
            response = requests.put(url, headers=headers, json={})
        elif method == "DELETE":
            response = requests.delete(url, headers=headers)
        elif method == "PATCH":
            response = requests.patch(url, headers=headers, json={})
            
        # 404 is acceptable if OPA ALLOWED the request but resource missing
        # If we expect 200 but get 404, it means Auth passed (Good for OPA test)
        if expected_status == 200 and response.status_code == 404:
            assert True 
        elif expected_status == 403:
            if response.status_code != 403:
                print(f"FAIL: {role} {method} {url} -> Expected 403, Got {response.status_code} Body: {response.text}")
            assert response.status_code == 403
        else:
             # Basic check, might need strict == for some
            if response.status_code != expected_status and response.status_code != 404:
                 print(f"FAIL: {role} {method} {url} -> Expected {expected_status}, Got {response.status_code} Body: {response.text}")
            assert response.status_code == expected_status or response.status_code == 404
            
    except requests.exceptions.ConnectionError:
        pytest.fail("Gateway not reachable")

def test_unauthorized_access():
    url = f"{GATEWAY_URL}/api/projects"
    response = requests.get(url)
    assert response.status_code == 401

def test_token_manipulation():
    # Invalid signature
    token = jwt.encode({"role": "admin", "sub": "hacker"}, "wrong-secret", algorithm="HS256")
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(f"{GATEWAY_URL}/api/admin/settings", headers=headers)
    assert response.status_code in [401, 403]
