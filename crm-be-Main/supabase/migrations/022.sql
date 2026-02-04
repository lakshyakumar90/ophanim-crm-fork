-- Run this in Supabase SQL Editor
ALTER TABLE users ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES departments(id) ON DELETE SET NULL;
UPDATE users u SET department_id = t.department_id
FROM teams t WHERE u.team_id = t.id AND u.department_id IS NULL AND t.department_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_department ON users(department_id);