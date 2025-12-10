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

# Admin-only routes
allow if {
    startswith(input.path, "/api/admin")
    lower(input.user.role) == "admin"
}

# Manager routes (admin + manager)
allow if {
    startswith(input.path, "/api/manager")
    lower(input.user.role) in ["admin", "manager"]
}

# Auditor routes (admin + auditor + manager for view-only reports access)
allow if {
    startswith(input.path, "/api/auditor")
    lower(input.user.role) in ["admin", "auditor", "manager"]
}

# Customer routes (admin + customer)
allow if {
    startswith(input.path, "/api/customer")
    lower(input.user.role) in ["admin", "customer"]
}

# =============================================
# COMPLIANCE ROUTES (Mixed permissions)
# =============================================

# Compliance user management - customer only can create/list compliance users
allow if {
    startswith(input.path, "/api/compliance/users")
    lower(input.user.role) in ["admin", "customer"]
}

# Compliance project sharing - customer only
allow if {
    input.path == "/api/compliance/share"
    lower(input.user.role) in ["admin", "customer"]
}

# Compliance dashboard and project access - compliance users only
allow if {
    startswith(input.path, "/api/compliance/dashboard")
    lower(input.user.role) in ["admin", "compliance"]
}

allow if {
    startswith(input.path, "/api/compliance/projects")
    lower(input.user.role) in ["admin", "compliance"]
}

# =============================================
# USER MANAGEMENT ROUTES
# =============================================

# User list/management - admin and manager only
allow if {
    startswith(input.path, "/api/users")
    lower(input.user.role) in ["admin", "manager"]
}

# =============================================
# CHAT ROUTES
# All authenticated users can use chat
# =============================================

allow if {
    startswith(input.path, "/api/chat")
    lower(input.user.role) in ["admin", "manager", "auditor", "customer"]
}

# =============================================
# EVIDENCE ROUTES
# Admin, manager, auditor, customer can access evidence
# Backend handles project-level access control
# =============================================

allow if {
    startswith(input.path, "/api/evidence")
    lower(input.user.role) in ["admin", "manager", "auditor", "customer"]
}

# =============================================
# UPLOADS ROUTES
# All authenticated users can upload files
# =============================================

allow if {
    startswith(input.path, "/api/uploads")
    lower(input.user.role) in ["admin", "manager", "auditor", "customer"]
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
