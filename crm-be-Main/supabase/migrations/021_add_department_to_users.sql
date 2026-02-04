-- Migration: Add department_id column to users table
-- This enables storing department association directly on users,
-- independent of team membership

-- Add department_id column to users table
ALTER TABLE users 
  ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES departments(id) ON DELETE SET NULL;

-- Migrate existing users: copy department_id from their team if they have one
UPDATE users u
SET department_id = t.department_id
FROM teams t
WHERE u.team_id = t.id 
  AND u.department_id IS NULL 
  AND t.department_id IS NOT NULL;

-- Create index for efficient department-based queries
CREATE INDEX IF NOT EXISTS idx_users_department ON users(department_id);

-- Add comment
COMMENT ON COLUMN users.department_id IS 'Direct department association for department-based roles';
