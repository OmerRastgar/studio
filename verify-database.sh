#!/bin/bash

echo "========================================"
echo "   Database Verification Script"
echo "========================================"

echo ""
echo "1. Checking if PostgreSQL container is running..."
docker ps --filter "name=audit-postgres" --format "table {{.Names}}\t{{.Status}}"

echo ""
echo "2. Testing database connection..."
docker exec -it audit-postgres psql -U audituser -d auditdb -c "\dt"

echo ""
echo "3. Checking if users table exists and has data..."
docker exec -it audit-postgres psql -U audituser -d auditdb -c "SELECT COUNT(*) as user_count FROM users;"

echo ""
echo "4. Checking UserRole and UserStatus enums..."
docker exec -it audit-postgres psql -U audituser -d auditdb -c "\dT+ UserRole"
docker exec -it audit-postgres psql -U audituser -d auditdb -c "\dT+ UserStatus"

echo ""
echo "5. Verifying admin user exists..."
docker exec -it audit-postgres psql -U audituser -d auditdb -c "SELECT id, name, email, role, status FROM users WHERE email = 'admin@auditace.com';"

echo ""
echo "6. Checking migration status..."
docker exec -it audit-postgres psql -U audituser -d auditdb -c "SELECT migration_name, finished_at, rolled_back_at FROM _prisma_migrations ORDER BY finished_at DESC;"

echo ""
echo "========================================"
echo "   Verification Complete"
echo "========================================"