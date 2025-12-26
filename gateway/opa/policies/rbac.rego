package studio.authz

import rego.v1

default allow := false

# =============================================
# JWT PAYLOAD EXTRACTION
# =============================================
# Kong jwt plugin injects verified JWT payload into input
# We extract user claims from the JWT for authorization decisions

# Extract user from JWT payload (if JWT auth is used)
user := input.request.jwt.payload if {
    input.request.jwt.payload
}

# Fallback to direct user input (for backward compatibility with backend auth)
user := input.user if {
    not input.request.jwt.payload
    input.user
}

# =============================================
# ROLE DEFINITIONS
# =============================================
# - admin: Full system access
# - manager: Project and team management
# - auditor: Audit projects assigned to them
# - customer: View their projects, upload evidence
# - compliance: View shared projects

# =============================================
# ROLE-SPECIFIC ROUTES
# These routes are dedicated to specific roles
# =============================================

# GLOBAL ADMIN ALLOW
allow if {
    user.role == "admin"
}

# PROJECTS ROUTES
allow if {
    startswith(input.path, "/api/projects")
    user.role in ["manager", "auditor", "customer", "compliance"]
}

# Admin-only routes
allow if {
    startswith(input.path, "/api/admin")
    user.role == "admin"
}

# Manager routes (admin + manager)
allow if {
    startswith(input.path, "/api/manager")
    user.role in ["admin", "manager"]
}

# Auditor routes (admin + auditor + manager [read-only])
allow if {
    startswith(input.path, "/api/auditor")
    user.role in ["admin", "auditor"]
}

allow if {
    startswith(input.path, "/api/auditor")
    user.role == "manager"
    input.method == "GET"
}

# Customer routes (admin + customer + manager [read-only])
allow if {
    startswith(input.path, "/api/customer")
    user.role in ["admin", "customer"]
}

allow if {
    startswith(input.path, "/api/customer")
    user.role == "manager"
    input.method == "GET"
}

# =============================================
# COMPLIANCE ROUTES (Mixed permissions)
# =============================================

# Compliance user management - customer only can create/list compliance users
allow if {
    startswith(input.path, "/api/compliance/users")
    user.role in ["admin", "customer"]
}

# Compliance project sharing - customer only
allow if {
    input.path == "/api/compliance/share"
    user.role in ["admin", "customer"]
}

# Compliance Projection - customer only
allow if {
    startswith(input.path, "/api/compliance/projection")
    user.role in ["admin", "customer"]
}

# Compliance dashboard and project access - compliance users only
allow if {
    startswith(input.path, "/api/compliance/dashboard")
    user.role in ["admin", "compliance"]
}

allow if {
    startswith(input.path, "/api/compliance/projects")
    user.role in ["admin", "compliance"]
}

# =============================================
# USER MANAGEMENT ROUTES
# =============================================

# User list/management - admin and manager
# Managers cannot DELETE users, only Admin
allow if {
    startswith(input.path, "/api/users")
    user.role == "admin"
}

allow if {
    startswith(input.path, "/api/users")
    user.role == "manager"
    input.method != "DELETE"
}

# =============================================
# CHAT ROUTES
# All authenticated users can use chat
# =============================================

allow if {
    startswith(input.path, "/api/chat")
    user.role in ["admin", "manager", "auditor", "customer"]
}

# =============================================
# EVIDENCE ROUTES
# Admin, manager, auditor, customer can access evidence
# Backend handles project-level access control
# =============================================

allow if {
    startswith(input.path, "/api/evidence")
    user.role in ["admin", "manager"]
    input.method == "GET"
}

allow if {
    startswith(input.path, "/api/evidence")
    user.role == "customer"
    input.method in ["GET", "POST", "PUT", "DELETE"]
}

allow if {
    startswith(input.path, "/api/evidence")
    user.role == "auditor"
    input.method in ["GET", "POST", "PUT", "PATCH", "DELETE"]
}

# =============================================
# SECURE VIEWER ROUTES
# Access controlled by backend service (minio) + token
# =============================================
allow if {
    startswith(input.path, "/api/secure-view")
    user.role in ["admin", "manager", "auditor", "customer", "compliance"]
}

# =============================================
# UPLOADS ROUTES
# All authenticated users can upload files
# =============================================

allow if {
    startswith(input.path, "/api/uploads")
    user.role in ["admin", "manager", "auditor", "customer"]
}

# =============================================
# PUBLIC ROUTES (No authentication required)
# =============================================

# Auth routes (login, register, etc.)
allow if {
    startswith(input.path, "/api/auth")
}

# Health check endpoint
allow if {
    input.path == "/api/health"
}

# CORS preflight requests
allow if {
    input.method == "OPTIONS"
}

# =============================================
# LEARNING ROUTES
# Admin, manager, auditor, customer can access learning
# =============================================
allow if {
    startswith(input.path, "/api/learning")
    user.role in ["admin", "manager", "auditor", "customer"]
}

# =============================================
# CASB ROUTES
# Customer and auditor can access CASB integrations
# Customer integrates their environment, auditor reviews
# =============================================
allow if {
    startswith(input.path, "/api/casb")
    user.role in ["customer", "auditor"]
}

# =============================================
# FINDINGS ROUTES
# Customer and auditor can access findings
# Day-to-day operational findings
# =============================================
allow if {
    startswith(input.path, "/api/findings")
    user.role in ["customer", "auditor"]
}

# =============================================
# AGENTS ROUTES
# Customer and auditor can manage agents
# =============================================
allow if {
    startswith(input.path, "/api/agents")
    user.role in ["customer", "auditor"]
}


# System routes (public for readme)
allow if {
    startswith(input.path, "/api/system")
}

