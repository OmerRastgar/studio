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
echo "This may take a few minutes on first run..."
sleep 45

echo ""
echo "3. Checking service status..."
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo ""
echo "4. Waiting for PostgreSQL to be ready..."
for i in {1..30}; do
    if docker exec audit-postgres pg_isready -U audituser -d auditdb &>/dev/null; then
        echo "✅ PostgreSQL is ready"
        break
    fi
    echo "Waiting for PostgreSQL... ($i/30)"
    sleep 2
done

echo ""
echo "5. Waiting for Next.js app to be ready..."
for i in {1..30}; do
    if docker exec nextjs-app test -f /app/package.json &>/dev/null; then
        echo "✅ Next.js app container is ready"
        break
    fi
    echo "Waiting for Next.js app... ($i/30)"
    sleep 2
done

echo ""
echo "6. Setting up database schema and users..."
# Multiple attempts to ensure database setup works
for attempt in 1 2 3; do
    echo "Database setup attempt $attempt/3..."
    if docker exec nextjs-app sh -c "
        npx prisma generate &&
        npx prisma db push --force-reset &&
        npm run db:seed
    "; then
        echo "✅ Database setup successful!"
        break
    else
        echo "⚠️  Database setup attempt $attempt failed, retrying..."
        sleep 10
    fi
done

echo ""
echo "7. Verifying setup..."
echo "Checking if admin user exists:"
if docker exec -i audit-postgres psql -U audituser -d auditdb -c "SELECT id, name, email, role FROM users WHERE email = 'admin@auditace.com';" 2>/dev/null | grep -q "admin@auditace.com"; then
    echo "✅ Admin user found in database"
else
    echo "⚠️  Admin user not found, running manual user creation..."
    docker exec nextjs-app npm run db:seed
fi

echo ""
echo "8. Final service check..."
echo "Running containers:"
docker ps --format "table {{.Names}}\t{{.Status}}"

echo ""
echo "========================================"
echo "   Setup Complete!"
echo "========================================"
echo ""
echo "🚀 Your application is now running!"
echo ""
echo "Access points:"
echo "- Main Application: http://localhost:8000 (Kong Gateway)"
echo "- Direct App Access: http://localhost:3000 (if exposed)"
echo "- Grafana Dashboard: http://localhost:3001 (admin/admin123)"
echo "- Kong Admin: http://localhost:8001"
echo ""
echo "Default login credentials:"
echo "- Email: admin@auditace.com"
echo "- Password: admin123"
echo ""
echo "Useful commands:"
echo "- Check status: docker ps"
echo "- View app logs: $DOCKER_COMPOSE_CMD logs nextjs-app"
echo "- View all logs: $DOCKER_COMPOSE_CMD logs"
echo "- Stop services: $DOCKER_COMPOSE_CMD down"
echo "- Restart services: $DOCKER_COMPOSE_CMD restart"
echo ""
echo "If login doesn't work:"
echo "1. Check app logs: docker logs nextjs-app"
echo "2. Manually seed database: docker exec nextjs-app npm run db:seed"
echo "3. Run: ./ensure-users.sh"