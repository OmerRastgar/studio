#!/bin/sh

echo "Waiting for PostgreSQL to be ready..."
until nc -z postgres 5432; do
  echo "Postgres is unavailable - sleeping"
  sleep 1
done

echo "PostgreSQL is up - executing command"

# Generate Prisma Client
echo "Generating Prisma Client..."
npx prisma generate

# Push schema to database
echo "Pushing schema to database..."
npx prisma db push

# Seed database (optional, check if data exists or just run it idempotently)
echo "Seeding database..."
npx prisma db seed

# Start worker
echo "Starting worker..."
npx tsx src/worker/index.ts &

# Start the application
echo "Starting application..."
npm run dev
