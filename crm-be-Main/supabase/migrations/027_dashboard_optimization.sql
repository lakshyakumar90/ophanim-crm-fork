-- =====================================================
-- DASHBOARD OPTIMIZATION FUNCTIONS
-- Migration: 027_dashboard_optimization.sql
-- Run this SQL in Supabase SQL Editor
-- =====================================================

-- ===================
-- 1. FUNCTION FOR ADMIN DASHBOARD QUICK STATS
-- Single function call replaces multiple queries
-- ===================

CREATE OR REPLACE FUNCTION get_admin_dashboard_stats(
  p_department_id UUID DEFAULT NULL,
  p_start_of_month TIMESTAMPTZ DEFAULT date_trunc('month', NOW()),
  p_today DATE DEFAULT CURRENT_DATE,
  p_overdue_timestamp TIMESTAMPTZ DEFAULT NOW()
)
RETURNS JSON AS $$
DECLARE
  v_team_ids UUID[];
  v_user_ids UUID[];
  result JSON;
BEGIN
  -- Pre-fetch team and user IDs if department filter is active
  IF p_department_id IS NOT NULL THEN
    SELECT ARRAY_AGG(id) INTO v_team_ids
    FROM teams WHERE department_id = p_department_id;
    
    IF v_team_ids IS NOT NULL THEN
      SELECT ARRAY_AGG(id) INTO v_user_ids
      FROM users WHERE team_id = ANY(v_team_ids);
    END IF;
  END IF;

  SELECT json_build_object(
    'total_users', (
      SELECT COUNT(*) FROM users
      WHERE (v_team_ids IS NULL OR team_id = ANY(v_team_ids))
    ),
    'active_users', (
      SELECT COUNT(*) FROM users
      WHERE is_active = true
      AND (v_team_ids IS NULL OR team_id = ANY(v_team_ids))
    ),
    'total_leads', (
      SELECT COUNT(*) FROM leads
      WHERE is_deleted = false
      AND (p_department_id IS NULL OR department_id = p_department_id OR department_id IS NULL)
    ),
    'new_leads_this_month', (
      SELECT COUNT(*) FROM leads
      WHERE is_deleted = false
      AND created_at >= p_start_of_month
      AND (p_department_id IS NULL OR department_id = p_department_id OR department_id IS NULL)
    ),
    'won_leads_this_month', (
      SELECT COUNT(*) FROM leads
      WHERE status = 'won'
      AND converted_at >= p_start_of_month
      AND (p_department_id IS NULL OR department_id = p_department_id OR department_id IS NULL)
    ),
    'monthly_revenue', (
      SELECT COALESCE(SUM(lead_value), 0) FROM leads
      WHERE status = 'won'
      AND converted_at >= p_start_of_month
      AND (p_department_id IS NULL OR department_id = p_department_id)
    ),
    'total_tasks', (
      SELECT COUNT(*) FROM tasks
      WHERE is_deleted = false
      AND (p_department_id IS NULL OR department_id = p_department_id OR department_id IS NULL)
    ),
    'pending_tasks', (
      SELECT COUNT(*) FROM tasks
      WHERE is_deleted = false
      AND status IN ('todo', 'in_progress')
      AND (p_department_id IS NULL OR department_id = p_department_id)
    ),
    'overdue_tasks', (
      SELECT COUNT(*) FROM tasks
      WHERE is_deleted = false
      AND due_date < p_overdue_timestamp
      AND status NOT IN ('completed', 'cancelled')
      AND (p_department_id IS NULL OR department_id = p_department_id)
    ),
    'present_today', (
      SELECT COUNT(*) FROM attendance
      WHERE date = p_today
      AND status IN ('present', 'late')
      AND (v_user_ids IS NULL OR user_id = ANY(v_user_ids))
    )
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql STABLE;

GRANT EXECUTE ON FUNCTION get_admin_dashboard_stats TO authenticated;
GRANT EXECUTE ON FUNCTION get_admin_dashboard_stats TO service_role;

-- ===================
-- 2. FUNCTION FOR LEAD PIPELINE AND SOURCE AGGREGATION
-- Returns pre-aggregated counts instead of raw data
-- ===================

CREATE OR REPLACE FUNCTION get_lead_aggregations(
  p_department_id UUID DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'pipeline', (
      SELECT json_object_agg(status, cnt)
      FROM (
        SELECT status, COUNT(*)::INT as cnt
        FROM leads
        WHERE is_deleted = false
        AND (p_department_id IS NULL OR department_id = p_department_id OR department_id IS NULL)
        GROUP BY status
      ) s
    ),
    'sources', (
      SELECT json_object_agg(source, cnt)
      FROM (
        SELECT COALESCE(source, 'Unknown') as source, COUNT(*)::INT as cnt
        FROM leads
        WHERE is_deleted = false
        AND (p_department_id IS NULL OR department_id = p_department_id OR department_id IS NULL)
        GROUP BY COALESCE(source, 'Unknown')
      ) s
    )
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql STABLE;

GRANT EXECUTE ON FUNCTION get_lead_aggregations TO authenticated;
GRANT EXECUTE ON FUNCTION get_lead_aggregations TO service_role;

-- ===================
-- 3. FUNCTION FOR TEAM MEMBER COUNTS
-- Batch fetch all team member counts in one call
-- ===================

CREATE OR REPLACE FUNCTION get_team_member_counts(
  p_team_ids UUID[]
)
RETURNS TABLE(team_id UUID, member_count BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT u.team_id, COUNT(*)::BIGINT as member_count
  FROM users u
  WHERE u.team_id = ANY(p_team_ids)
  GROUP BY u.team_id;
END;
$$ LANGUAGE plpgsql STABLE;

GRANT EXECUTE ON FUNCTION get_team_member_counts TO authenticated;
GRANT EXECUTE ON FUNCTION get_team_member_counts TO service_role;

-- ===================
-- 4. FUNCTION FOR DEPARTMENT PERFORMANCE
-- Single query for all departments instead of N+1
-- ===================

CREATE OR REPLACE FUNCTION get_all_department_performance()
RETURNS TABLE(
  department_id UUID,
  department_name TEXT,
  leads_count BIGINT,
  tasks_completed BIGINT,
  total_revenue NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH dept_users AS (
    SELECT u.id as user_id, t.department_id
    FROM users u
    JOIN teams t ON u.team_id = t.id
    WHERE t.department_id IS NOT NULL
  )
  SELECT 
    d.id as department_id,
    d.name as department_name,
    (SELECT COUNT(*) FROM leads l WHERE l.department_id = d.id AND l.is_deleted = false) as leads_count,
    (SELECT COUNT(*) FROM tasks tk 
     JOIN dept_users du ON tk.assigned_to = du.user_id AND du.department_id = d.id
     WHERE tk.status = 'completed') as tasks_completed,
    (SELECT COALESCE(SUM(i.total_amount), 0) FROM invoices i 
     WHERE i.department_id = d.id AND i.status = 'paid') as total_revenue
  FROM departments d;
END;
$$ LANGUAGE plpgsql STABLE;

GRANT EXECUTE ON FUNCTION get_all_department_performance TO authenticated;
GRANT EXECUTE ON FUNCTION get_all_department_performance TO service_role;

-- ===================
-- 5. FUNCTION FOR TOP PERFORMERS
-- Single query instead of 2*N queries
-- ===================

CREATE OR REPLACE FUNCTION get_top_performers(
  p_start_of_month TIMESTAMPTZ DEFAULT date_trunc('month', NOW()),
  p_limit INT DEFAULT 5
)
RETURNS TABLE(
  user_id UUID,
  user_name TEXT,
  avatar_url TEXT,
  user_role TEXT,
  leads_won BIGINT,
  tasks_completed BIGINT,
  score BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH user_stats AS (
    SELECT 
      u.id,
      u.full_name,
      u.avatar_url,
      u.role,
      (SELECT COUNT(*) FROM leads l 
       WHERE l.assigned_to = u.id AND l.status = 'won' 
       AND l.converted_at >= p_start_of_month) as leads_won,
      (SELECT COUNT(*) FROM tasks t 
       WHERE t.assigned_to = u.id AND t.status = 'completed' 
       AND t.completed_at >= p_start_of_month) as tasks_completed
    FROM users u
    WHERE u.is_active = true AND u.role != 'admin'
  )
  SELECT 
    id,
    full_name,
    avatar_url,
    role,
    leads_won,
    tasks_completed,
    (leads_won * 10 + tasks_completed * 2)::BIGINT as score
  FROM user_stats
  WHERE leads_won > 0 OR tasks_completed > 0
  ORDER BY score DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

GRANT EXECUTE ON FUNCTION get_top_performers TO authenticated;
GRANT EXECUTE ON FUNCTION get_top_performers TO service_role;

-- ===================
-- 6. INDEX FOR ATTENDANCE DATE LOOKUPS
-- Speeds up today's attendance queries
-- ===================

CREATE INDEX IF NOT EXISTS idx_attendance_date_user 
  ON attendance(date, user_id, status);

-- ===================
-- 7. INDEX FOR INVOICE STATS
-- Speeds up revenue calculations
-- ===================

CREATE INDEX IF NOT EXISTS idx_invoices_paid_dept_amount 
  ON invoices(department_id, total_amount) 
  WHERE status = 'paid';

-- ===================
-- 8. COMPOSITE INDEX FOR TASKS COMPLETION QUERIES
-- ===================

CREATE INDEX IF NOT EXISTS idx_tasks_completed_user 
  ON tasks(assigned_to, completed_at DESC) 
  WHERE status = 'completed' AND is_deleted = false;
