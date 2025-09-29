#!/bin/bash

# Development setup script for the audit application

echo "🚀 Setting up Audit Application Development Environment"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null; then
    echo "❌ docker-compose is not installed. Please install Docker Compose."
    exit 1
fi

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp .env.example .env
    echo "✅ .env file created. You can modify it if needed."
fi

# Start PostgreSQL first
echo "🐘 Starting PostgreSQL database..."
docker-compose up -d postgres

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL to be ready..."
sleep 10

# Check if PostgreSQL is ready
until docker-compose exec postgres pg_isready -U audituser -d auditdb > /dev/null 2>&1; do
    echo "⏳ Still waiting for PostgreSQL..."
    sleep 5
done

echo "✅ PostgreSQL is ready!"

# Build and start all services
echo "🏗️  Building and starting all services..."
docker-compose up --build -d

# Wait a moment for services to start
sleep 5

# Check service status
echo "📊 Service Status:"
docker-compose ps

echo ""
echo "🎉 Setup complete!"
echo ""
echo "📍 Access points:"
echo "   Application (via Kong): http://localhost:8000"
echo "   Kong Admin API:         http://localhost:8001"
echo "   PostgreSQL:             localhost:5432"
echo ""
echo "🔧 Useful commands:"
echo "   View logs:              docker-compose logs -f"
echo "   Stop services:          docker-compose down"
echo "   Reset database:         docker-compose down -v && docker-compose up --build"
echo "   Connect to database:    docker-compose exec postgres psql -U audituser -d auditdb"
echo ""
echo "📖 For more information, see SETUP.md"