-- =====================================================
-- PERFORMANCE OPTIMIZATION INDEXES
-- Migration: 025_performance_indexes.sql
-- Run this SQL in Supabase SQL Editor
-- =====================================================

-- ===================
-- 1. COMPOSITE INDEXES FOR LEADS TABLE
-- These indexes optimize common query patterns
-- ===================

-- Index for filtering leads list (most common query)
-- Covers: is_deleted + department_id + status + created_at
-- Note: CONCURRENTLY removed to allow execution in transaction blocks
CREATE INDEX IF NOT EXISTS idx_leads_list_filter 
  ON leads(is_deleted, department_id, status, created_at DESC);

-- Index for assigned leads filtering (employee view)
CREATE INDEX IF NOT EXISTS idx_leads_assigned_filter 
  ON leads(is_deleted, assigned_to, status);

-- Partial index for active leads only (better performance)
CREATE INDEX IF NOT EXISTS idx_leads_active 
  ON leads(department_id, status, created_at DESC) 
  WHERE is_deleted = false;

-- Index for pipeline aggregation (status counts)
CREATE INDEX IF NOT EXISTS idx_leads_pipeline 
  ON leads(status) 
  WHERE is_deleted = false;

-- Index for won leads queries (revenue calculations)
CREATE INDEX IF NOT EXISTS idx_leads_won_month 
  ON leads(status, converted_at DESC) 
  WHERE status = 'won';

-- Index for source analytics
CREATE INDEX IF NOT EXISTS idx_leads_source_analytics 
  ON leads(source, created_at DESC) 
  WHERE is_deleted = false;

-- ===================
-- 2. COMPOSITE INDEXES FOR TASKS TABLE
-- ===================

-- Index for task list filtering
CREATE INDEX IF NOT EXISTS idx_tasks_list_filter 
  ON tasks(is_deleted, department_id, assigned_to, status);

-- Index for due date queries (overdue tasks)
CREATE INDEX IF NOT EXISTS idx_tasks_due 
  ON tasks(due_date, status) 
  WHERE is_deleted = false AND status NOT IN ('completed', 'cancelled');

-- Index for user's pending tasks
CREATE INDEX IF NOT EXISTS idx_tasks_user_pending 
  ON tasks(assigned_to, status, due_date) 
  WHERE is_deleted = false;

-- ===================
-- 3. INDEXES FOR DASHBOARD QUERIES
-- ===================

-- Index for attendance queries
CREATE INDEX IF NOT EXISTS idx_attendance_date_status 
  ON attendance(date, status, user_id);

-- Index for invoice stats
CREATE INDEX IF NOT EXISTS idx_invoices_status_dept 
  ON invoices(status, department_id);

