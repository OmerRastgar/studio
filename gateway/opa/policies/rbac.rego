package studio.authz

import rego.v1

default allow := false

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
    input.user.role == "admin"
}

# PROJECTS ROUTES
allow if {
    startswith(input.path, "/api/projects")
    input.user.role in ["manager", "auditor", "customer", "compliance"]
}

# Admin-only routes
allow if {
    startswith(input.path, "/api/admin")
    input.user.role == "admin"
}

# Manager routes (admin + manager)
allow if {
    startswith(input.path, "/api/manager")
    input.user.role in ["admin", "manager"]
}

# Auditor routes (admin + auditor + manager [read-only])
allow if {
    startswith(input.path, "/api/auditor")
    input.user.role in ["admin", "auditor"]
}

allow if {
    startswith(input.path, "/api/auditor")
    input.user.role == "manager"
    input.method == "GET"
}

# Customer routes (admin + customer + manager [read-only])
allow if {
    startswith(input.path, "/api/customer")
    input.user.role in ["admin", "customer"]
}

allow if {
    startswith(input.path, "/api/customer")
    input.user.role == "manager"
    input.method == "GET"
}

# =============================================
# COMPLIANCE ROUTES (Mixed permissions)
# =============================================

# Compliance user management - customer only can create/list compliance users
allow if {
    startswith(input.path, "/api/compliance/users")
    input.user.role in ["admin", "customer"]
}

# Compliance project sharing - customer only
allow if {
    input.path == "/api/compliance/share"
    input.user.role in ["admin", "customer"]
}

# Compliance dashboard and project access - compliance users only
allow if {
    startswith(input.path, "/api/compliance/dashboard")
    input.user.role in ["admin", "compliance"]
}

allow if {
    startswith(input.path, "/api/compliance/projects")
    input.user.role in ["admin", "compliance"]
}

# =============================================
# USER MANAGEMENT ROUTES
# =============================================

# User list/management - admin and manager
# Managers cannot DELETE users, only Admin
allow if {
    startswith(input.path, "/api/users")
    input.user.role == "admin"
}

allow if {
    startswith(input.path, "/api/users")
    input.user.role == "manager"
    input.method != "DELETE"
}

# =============================================
# CHAT ROUTES
# All authenticated users can use chat
# =============================================

allow if {
    startswith(input.path, "/api/chat")
    input.user.role in ["admin", "manager", "auditor", "customer"]
}

# =============================================
# EVIDENCE ROUTES
# Admin, manager, auditor, customer can access evidence
# Backend handles project-level access control
# =============================================

allow if {
    startswith(input.path, "/api/evidence")
    input.user.role in ["admin", "manager", "customer"]
}

allow if {
    startswith(input.path, "/api/evidence")
    input.user.role == "auditor"
    input.method in ["GET", "POST", "PUT", "PATCH", "DELETE"]
}

# =============================================
# UPLOADS ROUTES
# All authenticated users can upload files
# =============================================

allow if {
    startswith(input.path, "/api/uploads")
    input.user.role in ["admin", "manager", "auditor", "customer"]
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

# System routes (public for readme)
allow if {
    startswith(input.path, "/api/system")
}
