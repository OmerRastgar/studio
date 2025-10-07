#!/bin/bash

echo "========================================="
echo "Testing Authentication Flow"
echo "========================================="
echo ""

# Test 1: Root path should redirect to login
echo "1. Testing root path access..."
response=$(curl -s -L -w "HTTPSTATUS:%{http_code}" http://localhost/)
http_code=$(echo $response | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')
echo "Root path (/) HTTP Status: $http_code"

if [[ $http_code -eq 200 ]]; then
    echo "✅ Root path accessible"
else
    echo "❌ Root path returned: $http_code"
fi

echo ""

# Test 2: Login page should be accessible
echo "2. Testing login page access..."
response=$(curl -s -L -w "HTTPSTATUS:%{http_code}" http://localhost/login)
http_code=$(echo $response | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')
echo "Login page (/login) HTTP Status: $http_code"

if [[ $http_code -eq 200 ]]; then
    echo "✅ Login page accessible"
else
    echo "❌ Login page returned: $http_code"
fi

echo ""

# Test 3: Dashboard should require authentication
echo "3. Testing dashboard access without auth..."
response=$(curl -s -L -w "HTTPSTATUS:%{http_code}" http://localhost/dashboard)
http_code=$(echo $response | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')
echo "Dashboard (/dashboard) HTTP Status: $http_code"

if [[ $http_code -eq 401 ]] || [[ $http_code -eq 403 ]]; then
    echo "✅ Dashboard properly protected"
elif [[ $http_code -eq 200 ]]; then
    echo "⚠️  Dashboard accessible (might be redirecting to login)"
else
    echo "❌ Dashboard returned unexpected: $http_code"
fi

echo ""

# Test 4: API endpoints
echo "4. Testing API endpoints..."
echo "Health check:"
curl -s -w "HTTP Status: %{http_code}\n" http://localhost/api/health

echo "Login API:"
curl -s -w "HTTP Status: %{http_code}\n" http://localhost/api/auth/login -X POST -H "Content-Type: application/json" -d '{"email":"test","password":"test"}'

echo ""

# Test 5: Direct port 3000 access (should be blocked)
echo "5. Testing direct port 3000 access (should be blocked)..."
response=$(curl -s -w "HTTPSTATUS:%{http_code}" http://localhost:3000/api/health 2>/dev/null || echo "HTTPSTATUS:CONNECTION_REFUSED")
http_code=$(echo $response | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')

if [[ $http_code == "CONNECTION_REFUSED" ]]; then
    echo "✅ Port 3000 properly blocked (connection refused)"
elif [[ $http_code -eq 403 ]]; then
    echo "✅ Port 3000 properly blocked (403 Forbidden)"
else
    echo "❌ Port 3000 accessible: $http_code"
fi

echo ""
echo "========================================="
echo "Authentication Flow Test Complete"
echo "========================================="
echo ""
echo "🌐 To test the full flow:"
echo "1. Go to: http://localhost or http://96.30.194.117"
echo "2. Should redirect to login page"
echo "3. Login with: admin@auditace.com / admin123"
echo "4. Should redirect to dashboard"
echo ""
echo "📋 Available accounts:"
echo "- Admin: admin@auditace.com / admin123"
echo "- Manager: manager@auditace.com / manager123"
echo "- Auditor: jane.doe@example.com / jane123"
echo "- Reviewer: reviewer@auditace.com / reviewer123"
echo "- Customer: client@customer.com / client123"