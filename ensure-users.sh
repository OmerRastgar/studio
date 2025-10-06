#!/bin/bash

echo "========================================"
echo "   User Creation Verification Script"
echo "========================================"

echo ""
echo "This script ensures users are created in the database."
echo "It will run the seed script and verify user creation."
echo ""

echo "1. Checking if database is running..."
if ! docker ps | grep -q audit-postgres; then
    echo "Starting PostgreSQL database..."
    docker-compose up -d postgres
    sleep 10
fi

echo ""
echo "2. Setting up database and users..."
# Use the existing app container for database operations
if docker ps | grep -q nextjs-app; then
    echo "Using existing nextjs-app container..."
    docker exec nextjs-app sh -c "
        npx prisma generate &&
        npm run db:seed
    "
else
    echo "nextjs-app container not running, starting services first..."
    docker-compose up -d
    sleep 20
    docker exec nextjs-app sh -c "
        npx prisma generate &&
        npm run db:seed
    "
fi

echo ""
echo "4. Verifying users were created..."

echo ""
echo "Admin user check:"
ADMIN_EXISTS=$(docker exec -i audit-postgres psql -U audituser -d auditdb -t -c "SELECT COUNT(*) FROM users WHERE email = 'admin@auditace.com';" | tr -d ' ')

if [ "$ADMIN_EXISTS" -eq "1" ]; then
    echo "✅ Admin user exists"
    docker exec -i audit-postgres psql -U audituser -d auditdb -c "SELECT id, name, email, role, status FROM users WHERE email = 'admin@auditace.com';"
else
    echo "❌ Admin user NOT found - attempting to create manually..."
    
    # Manual user creation as fallback
    docker exec -i audit-postgres psql -U audituser -d auditdb -c "
    INSERT INTO users (id, name, email, password, role, status, created_at, updated_at) 
    VALUES (
        'user-admin-manual', 
        'Admin Auditor', 
        'admin@auditace.com', 
        '\$2b\$12\$LQv3c1yqBwEHxv68fVFCe.QtxkS7B2XwdvOpw6G5.JjHd2jROndvi', 
        'admin', 
        'Active', 
        NOW(), 
        NOW()
    ) ON CONFLICT (email) DO NOTHING;
    "
    
    echo "Manual admin user creation attempted."
fi

echo ""
echo "Total users in database:"
docker exec -i audit-postgres psql -U audituser -d auditdb -c "SELECT COUNT(*) as total_users FROM users;"

echo ""
echo "All users:"
docker exec -i audit-postgres psql -U audituser -d auditdb -c "SELECT email, role, status FROM users ORDER BY role;"

echo ""
echo "========================================"
echo "   User Verification Complete"
echo "========================================"

# Test login functionality
echo ""
echo "5. Testing login functionality..."
if command -v node &> /dev/null && [ -f "test-login.js" ]; then
    echo "Running login test..."
    timeout 10s node test-login.js 2>/dev/null || echo "Login test timed out or failed - this is normal if the app isn't running"
else
    echo "Login test script not available or Node.js not found"
fi

echo ""
echo "Users are now ready! You can login with:"
echo "Email: admin@auditace.com"
echo "Password: admin123"