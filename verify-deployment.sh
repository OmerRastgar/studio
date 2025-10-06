#!/bin/bash

echo "========================================"
echo "   Deployment Verification Script"
echo "========================================"

echo ""
echo "1. Checking Docker installation..."
if command -v docker &> /dev/null; then
    echo "✅ Docker is installed: $(docker --version)"
else
    echo "❌ Docker is not installed"
    exit 1
fi

if command -v docker-compose &> /dev/null; then
    echo "✅ Docker Compose is installed: $(docker-compose --version)"
else
    echo "❌ Docker Compose is not installed"
    exit 1
fi

echo ""
echo "2. Checking Docker daemon..."
if docker info &> /dev/null; then
    echo "✅ Docker daemon is running"
else
    echo "❌ Docker daemon is not running"
    echo "Try: sudo systemctl start docker"
    exit 1
fi

echo ""
echo "3. Checking required ports..."
PORTS=(5432 8000 8001 3001 3100 24224)
for port in "${PORTS[@]}"; do
    if netstat -tuln 2>/dev/null | grep -q ":$port "; then
        echo "⚠️  Port $port is already in use"
    else
        echo "✅ Port $port is available"
    fi
done

echo ""
echo "4. Checking system resources..."
TOTAL_MEM=$(free -m | awk 'NR==2{printf "%.0f", $2}')
AVAILABLE_MEM=$(free -m | awk 'NR==2{printf "%.0f", $7}')

echo "Total Memory: ${TOTAL_MEM}MB"
echo "Available Memory: ${AVAILABLE_MEM}MB"

if [ "$AVAILABLE_MEM" -lt 2048 ]; then
    echo "⚠️  Less than 2GB available memory. Docker build might be slow."
else
    echo "✅ Sufficient memory available"
fi

echo ""
echo "5. Checking disk space..."
AVAILABLE_DISK=$(df -h . | awk 'NR==2 {print $4}')
echo "Available disk space: $AVAILABLE_DISK"

echo ""
echo "6. Checking required files..."
REQUIRED_FILES=(
    "docker-compose.yml"
    "Dockerfile.simple"
    "package.json"
    ".env"
    "prisma/schema.prisma"
    "src/app"
)

for file in "${REQUIRED_FILES[@]}"; do
    if [ -e "$file" ]; then
        echo "✅ $file exists"
    else
        echo "❌ $file is missing"
    fi
done

echo ""
echo "7. Testing Docker functionality..."
if docker run --rm hello-world &> /dev/null; then
    echo "✅ Docker is working correctly"
else
    echo "❌ Docker test failed"
fi

echo ""
echo "========================================"
echo "   Verification Complete"
echo "========================================"

echo ""
echo "If all checks passed, you can proceed with:"
echo "  ./dev-setup.sh"
echo ""
echo "If there are issues, refer to DEPLOYMENT.md for troubleshooting."