#!/bin/bash

echo "========================================"
echo "   Docker-Only Setup Script"
echo "========================================"

# Check if docker-compose exists, if not try docker compose
DOCKER_COMPOSE_CMD="docker-compose"
if ! command -v docker-compose &> /dev/null; then
    if docker compose version &> /dev/null; then
        DOCKER_COMPOSE_CMD="docker compose"
        echo "Using 'docker compose' command"
    else
        echo "❌ Neither 'docker-compose' nor 'docker compose' found!"
        echo "Please install Docker Compose"
        exit 1
    fi
fi

echo ""
echo "1. Building and starting all services..."
$DOCKER_COMPOSE_CMD up -d --build

echo ""
echo "2. Waiting for services to be ready..."
sleep 30

echo ""
echo "3. Checking service status..."
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo ""
echo "4. Setting up database (if needed)..."
# Wait for postgres to be ready
echo "Waiting for PostgreSQL to be ready..."
for i in {1..30}; do
    if docker exec audit-postgres pg_isready -U audituser -d auditdb &>/dev/null; then
        echo "✅ PostgreSQL is ready"
        break
    fi
    echo "Waiting for PostgreSQL... ($i/30)"
    sleep 2
done

echo ""
echo "5. Initializing database with users..."
# Run database setup inside the app container
docker exec nextjs-app sh -c "
    npx prisma generate &&
    npx prisma db push --force-reset &&
    npm run db:seed
" || echo "Database setup will be handled by the application on first run"

echo ""
echo "6. Verifying setup..."
echo "Checking if admin user exists:"
docker exec -i audit-postgres psql -U audituser -d auditdb -c "SELECT id, name, email, role FROM users WHERE email = 'admin@auditace.com';" 2>/dev/null || echo "Users will be created on first application start"

echo ""
echo "========================================"
echo "   Setup Complete!"
echo "========================================"
echo ""
echo "🚀 Your application is now running!"
echo ""
echo "Access points:"
echo "- Main Application: http://localhost:8000 (Kong Gateway)"
echo "- Grafana Dashboard: http://localhost:3001 (admin/admin123)"
echo "- Kong Admin: http://localhost:8001"
echo ""
echo "Default login credentials:"
echo "- Email: admin@auditace.com"
echo "- Password: admin123"
echo ""
echo "Useful commands:"
echo "- Check status: docker ps"
echo "- View logs: $DOCKER_COMPOSE_CMD logs [service-name]"
echo "- Stop services: $DOCKER_COMPOSE_CMD down"
echo "- Restart services: $DOCKER_COMPOSE_CMD restart"
echo ""
echo "If login doesn't work, run: ./ensure-users.sh"