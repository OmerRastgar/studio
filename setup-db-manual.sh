#!/bin/bash

echo "========================================"
echo "   Manual Database Setup"
echo "========================================"

echo ""
echo "This script sets up the database using existing containers."
echo "Make sure containers are running first: docker-compose up -d"
echo ""

# Check if containers are running
if ! docker ps | grep -q nextjs-app; then
    echo "❌ nextjs-app container is not running"
    echo "Start it with: docker-compose up -d"
    exit 1
fi

if ! docker ps | grep -q audit-postgres; then
    echo "❌ audit-postgres container is not running"
    echo "Start it with: docker-compose up -d postgres"
    exit 1
fi

echo "✅ Containers are running"

echo ""
echo "1. Waiting for PostgreSQL to be ready..."
for i in {1..30}; do
    if docker exec audit-postgres pg_isready -U audituser -d auditdb &>/dev/null; then
        echo "✅ PostgreSQL is ready"
        break
    fi
    echo "Waiting for PostgreSQL... ($i/30)"
    sleep 2
done

echo ""
echo "2. Generating Prisma client..."
docker exec nextjs-app npx prisma generate

echo ""
echo "3. Pushing database schema..."
docker exec nextjs-app npx prisma db push --force-reset

echo ""
echo "4. Seeding database with users and data..."
docker exec nextjs-app npm run db:seed

echo ""
echo "5. Verifying users were created..."
echo "Admin user check:"
docker exec -i audit-postgres psql -U audituser -d auditdb -c "SELECT id, name, email, role, status FROM users WHERE email = 'admin@auditace.com';"

echo ""
echo "Total users:"
docker exec -i audit-postgres psql -U audituser -d auditdb -c "SELECT COUNT(*) as total_users FROM users;"

echo ""
echo "All users:"
docker exec -i audit-postgres psql -U audituser -d auditdb -c "SELECT email, role, status FROM users ORDER BY role;"

echo ""
echo "========================================"
echo "   Database Setup Complete!"
echo "========================================"
echo ""
echo "You can now login with:"
echo "- Email: admin@auditace.com"
echo "- Password: admin123"
echo ""
echo "Access the app at: http://localhost:8000"