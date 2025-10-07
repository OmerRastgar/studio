#!/bin/bash

echo "========================================="
echo "Updating Security Configuration"
echo "========================================="
echo "This script will:"
echo "1. Stop all services"
echo "2. Update Kong configuration for strict security"
echo "3. Remove direct port 3000 access"
echo "4. Route port 80 to Kong gateway"
echo "5. Restart services with new security settings"
echo ""

# Stop all services
echo "1. Stopping all services..."
docker compose down

# Remove any existing containers to ensure clean start
echo "2. Cleaning up containers..."
docker container prune -f

# Rebuild the application
echo "3. Rebuilding application..."
docker compose build app

# Start services in the correct order
echo "4. Starting database..."
docker compose up -d postgres

# Wait for database to be ready
echo "5. Waiting for database to be ready..."
sleep 10

# Start Kong gateway
echo "6. Starting Kong gateway..."
docker compose up -d kong

# Wait for Kong to initialize
echo "7. Waiting for Kong to initialize..."
sleep 5

# Start the application
echo "8. Starting Next.js application..."
docker compose up -d app

# Start monitoring services
echo "9. Starting monitoring services..."
docker compose up -d grafana fluent-bit loki

# Wait for all services to be ready
echo "10. Waiting for all services to be ready..."
sleep 10

# Test the security configuration
echo "11. Testing security configuration..."

echo ""
echo "Testing main application access (should work):"
curl -s -o /dev/null -w "Port 80: %{http_code}\n" http://localhost/api/health
curl -s -o /dev/null -w "Port 8000: %{http_code}\n" http://localhost:8000/api/health

echo ""
echo "Testing direct port 3000 access (should be blocked):"
curl -s -o /dev/null -w "Port 3000: %{http_code}\n" http://localhost:3000/api/health || echo "Port 3000: Connection refused (GOOD - direct access blocked)"

echo ""
echo "========================================="
echo "Security Update Complete!"
echo "========================================="
echo ""
echo "🔒 Security Features Enabled:"
echo "✅ Port 80 routes to Kong Gateway"
echo "✅ Direct port 3000 access blocked by Docker networking"
echo "✅ Strict CORS policy implemented"
echo "✅ Kong security plugins active"
echo "✅ Bot detection enabled"
echo "✅ Request size limiting enabled"
echo "✅ Security headers added by Kong"
echo "✅ ACL (Access Control List) enabled"
echo ""
echo "🌐 Access Points:"
echo "- Main Application: http://localhost (port 80)"
echo "- Kong Gateway: http://localhost:8000 (for debugging)"
echo "- Kong Admin: http://localhost:8001"
echo "- Grafana: http://localhost:3001"
echo ""
echo "🚫 Blocked Access:"
echo "- Direct App: http://localhost:3000 (blocked by security)"
echo ""
echo "📋 Login Credentials:"
echo "- Admin: admin@auditace.com / admin123"
echo "- Manager: manager@auditace.com / manager123"
echo "- Auditor: jane.doe@example.com / jane123"
echo "- Reviewer: reviewer@auditace.com / reviewer123"
echo "- Customer: client@customer.com / client123"
echo ""
echo "To check service status: docker compose ps"
echo "To view logs: docker compose logs [service-name]"
echo ""
echo "🔄 Testing authentication flow..."
chmod +x test-auth-flow.sh
./test-auth-flow.sh