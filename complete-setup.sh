#!/bin/bash

echo "🚀 Complete Audit Platform Setup"
echo "================================="

# Stop existing services
echo "📦 Stopping existing services..."
docker-compose down -v --remove-orphans

# Start PostgreSQL
echo "🐘 Starting PostgreSQL..."
docker-compose up -d postgres
sleep 20

# Check if PostgreSQL is ready
echo "⏳ Waiting for PostgreSQL to be ready..."
until docker-compose exec postgres pg_isready -U audituser -d auditdb > /dev/null 2>&1; do
    echo "⏳ Still waiting for PostgreSQL..."
    sleep 5
done
echo "✅ PostgreSQL is ready!"

# Start application
echo "📱 Starting application..."
docker-compose up -d app
sleep 20

# Install bcryptjs
echo "🔧 Installing bcryptjs in app container..."
docker-compose exec app npm install bcryptjs

# Copy and execute database initialization script
echo "🗃️  Initializing database..."
docker cp init-database.sh $(docker-compose ps -q postgres):/tmp/init-database.sh
docker-compose exec postgres chmod +x /tmp/init-database.sh
docker-compose exec postgres bash /tmp/init-database.sh

# Start all services
echo "🌐 Starting all services (Kong, Grafana, Loki, Fluent Bit)..."
docker-compose up -d

# Wait for services to be ready
echo "⏳ Waiting for all services to be ready..."
sleep 30

# Check service status
echo "📊 Service Status:"
docker-compose ps

echo ""
echo "🎉 Setup Complete!"
echo "=================="
echo ""
echo "🌐 Access Points:"
echo "  Application: http://96.30.194.117:8000"
echo "  Login Page:  http://96.30.194.117:8000/login"
echo "  Grafana:     http://96.30.194.117:3001 (admin/admin123)"
echo "  Kong Admin:  http://96.30.194.117:8001"
echo "  Loki:        http://96.30.194.117:3100"
echo ""
echo "🔐 Test Login Credentials:"
echo "  Admin:    admin@auditace.com / admin123"
echo "  Auditor:  jane.doe@example.com / jane123"
echo "  Customer: client@customer.com / client123"
echo ""
echo "🧪 Test Commands:"
echo "  # Test login:"
echo "  curl -X POST http://96.30.194.117:8000/api/auth/login \\"
echo "    -H \"Content-Type: application/json\" \\"
echo "    -d '{\"email\": \"admin@auditace.com\", \"password\": \"admin123\"}'"
echo ""
echo "  # Test debug endpoint:"
echo "  curl http://96.30.194.117:8000/api/debug"
echo ""
echo "  # View logs:"
echo "  docker-compose logs app"