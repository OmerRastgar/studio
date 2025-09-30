-- Add password field to users table
ALTER TABLE "users" ADD COLUMN "password" TEXT NOT NULL DEFAULT 'temp_password';