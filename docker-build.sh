#!/bin/bash

echo "========================================"
echo "   Docker Build Script"
echo "========================================"

echo ""
echo "Building Docker image with optimizations..."

# Set build arguments for optimization
export DOCKER_BUILDKIT=1
export BUILDKIT_PROGRESS=plain

# Build with increased memory and timeout
docker build \
  --build-arg NODE_OPTIONS="--max-old-space-size=4096" \
  --build-arg SKIP_ENV_VALIDATION=1 \
  --build-arg NEXT_TELEMETRY_DISABLED=1 \
  --memory=4g \
  --memory-swap=8g \
  -t nextjs-app \
  .

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Docker build completed successfully!"
    echo ""
    echo "To run the application:"
    echo "  docker-compose up -d"
    echo ""
    echo "To run just the built image:"
    echo "  docker run -p 3000:3000 nextjs-app"
else
    echo ""
    echo "❌ Docker build failed!"
    echo ""
    echo "Try these troubleshooting steps:"
    echo "1. Increase Docker memory allocation in Docker Desktop"
    echo "2. Clean Docker cache: docker system prune -a"
    echo "3. Build without cache: docker build --no-cache -t nextjs-app ."
    echo "4. Check Docker logs for specific errors"
fi