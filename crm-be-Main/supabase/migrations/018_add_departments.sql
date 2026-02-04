-- Multi-Department CRM Architecture
-- Migration: Add departments table and department_id to relevant tables

-- Create departments table
CREATE TABLE IF NOT EXISTS departments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL UNIQUE,
  slug VARCHAR(50) NOT NULL UNIQUE,
  description TEXT,
  icon VARCHAR(50),
  color VARCHAR(20),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Apply updated_at trigger to departments
DROP TRIGGER IF EXISTS update_departments_updated_at ON departments;
CREATE TRIGGER update_departments_updated_at 
  BEFORE UPDATE ON departments 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert Sales as the first department
INSERT INTO departments (name, slug, description, icon, color)
VALUES ('Sales', 'sales', 'Sales and Lead Management Department', 'Target', 'blue')
ON CONFLICT (slug) DO NOTHING;

-- Add department_id column to teams (nullable initially for migration)
ALTER TABLE teams 
  ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES departments(id);

-- Add department_id column to leads (nullable initially for migration)
ALTER TABLE leads 
  ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES departments(id);

-- Add department_id column to tasks (nullable initially for migration)
ALTER TABLE tasks 
  ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES departments(id);

-- Migrate existing data: Associate all existing records with Sales department
UPDATE teams 
SET department_id = (SELECT id FROM departments WHERE slug = 'sales')
WHERE department_id IS NULL;

UPDATE leads 
SET department_id = (SELECT id FROM departments WHERE slug = 'sales')
WHERE department_id IS NULL;

UPDATE tasks 
SET department_id = (SELECT id FROM departments WHERE slug = 'sales')
WHERE department_id IS NULL;

-- Create indexes for department_id columns
CREATE INDEX IF NOT EXISTS idx_teams_department ON teams(department_id);
CREATE INDEX IF NOT EXISTS idx_leads_department ON leads(department_id);
CREATE INDEX IF NOT EXISTS idx_tasks_department ON tasks(department_id);

-- Add comment
COMMENT ON TABLE departments IS 'Organizational departments for multi-department CRM';
