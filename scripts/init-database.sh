#!/bin/bash

echo "🗃️  Initializing database..."

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL..."
until docker-compose exec postgres pg_isready -U audituser -d auditdb > /dev/null 2>&1; do
    echo "⏳ Still waiting for PostgreSQL..."
    sleep 2
done

echo "✅ PostgreSQL is ready!"

# Run Prisma migrations
echo "🔄 Running database migrations..."
docker-compose exec app npx prisma migrate deploy

# Seed the database
echo "🌱 Seeding database..."
docker-compose exec app npm run db:seed

echo "✅ Database initialization complete!"