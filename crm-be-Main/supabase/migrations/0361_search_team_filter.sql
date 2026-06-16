-- =====================================================
-- UPDATE GLOBAL SEARCH FOR TEAM-BASED MANAGER FILTERING
-- Migration: 036_search_team_filter.sql
-- =====================================================

-- Drop existing function to recreate with new parameter
DROP FUNCTION IF EXISTS global_search;

-- Recreate global_search with team_id parameter for manager filtering
CREATE OR REPLACE FUNCTION global_search(
  p_query TEXT,
  p_user_role TEXT DEFAULT 'admin',
  p_user_id UUID DEFAULT NULL,
  p_department_id UUID DEFAULT NULL,
  p_team_id UUID DEFAULT NULL,  -- NEW: Team ID for manager filtering
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
      OR (p_user_role = 'manager' AND l.assigned_to IN (
        SELECT u.id FROM users u 
        WHERE (u.team_id = p_team_id OR u.id = p_user_id) 
        AND u.is_active = true
      ))
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
      OR (p_user_role = 'manager' AND t.assigned_to IN (
        SELECT u.id FROM users u 
        WHERE (u.team_id = p_team_id OR u.id = p_user_id) 
        AND u.is_active = true
      ))
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

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- 
-- Changes made:
-- 1. Added p_team_id parameter to global_search function
-- 2. Updated lead filtering: managers see leads assigned to team members
-- 3. Updated task filtering: managers see tasks assigned to team members
--
-- Usage:
-- SELECT * FROM global_search('john', 'manager', user_id, dept_id, team_id, 10);
