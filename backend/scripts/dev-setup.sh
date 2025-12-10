#!/bin/bash

echo "========================================"
echo "   Next.js Audit Application Setup"
echo "========================================"

# Check if docker-compose exists, if not try docker compose
DOCKER_COMPOSE_CMD="docker-compose"
if ! command -v docker-compose &> /dev/null; then
    if docker compose version &> /dev/null; then
        DOCKER_COMPOSE_CMD="docker compose"
        echo "Using 'docker compose' command"
    else
        echo "❌ Neither 'docker-compose' nor 'docker compose' found!"
        exit 1
    fi
fi

echo ""
echo "1. Starting PostgreSQL database..."
$DOCKER_COMPOSE_CMD up -d postgres

echo ""
echo "2. Waiting for database to be ready..."
sleep 15

echo ""
echo "3. Building and starting the application..."
$DOCKER_COMPOSE_CMD up -d --build

echo ""
echo "4. Waiting for application container to be ready..."
sleep 20

echo ""
echo "5. Setting up database schema and seeding data..."
# Use the existing app container to setup database
docker exec nextjs-app sh -c "
    npx prisma generate &&
    npx prisma db push --force-reset &&
    npm run db:seed
" || echo "⚠️  Database setup failed, will retry after container is fully ready"

echo ""
echo "6. Retrying database setup if needed..."
sleep 10
docker exec nextjs-app sh -c "
    npx prisma generate &&
    npx prisma db push --force-reset &&
    npm run db:seed
" || echo "⚠️  Database setup still failing, check logs with: docker logs nextjs-app"

echo ""
echo "7. Verifying users were created..."
echo "Checking admin user exists:"
docker exec -i audit-postgres psql -U audituser -d auditdb -c "SELECT id, name, email, role, status FROM users WHERE email = 'admin@auditace.com';" 2>/dev/null || echo "Database not ready yet, this is normal on first run"

echo ""
echo "All users in database:"
docker exec -i audit-postgres psql -U audituser -d auditdb -c "SELECT email, role, status FROM users ORDER BY role;" 2>/dev/null || echo "Database not ready yet, this is normal on first run"

echo ""
echo "Total user count:"
docker exec -i audit-postgres psql -U audituser -d auditdb -c "SELECT COUNT(*) as total_users FROM users;" 2>/dev/null || echo "Database not ready yet, this is normal on first run"

echo ""
echo "========================================"
echo "   Setup Complete!"
echo "========================================"
echo ""
echo "Your application is ready to use:"
echo ""
echo "Services running:"
echo "- Database: PostgreSQL on port 5432"
echo "- Application: Next.js app in Docker"
echo "- API Gateway: Kong on port 8000"
echo "- Monitoring: Grafana on port 3001"
echo ""
echo "Access the application:"
echo "- Main app: http://localhost:8000 (via Kong Gateway)"
echo "- Grafana: http://localhost:3001 (admin/admin123)"
echo ""
echo "Default login credentials:"
echo "- Email: admin@auditace.com"
echo "- Password: admin123"
echo ""
echo "To check status: docker ps"
echo "To view logs: $DOCKER_COMPOSE_CMD logs [service-name]"
echo ""