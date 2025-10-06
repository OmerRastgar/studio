#!/bin/bash

echo "Starting database setup..."

echo ""
echo "1. Starting Docker services..."
docker-compose up -d postgres

echo ""
echo "2. Waiting for PostgreSQL to be ready..."
sleep 10

echo ""
echo "3. Generating Prisma client..."
npm run db:generate

echo ""
echo "4. Applying database migrations..."
npm run db:push

echo ""
echo "5. Seeding database with initial data..."
npm run db:seed

echo ""
echo "6. Verifying users were created..."
echo "Checking for admin user:"
docker exec -i audit-postgres psql -U audituser -d auditdb -c "SELECT id, name, email, role, status FROM users WHERE email = 'admin@auditace.com';" || echo "❌ Admin user not found!"

echo ""
echo "Total users in database:"
docker exec -i audit-postgres psql -U audituser -d auditdb -c "SELECT COUNT(*) as total_users FROM users;"

echo ""
echo "Database setup complete!"
echo "You can now start the application with: npm run dev"
echo ""
echo "To access the application:"
echo "- Direct access: http://localhost:9002"
echo "- Through Kong Gateway: http://localhost:8000"
echo ""
echo "Default login credentials:"
echo "Email: admin@auditace.com"
echo "Password: admin123"