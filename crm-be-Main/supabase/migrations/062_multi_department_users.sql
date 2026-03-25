-- ============================================================
-- Migration 062: Multi-Department Users Support
-- Allows users to have multiple departments and job titles
-- ============================================================

-- ================================================================
-- 1. CREATE user_departments JUNCTION TABLE
-- ================================================================
CREATE TABLE IF NOT EXISTS user_departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  job_title VARCHAR(255),                         -- Department-specific job title
  shift_type VARCHAR(50),                         -- Department-specific shift
  is_primary BOOLEAN DEFAULT false,               -- Mark primary department
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Prevent duplicate user-department pairs
  UNIQUE(user_id, department_id)
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_user_departments_user_id ON user_departments(user_id);
CREATE INDEX IF NOT EXISTS idx_user_departments_department_id ON user_departments(department_id);
CREATE INDEX IF NOT EXISTS idx_user_departments_is_primary ON user_departments(is_primary) WHERE is_primary = true;

-- Add trigger for updated_at
DROP TRIGGER IF EXISTS update_user_departments_updated_at ON user_departments;
CREATE TRIGGER update_user_departments_updated_at 
  BEFORE UPDATE ON user_departments 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- ================================================================
-- 2. MIGRATE EXISTING DATA
-- ================================================================
-- Migrate users' primary department_id to user_departments junction table
-- Keeping department_id column for backward compatibility
INSERT INTO user_departments (user_id, department_id, job_title, shift_type, is_primary)
SELECT 
  u.id,
  u.department_id,
  u.job_title,
  u.shift_type,
  true
FROM users u
WHERE u.department_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM user_departments ud 
    WHERE ud.user_id = u.id AND ud.department_id = u.department_id
  )
ON CONFLICT (user_id, department_id) DO NOTHING;

-- ================================================================
-- 3. ADD HELPER FUNCTIONS
-- ================================================================

-- Get all department IDs for a user
CREATE OR REPLACE FUNCTION get_user_department_ids(p_user_id UUID)
RETURNS UUID[] AS $$
  SELECT ARRAY_AGG(department_id ORDER BY 
    is_primary DESC, 
    assigned_at ASC
  )
  FROM user_departments
  WHERE user_id = p_user_id;
$$ LANGUAGE SQL STABLE;

-- Get primary department for a user
CREATE OR REPLACE FUNCTION get_user_primary_department(p_user_id UUID)
RETURNS UUID AS $$
  SELECT department_id
  FROM user_departments
  WHERE user_id = p_user_id
    AND is_primary = true
  LIMIT 1;
$$ LANGUAGE SQL STABLE;

-- ================================================================
-- 4. COMMENTS
-- ================================================================
COMMENT ON TABLE user_departments IS 'Junction table for multi-department user assignments';
COMMENT ON COLUMN user_departments.is_primary IS 'True if this is the user''s primary department';
COMMENT ON COLUMN user_departments.job_title IS 'Department-specific job title (overrides users.job_title if set)';
COMMENT ON COLUMN user_departments.shift_type IS 'Department-specific shift (overrides users.shift_type if set)';

-- ================================================================
-- 5. PERMISSIONS
-- ================================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON user_departments TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_department_ids TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_primary_department TO authenticated;
