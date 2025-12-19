import requests
import jwt
import time
import os

GATEWAY_URL = os.getenv("GATEWAY_URL", "http://localhost:8000")
JWT_SECRET = "your-256-bit-secret-key-here-change-this-in-production"

def generate_token(role, user_id="test-user"):
    payload = {
        "iss": "studio-idp",
        "sub": user_id,
        "role": role,
        "exp": time.time() + 3600
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")

def test_request(role, path, method="GET", expected=200):
    url = f"{GATEWAY_URL}{path}"
    token = generate_token(role)
    headers = {"Authorization": f"Bearer {token}"}
    
    print(f"[{role} {method} {path}] ", end="")
    try:
        response = requests.request(method, url, headers=headers)
        if response.status_code == expected:
            print(f"PASS ({response.status_code})")
        else:
            print(f"FAIL -> Expected {expected}, Got {response.status_code}")
            # print(f"Body: {response.text[:200]}") # Shortened body
    except Exception as e:
        print(f"ERROR: {e}")

if __name__ == "__main__":
    MATRIX = [
        ("admin", "/api/admin/settings", "GET", 200),
        ("admin", "/api/projects", "GET", 200),
        ("manager", "/api/admin/settings", "GET", 403),
        ("manager", "/api/manager/projects", "GET", 200),
        ("auditor", "/api/admin/settings", "GET", 403),
        ("auditor", "/api/auditor/dashboard", "GET", 200),
        ("auditor", "/api/evidence/123", "DELETE", 403),
        ("customer", "/api/admin/settings", "GET", 403),
        ("customer", "/api/projects", "GET", 200),
        ("compliance", "/api/evidence/details", "POST", 403),
        ("compliance", "/api/chat/send", "POST", 403),
        ("compliance", "/api/projects", "GET", 200),
        ("admin", "/api/projects/123", "PATCH", 404),
    ]

    print("--- FULL SWEEP ---")
    for role, path, method, expected in MATRIX:
        test_request(role, path, method, expected)
