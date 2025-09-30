#!/bin/bash

echo "🧪 Testing Docker build process..."

# Clean up any existing containers
docker-compose down -v 2>/dev/null || true

# Build just the app service to test
echo "📦 Building application..."
docker-compose build app

if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
    echo "🚀 Starting services..."
    docker-compose up -d
    
    # Wait for services to start
    sleep 10
    
    # Test health endpoint
    echo "🏥 Testing health endpoint..."
    curl -f http://localhost:8000/api/health || echo "Health check failed"
    
    echo "📊 Service status:"
    docker-compose ps
else
    echo "❌ Build failed!"
    exit 1
fi