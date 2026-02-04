-- =====================================================
-- FULL-TEXT SEARCH OPTIMIZATION
-- Migration: 026_fulltext_search.sql
-- Run this SQL in Supabase SQL Editor
-- =====================================================

-- ===================
-- 1. ADD SEARCH VECTOR COLUMN TO LEADS
-- ===================

-- Add tsvector column for full-text search
ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Create GIN index for fast full-text search
-- Note: CONCURRENTLY removed to allow execution in transaction blocks
CREATE INDEX IF NOT EXISTS idx_leads_search_vector 
ON leads USING GIN(search_vector);

-- ===================
-- 2. FUNCTION TO UPDATE SEARCH VECTOR
-- ===================

CREATE OR REPLACE FUNCTION leads_search_vector_update()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', COALESCE(NEW.lead_name, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.business_name, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.email, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.phone, '')), 'C') ||
    setweight(to_tsvector('english', COALESCE(NEW.country, '')), 'D') ||
    setweight(to_tsvector('english', COALESCE(NEW.source::TEXT, '')), 'D');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update search vector
DROP TRIGGER IF EXISTS trigger_leads_search_update ON leads;
CREATE TRIGGER trigger_leads_search_update
BEFORE INSERT OR UPDATE OF lead_name, business_name, email, phone, country, source
ON leads
FOR EACH ROW
EXECUTE FUNCTION leads_search_vector_update();

-- ===================
-- 3. POPULATE EXISTING RECORDS
-- ===================

-- Update all existing leads with search vectors
UPDATE leads SET 
  search_vector = 
    setweight(to_tsvector('english', COALESCE(lead_name, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(business_name, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(email, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(phone, '')), 'C') ||
    setweight(to_tsvector('english', COALESCE(country, '')), 'D') ||
    setweight(to_tsvector('english', COALESCE(source::TEXT, '')), 'D');

-- ===================
-- 4. ADD SEARCH VECTOR TO TASKS
-- ===================

ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS search_vector tsvector;

CREATE INDEX IF NOT EXISTS idx_tasks_search_vector 
ON tasks USING GIN(search_vector);

CREATE OR REPLACE FUNCTION tasks_search_vector_update()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_tasks_search_update ON tasks;
CREATE TRIGGER trigger_tasks_search_update
BEFORE INSERT OR UPDATE OF title, description
ON tasks
FOR EACH ROW
EXECUTE FUNCTION tasks_search_vector_update();

-- Update existing tasks
UPDATE tasks SET 
  search_vector = 
    setweight(to_tsvector('english', COALESCE(title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(description, '')), 'B');

-- ===================
-- 5. ADD SEARCH VECTOR TO USERS
-- ===================

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS search_vector tsvector;

CREATE INDEX IF NOT EXISTS idx_users_search_vector 
ON users USING GIN(search_vector);

CREATE OR REPLACE FUNCTION users_search_vector_update()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', COALESCE(NEW.full_name, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.email, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.job_title, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_users_search_update ON users;
CREATE TRIGGER trigger_users_search_update
BEFORE INSERT OR UPDATE OF full_name, email, job_title
ON users
FOR EACH ROW
EXECUTE FUNCTION users_search_vector_update();

-- Update existing users
UPDATE users SET 
  search_vector = 
    setweight(to_tsvector('english', COALESCE(full_name, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(email, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(job_title, '')), 'C');

-- ===================
-- 6. GLOBAL SEARCH FUNCTION
-- Searches across all entities in parallel
-- ===================

CREATE OR REPLACE FUNCTION global_search(
  p_query TEXT,
  p_user_role TEXT DEFAULT 'admin',
  p_user_id UUID DEFAULT NULL,
  p_department_id UUID DEFAULT NULL,
  p_limit INT DEFAULT 5
)
RETURNS TABLE(
  entity_type TEXT,
  entity_id UUID,
  title TEXT,
  subtitle TEXT,
  url TEXT,
  rank REAL
) AS $$
DECLARE
  v_query tsquery := websearch_to_tsquery('english', p_query);
BEGIN
  RETURN QUERY
  -- Search leads
  SELECT 
    'lead'::TEXT as entity_type,
    l.id as entity_id,
    l.lead_name as title,
    COALESCE(l.business_name, l.email) as subtitle,
    '/sales/leads/' || l.id::TEXT as url,
    ts_rank(l.search_vector, v_query) as rank
  FROM leads l
  WHERE l.is_deleted = false
    AND l.search_vector @@ v_query
    AND (
      p_user_role = 'admin' 
      OR (p_user_role = 'employee' AND l.assigned_to = p_user_id)
      OR (p_user_role = 'manager' AND (l.department_id = p_department_id OR l.department_id IS NULL))
    )
  
  UNION ALL
  
  -- Search tasks
  SELECT 
    'task'::TEXT as entity_type,
    t.id as entity_id,
    t.title as title,
    t.description as subtitle,
    '/sales/tasks' as url,
    ts_rank(t.search_vector, v_query) as rank
  FROM tasks t
  WHERE t.is_deleted = false
    AND t.search_vector @@ v_query
    AND (
      p_user_role = 'admin' 
      OR (p_user_role = 'employee' AND t.assigned_to = p_user_id)
      OR (p_user_role = 'manager' AND (t.department_id = p_department_id OR t.department_id IS NULL))
    )
  
  UNION ALL
  
  -- Search users (admin/manager only)
  SELECT 
    'user'::TEXT as entity_type,
    u.id as entity_id,
    u.full_name as title,
    u.email as subtitle,
    '/global/users' as url,
    ts_rank(u.search_vector, v_query) as rank
  FROM users u
  WHERE u.search_vector @@ v_query
    AND p_user_role IN ('admin', 'manager')
  
  ORDER BY rank DESC
  LIMIT p_limit * 3; -- Get more results for variety
END;
$$ LANGUAGE plpgsql STABLE;

GRANT EXECUTE ON FUNCTION global_search TO authenticated;
GRANT EXECUTE ON FUNCTION global_search TO service_role;

-- ===================
-- 7. ANALYZE TABLES
-- ===================

ANALYZE leads;
ANALYZE tasks;
ANALYZE users;

-- ===================
-- MIGRATION COMPLETE
-- ===================
-- 
-- Changes made:
-- 1. Added search_vector tsvector column to leads, tasks, users
-- 2. Created GIN indexes for fast full-text search
-- 3. Created triggers to auto-update search vectors
-- 4. Created global_search() function for unified search
--
-- Usage in application:
-- SELECT * FROM global_search('john doe', 'admin', NULL, NULL, 10);
-- 
-- Or in Supabase JS:
-- const { data } = await supabase.rpc('global_search', { 
--   p_query: 'john doe',
--   p_user_role: 'admin',
--   p_limit: 10
-- });