-- Index for paid invoices (uses updated_at since paid_at doesn't exist)
CREATE INDEX IF NOT EXISTS idx_invoices_paid 
  ON invoices(updated_at DESC, department_id) 
  WHERE status = 'paid';

-- Index for expense stats
CREATE INDEX IF NOT EXISTS idx_expenses_status_dept 
  ON expenses(status, department_id);

-- ===================
-- 4. POSTGRESQL FUNCTION FOR LEAD PIPELINE AGGREGATION
-- This is more efficient than fetching all rows for counting
-- ===================

CREATE OR REPLACE FUNCTION get_lead_pipeline_stats(
  p_user_role TEXT DEFAULT 'admin',
  p_user_id UUID DEFAULT NULL,
  p_department_id UUID DEFAULT NULL
)
RETURNS TABLE(status TEXT, lead_count BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    l.status,
    COUNT(*)::BIGINT as lead_count
  FROM leads l
  WHERE l.is_deleted = false
    AND (
      p_user_role = 'admin' 
      OR (p_user_role = 'employee' AND l.assigned_to = p_user_id)
      OR (p_user_role = 'manager' AND (l.department_id = p_department_id OR l.department_id IS NULL))
    )
  GROUP BY l.status;
END;
$$ LANGUAGE plpgsql STABLE;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_lead_pipeline_stats TO authenticated;
GRANT EXECUTE ON FUNCTION get_lead_pipeline_stats TO service_role;

-- ===================
-- 5. FUNCTION FOR LEAD SOURCE STATS
-- ===================

CREATE OR REPLACE FUNCTION get_lead_source_stats(
  p_department_id UUID DEFAULT NULL
)
RETURNS TABLE(source TEXT, lead_count BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(l.source, 'Unknown') as source,
    COUNT(*)::BIGINT as lead_count
  FROM leads l
  WHERE l.is_deleted = false
    AND (p_department_id IS NULL OR l.department_id = p_department_id OR l.department_id IS NULL)
  GROUP BY COALESCE(l.source, 'Unknown');
END;
$$ LANGUAGE plpgsql STABLE;

GRANT EXECUTE ON FUNCTION get_lead_source_stats TO authenticated;
GRANT EXECUTE ON FUNCTION get_lead_source_stats TO service_role;

-- ===================
-- 6. FUNCTION FOR DASHBOARD QUICK COUNTS
-- Single query for multiple counts - much faster than separate queries
-- ===================

CREATE OR REPLACE FUNCTION get_dashboard_counts(
  p_department_id UUID DEFAULT NULL,
  p_start_of_month TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  result JSON;
  v_start_of_month TIMESTAMPTZ := COALESCE(p_start_of_month, date_trunc('month', NOW()));
BEGIN
  SELECT json_build_object(
    'total_leads', (
      SELECT COUNT(*) FROM leads 
      WHERE is_deleted = false 
        AND (p_department_id IS NULL OR department_id = p_department_id OR department_id IS NULL)
    ),
    'new_leads_month', (
      SELECT COUNT(*) FROM leads 
      WHERE is_deleted = false 
        AND created_at >= v_start_of_month
        AND (p_department_id IS NULL OR department_id = p_department_id OR department_id IS NULL)
    ),
    'won_leads_month', (
      SELECT COUNT(*) FROM leads 
      WHERE status = 'won' 
        AND converted_at >= v_start_of_month
        AND (p_department_id IS NULL OR department_id = p_department_id OR department_id IS NULL)
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
        AND due_date < NOW()
        AND status NOT IN ('completed', 'cancelled')
        AND (p_department_id IS NULL OR department_id = p_department_id)
    )
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql STABLE;

GRANT EXECUTE ON FUNCTION get_dashboard_counts TO authenticated;
GRANT EXECUTE ON FUNCTION get_dashboard_counts TO service_role;

-- ===================
-- 7. ANALYZE TABLES FOR QUERY PLANNER
-- Run this after creating indexes
-- ===================

ANALYZE leads;
ANALYZE tasks;
ANALYZE attendance;
ANALYZE invoices;
ANALYZE expenses;

-- ===================
-- MIGRATION COMPLETE
-- ===================
-- 
-- Indexes created:
-- 1. idx_leads_list_filter - For leads list page filtering
-- 2. idx_leads_assigned_filter - For employee's assigned leads
-- 3. idx_leads_active - Partial index for active leads
-- 4. idx_leads_pipeline - For status aggregation
-- 5. idx_leads_won_month - For revenue calculations
-- 6. idx_leads_source_analytics - For source breakdown
-- 7. idx_tasks_list_filter - For tasks list filtering
-- 8. idx_tasks_due - For overdue task queries
-- 9. idx_tasks_user_pending - For user's pending tasks
-- 10. idx_attendance_date_status - For attendance queries
-- 11. idx_invoices_status_dept - For invoice stats
-- 12. idx_invoices_paid - For paid invoice queries
-- 13. idx_expenses_status_dept - For expense stats
--
-- Functions created:
-- 1. get_lead_pipeline_stats() - Efficient lead status counts
-- 2. get_lead_source_stats() - Efficient source breakdown
-- 3. get_dashboard_counts() - Single query for dashboard counts
