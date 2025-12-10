-- Add ProjectStatus enum and status column to projects table
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ProjectStatus') THEN
        CREATE TYPE "ProjectStatus" AS ENUM ('pending', 'approved', 'rejected', 'completed');
    END IF;
END $$;

ALTER TABLE projects ADD COLUMN IF NOT EXISTS status "ProjectStatus" DEFAULT 'approved';
