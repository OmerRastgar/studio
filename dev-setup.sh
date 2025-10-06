#!/bin/bash

echo "========================================"
echo "   Next.js Audit Application Setup"
echo "========================================"

echo ""
echo "1. Installing dependencies..."
npm install

echo ""
echo "2. Starting PostgreSQL database..."
docker-compose up -d postgres

echo ""
echo "3. Waiting for database to be ready..."
sleep 15

echo ""
echo "4. Generating Prisma client..."
npm run db:generate

echo ""
echo "5. Resetting and applying database schema..."
npm run db:reset -- --force

echo ""
echo "6. Seeding database with sample data..."
npm run db:seed

echo ""
echo "7. Verifying users were created..."
echo "Checking admin user exists:"
docker exec -i audit-postgres psql -U audituser -d auditdb -c "SELECT id, name, email, role, status FROM users WHERE email = 'admin@auditace.com';"

echo ""
echo "All users in database:"
docker exec -i audit-postgres psql -U audituser -d auditdb -c "SELECT email, role, status FROM users ORDER BY role;"

echo ""
echo "Total user count:"
docker exec -i audit-postgres psql -U audituser -d auditdb -c "SELECT COUNT(*) as total_users FROM users;"

echo ""
echo "========================================"
echo "   Setup Complete!"
echo "========================================"
echo ""
echo "Your application is ready to use:"
echo ""
echo "- Database: PostgreSQL running on localhost:5432"
echo "- Database name: auditdb"
echo "- Username: audituser"
echo "- Password: auditpass"
echo ""
echo "Default login credentials:"
echo "- Email: admin@auditace.com"
echo "- Password: admin123"
echo ""
echo "To start the development server:"
echo "  npm run dev"
echo ""
echo "The app will be available at:"
echo "  http://localhost:9002"
echo ""