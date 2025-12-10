@echo off
REM Development setup script for Windows

echo 🚀 Setting up Audit Application Development Environment

REM Check if Docker is running
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker is not running. Please start Docker and try again.
    exit /b 1
)

REM Check if docker-compose is available
docker-compose --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ docker-compose is not installed. Please install Docker Compose.
    exit /b 1
)

REM Create .env file if it doesn't exist
if not exist .env (
    echo 📝 Creating .env file from template...
    copy .env.example .env
    echo ✅ .env file created. You can modify it if needed.
)

REM Start PostgreSQL first
echo 🐘 Starting PostgreSQL database...
docker-compose up -d postgres

REM Wait for PostgreSQL to be ready
echo ⏳ Waiting for PostgreSQL to be ready...
timeout /t 10 /nobreak >nul

:wait_for_postgres
docker-compose exec postgres pg_isready -U audituser -d auditdb >nul 2>&1
if %errorlevel% neq 0 (
    echo ⏳ Still waiting for PostgreSQL...
    timeout /t 5 /nobreak >nul
    goto wait_for_postgres
)

echo ✅ PostgreSQL is ready!

REM Build and start all services
echo 🏗️  Building and starting all services...
docker-compose up --build -d

REM Wait a moment for services to start
timeout /t 5 /nobreak >nul

REM Check service status
echo 📊 Service Status:
docker-compose ps

echo.
echo 🎉 Setup complete!
echo.
echo 📍 Access points:
echo    Application (via Kong): http://localhost:8000
echo    Kong Admin API:         http://localhost:8001
echo    PostgreSQL:             localhost:5432
echo.
echo 🔧 Useful commands:
echo    View logs:              docker-compose logs -f
echo    Stop services:          docker-compose down
echo    Reset database:         docker-compose down -v ^&^& docker-compose up --build
echo    Connect to database:    docker-compose exec postgres psql -U audituser -d auditdb
echo.
echo 📖 For more information, see SETUP.md

pause