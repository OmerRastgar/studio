@echo off
echo 🧪 Testing Docker build process...

REM Clean up any existing containers
docker-compose down -v >nul 2>&1

REM Build just the app service to test
echo 📦 Building application...
docker-compose build app

if %errorlevel% equ 0 (
    echo ✅ Build successful!
    echo 🚀 Starting services...
    docker-compose up -d
    
    REM Wait for services to start
    timeout /t 10 /nobreak >nul
    
    REM Test health endpoint
    echo 🏥 Testing health endpoint...
    curl -f http://localhost:8000/api/health
    
    echo 📊 Service status:
    docker-compose ps
) else (
    echo ❌ Build failed!
    exit /b 1
)

pause