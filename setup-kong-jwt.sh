#!/bin/bash

echo "========================================"
echo "   Kong JWT Authentication Setup"
echo "========================================"

# Check if docker-compose exists, if not try docker compose
DOCKER_COMPOSE_CMD="docker-compose"
if ! command -v docker-compose &> /dev/null; then
    if docker compose version &> /dev/null; then
        DOCKER_COMPOSE_CMD="docker compose"
    fi
fi

echo ""
echo "This script will configure Kong JWT authentication for the audit application."
echo "Kong will handle JWT validation at the API gateway level."
echo ""

echo "1. Stopping services to apply configuration changes..."
$DOCKER_COMPOSE_CMD stop kong-gateway nextjs-app

echo ""
echo "2. Rebuilding Next.js app with Kong JWT integration..."
$DOCKER_COMPOSE_CMD build --no-cache nextjs-app

echo ""
echo "3. Starting Kong Gateway with JWT configuration..."
$DOCKER_COMPOSE_CMD up -d kong-gateway

echo ""
echo "4. Waiting for Kong to initialize..."
sleep 20

echo ""
echo "5. Starting Next.js application..."
$DOCKER_COMPOSE_CMD up -d nextjs-app

echo ""
echo "6. Waiting for application to be ready..."
sleep 15

echo ""
echo "7. Verifying Kong JWT configuration..."
echo "Checking Kong status:"
curl -s http://localhost:8001/status | grep -o '"database":{"reachable":[^}]*}' || echo "Kong status check failed"

echo ""
echo "Checking JWT consumer:"
curl -s http://localhost:8001/consumers/audit-app | grep -o '"username":"audit-app"' || echo "JWT consumer not found"

echo ""
echo "8. Testing authentication flow..."
echo ""
echo "Testing public routes (should work without authentication):"

# Test health endpoint
HEALTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/api/health)
echo "  /api/health: $HEALTH_STATUS (should be 200)"

# Test login page
LOGIN_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/login)
echo "  /login: $LOGIN_STATUS (should be 200)"

echo ""
echo "Testing protected routes (should require authentication):"

# Test dashboard without JWT
DASHBOARD_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/dashboard)
echo "  /dashboard (no JWT): $DASHBOARD_STATUS (should be 401)"

echo ""
echo "Testing login API and JWT generation:"
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@auditace.com","password":"admin123"}')

if echo "$LOGIN_RESPONSE" | grep -q '"success":true'; then
    echo "  ✅ Login API working"
    
    # Extract token
    TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
    if [ -n "$TOKEN" ]; then
        echo "  ✅ JWT token generated: ${TOKEN:0:20}..."
        
        # Test protected route with JWT
        PROTECTED_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
          -H "Authorization: Bearer $TOKEN" \
          http://localhost:8000/api/auth/me)
        echo "  /api/auth/me (with JWT): $PROTECTED_STATUS (should be 200)"
        
        # Test dashboard with JWT cookie
        DASHBOARD_JWT_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
          -H "Cookie: auth_token=$TOKEN" \
          http://localhost:8000/dashboard)
        echo "  /dashboard (with JWT cookie): $DASHBOARD_JWT_STATUS (should be 200)"
    else
        echo "  ❌ No JWT token in login response"
    fi
else
    echo "  ❌ Login API failed"
    echo "  Response: $LOGIN_RESPONSE"
fi

echo ""
echo "========================================"
echo "   Kong JWT Setup Complete!"
echo "========================================"
echo ""
echo "🚀 Kong JWT Authentication is now active!"
echo ""
echo "Architecture:"
echo "  Browser → Kong Gateway (JWT validation) → Next.js App"
echo ""
echo "Authentication Flow:"
echo "  1. User visits /login (public route)"
echo "  2. User submits credentials to /api/auth/login (public route)"
echo "  3. App generates JWT token and sets cookie"
echo "  4. All subsequent requests go through Kong JWT validation"
echo "  5. Kong validates JWT and forwards to Next.js app"
echo ""
echo "Access Points:"
echo "  - Main App: http://localhost:8000 (Kong Gateway with JWT)"
echo "  - Kong Admin: http://localhost:8001"
echo "  - Direct App: http://localhost:3000 (bypass Kong - for debugging)"
echo ""
echo "Default Credentials:"
echo "  - Email: admin@auditace.com"
echo "  - Password: admin123"
echo ""
echo "JWT Configuration:"
echo "  - Consumer: audit-app"
echo "  - Key: audit-app-key (iss claim)"
echo "  - Algorithm: HS256"
echo "  - Cookie: auth_token"
echo "  - Header: Authorization: Bearer <token>"
echo ""
echo "Troubleshooting:"
echo "  - Check Kong logs: docker logs kong-gateway"
echo "  - Check App logs: docker logs nextjs-app"
echo "  - Test JWT manually: curl -H 'Authorization: Bearer <token>' http://localhost:8000/api/auth/me"