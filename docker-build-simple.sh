#!/bin/bash

echo "========================================"
echo "   Simple Docker Build Script"
echo "========================================"

echo ""
echo "Building Docker image with simple Dockerfile..."

# Set build arguments for optimization
export DOCKER_BUILDKIT=1

# Build with the simple Dockerfile
docker build \
  -f Dockerfile.simple \
  --memory=4g \
  --memory-swap=8g \
  -t nextjs-app \
  .

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Docker build completed successfully!"
    echo ""
    echo "To run the application:"
    echo "  docker run -p 3000:3000 --env-file .env nextjs-app"
    echo ""
    echo "Or update docker-compose.yml to use the built image:"
    echo "  Replace 'build: ...' with 'image: nextjs-app'"
else
    echo ""
    echo "❌ Docker build failed!"
    echo ""
    echo "Check the error messages above for details."
fi