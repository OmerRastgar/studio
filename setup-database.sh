#!/bin/bash

echo "Starting database setup..."

# Check if docker-compose exists, if not try docker compose
DOCKER_COMPOSE_CMD="docker-compose"
if ! command -v docker-compose &> /dev/null; then
    if docker compose version &> /dev/null; then
        DOCKER_COMPOSE_CMD="docker compose"
    else
        echo "❌ Neither 'docker-compose' nor 'docker compose' found!"
        exit 1
    fi
fi

echo ""
echo "1. Starting Docker services..."
$DOCKER_COMPOSE_CMD up -d postgres

echo ""
echo "2. Waiting for PostgreSQL to be ready..."
sleep 10

echo ""
echo "3. Setting up database schema and data..."
# Use Docker container for all npm operations
docker run --rm -v "$(pwd)":/app -w /app --network host node:20-alpine sh -c "
    npm install --no-audit --no-fund &&
    npx prisma generate &&
    npx prisma db push &&
    npm run db:seed
"

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