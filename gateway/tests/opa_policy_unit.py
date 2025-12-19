import subprocess
import json
import os
import pytest

# Path to the OPA binary and policy file
OPA_BINARY = "opa" # Assumes 'opa' is in PATH
POLICY_FILE = "../../gateway/opa/policies/rbac.rego"

def run_opa_eval(input_data):
    """
    Runs 'opa eval' with the given input against the policy file.
    """
    cmd = [
        OPA_BINARY,
        "eval",
        "-d", POLICY_FILE,
        "-I", # Read input from stdin
        "data.rbac.allow"
    ]
    
    process = subprocess.Popen(
        cmd,
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True
    )
    
    stdout, stderr = process.communicate(input=json.dumps({"input": input_data}))
    
    if process.returncode != 0:
        raise Exception(f"OPA Error: {stderr}")
        
    try:
        result = json.loads(stdout)
        # OPA eval returns: {"result": [{"expressions": [{"value": true/false}]}]}
        return result.get("result", [])[0].get("expressions", [])[0].get("value", False)
    except (json.JSONDecodeError, IndexError, AttributeError):
        return False

@pytest.mark.parametrize("role, path, method, expected", [
    ("admin", "/api/admin/settings", "PUT", True),
    ("manager", "/api/admin/settings", "PUT", False),
    ("auditor", "/api/audit/requests", "POST", True),
    ("compliance", "/api/chat/send", "POST", False), # Compliance cannot send chat
    ("customer", "/api/projects/my-project", "GET", True),
])
def test_opa_policy_allow(role, path, method, expected):
    """
    Unit test for OPA Rego policies.
    """
    input_data = {
        "method": method,
        "path": path,
        "user": {
            "role": role,
            "id": "user123"
        }
    }
    
    try:
        allow = run_opa_eval(input_data)
        if allow != expected:
            print(f"FAIL: Role={role}, Path={path}, Expected={expected}, Got={allow}")
        else:
            print(f"PASS: Role={role}, Path={path}")
        assert allow == expected
    except Exception as e:
        print(f"ERROR: {e}")
        raise e

if __name__ == "__main__":
    print("Running OPA Unit Tests (Manual Mode)...")
    # Manual run for debugging
    tests = [
        ("admin", "/api/admin/settings", "PUT", True),
        ("manager", "/api/admin/settings", "PUT", False),
        ("auditor", "/api/audit/requests", "POST", True),
        ("compliance", "/api/chat/send", "POST", False),
        ("customer", "/api/projects/my-project", "GET", True),
    ]
    
    for t in tests:
        role, path, method, expected = t
        input_data = {
            "method": method,
            "path": path,
            "user": {
                "role": role,
                "id": "user123"
            }
        }
        try:
            allow = run_opa_eval(input_data)
            status = "PASS" if allow == expected else "FAIL"
            print(f"[{status}] Role: {role:<10} Path: {path:<25} Method: {method:<5} -> Expected: {expected}, Got: {allow}")
        except Exception as e:
            print(f"[ERROR] {e}")
