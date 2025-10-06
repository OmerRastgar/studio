#!/bin/bash

echo "========================================"
echo "   Database Issues Fix Script"
echo "========================================"

echo ""
echo "This script will resolve the following issues:"
echo "1. Missing users table"
echo "2. Missing UserRole and UserStatus enums"
echo "3. Empty users table"
echo "4. Failed migration cleanup"
echo ""

read -p "Do you want to continue? (y/n): " continue
if [[ ! "$continue" =~ ^[Yy]$ ]]; then
    echo "Exiting..."
    exit 0
fi

echo ""
echo "1. Starting PostgreSQL if not running..."
docker-compose up -d postgres

echo ""
echo "2. Waiting for database to be ready..."
sleep 10

echo ""
echo "3. Cleaning up failed migrations..."
docker exec -i audit-postgres psql -U audituser -d auditdb -c "DELETE FROM _prisma_migrations WHERE migration_name = '20241229_add_password';" 2>/dev/null || true

echo ""
echo "4. Dropping existing tables if they exist (to start fresh)..."
docker exec -i audit-postgres psql -U audituser -d auditdb -c "DROP TABLE IF EXISTS users CASCADE;" 2>/dev/null || true

echo ""
echo "5. Dropping existing enums if they exist..."
docker exec -i audit-postgres psql -U audituser -d auditdb -c "DROP TYPE IF EXISTS \"UserRole\" CASCADE;" 2>/dev/null || true
docker exec -i audit-postgres psql -U audituser -d auditdb -c "DROP TYPE IF EXISTS \"UserStatus\" CASCADE;" 2>/dev/null || true

echo ""
echo "6. Setting up database schema and data..."
# Use Docker container for all npm operations
docker run --rm -v "$(pwd)":/app -w /app --network host node:20-alpine sh -c "
    npm install --no-audit --no-fund &&
    npx prisma generate &&
    npx prisma db push --force-reset &&
    npm run db:seed
"

echo ""
echo "9. Verifying the fix..."
echo "Checking users table:"
docker exec -i audit-postgres psql -U audituser -d auditdb -c "SELECT id, name, email, role, status FROM users LIMIT 5;"

echo ""
echo "Verifying admin user specifically:"
docker exec -i audit-postgres psql -U audituser -d auditdb -c "SELECT id, name, email, role, status FROM users WHERE email = 'admin@auditace.com';"

echo ""
echo "Total users count:"
docker exec -i audit-postgres psql -U audituser -d auditdb -c "SELECT COUNT(*) as total_users FROM users;"

echo ""
echo "Checking enums:"
docker exec -i audit-postgres psql -U audituser -d auditdb -c "\dT+ UserRole"
docker exec -i audit-postgres psql -U audituser -d auditdb -c "\dT+ UserStatus"

echo ""
echo "========================================"
echo "   Fix Complete!"
echo "========================================"
echo ""
echo "You can now test the login with:"
echo "Email: admin@auditace.com"
echo "Password: admin123"
echo ""
echo "Start the application with: npm run dev"
echo "Then visit: http://localhost:9002"
echo ""