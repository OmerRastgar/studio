#!/bin/bash

echo "========================================"
echo "   Kong JWT Configuration Update"
echo "========================================"

# Check if docker-compose exists, if not try docker compose
DOCKER_COMPOSE_CMD="docker-compose"
if ! command -v docker-compose &> /dev/null; then
    if docker compose version &> /dev/null; then
        DOCKER_COMPOSE_CMD="docker compose"
    fi
fi

echo ""
echo "1. Stopping Kong Gateway..."
$DOCKER_COMPOSE_CMD stop kong-gateway

echo ""
echo "2. Rebuilding and starting Kong with updated JWT configuration..."
$DOCKER_COMPOSE_CMD up -d kong-gateway

echo ""
echo "3. Waiting for Kong to be ready..."
sleep 15

echo ""
echo "4. Testing Kong Admin API..."
curl -s http://localhost:8001/status | jq '.' || echo "Kong Admin API not responding (jq not installed)"

echo ""
echo "5. Checking Kong JWT consumer configuration..."
curl -s http://localhost:8001/consumers/audit-app/jwt | jq '.' || echo "JWT consumer check failed (jq not installed)"

echo ""
echo "6. Testing Kong routes..."
echo "Public routes (should work without JWT):"
curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/api/health
echo " - /api/health"

curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/login
echo " - /login"

echo ""
echo "Protected routes (should return 401 without JWT):"
curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/dashboard
echo " - /dashboard"

echo ""
echo "========================================"
echo "   Kong JWT Setup Complete!"
echo "========================================"
echo ""
echo "Kong is now configured with JWT authentication:"
echo ""
echo "✅ Public routes (no JWT required):"
echo "   - /login"
echo "   - /api/auth/login"
echo "   - /api/auth/register"
echo "   - /api/health"
echo "   - /_next/* (static assets)"
echo ""
echo "🔒 Protected routes (JWT required):"
echo "   - /dashboard"
echo "   - /api/* (except auth endpoints)"
echo "   - All other application routes"
echo ""
echo "JWT Configuration:"
echo "   - Consumer: audit-app"
echo "   - Key: audit-app-key"
echo "   - Algorithm: HS256"
echo "   - Cookie name: auth_token"
echo "   - Header name: authorization"
echo ""
echo "Test the authentication flow:"
echo "1. Go to http://localhost:8000/login"
echo "2. Login with admin@auditace.com / admin123"
echo "3. You should be redirected to /dashboard"
echo ""
echo "If there are issues, check logs:"
echo "  docker logs kong-gateway"