@echo off
echo 🗃️  Initializing database...

REM Wait for PostgreSQL to be ready
echo ⏳ Waiting for PostgreSQL...
:wait_for_postgres
docker-compose exec postgres pg_isready -U audituser -d auditdb >nul 2>&1
if %errorlevel% neq 0 (
    echo ⏳ Still waiting for PostgreSQL...
    timeout /t 2 /nobreak >nul
    goto wait_for_postgres
)

echo ✅ PostgreSQL is ready!

REM Run Prisma migrations
echo 🔄 Running database migrations...
docker-compose exec app npx prisma migrate deploy

REM Seed the database
echo 🌱 Seeding database...
docker-compose exec app npm run db:seed

echo ✅ Database initialization complete!