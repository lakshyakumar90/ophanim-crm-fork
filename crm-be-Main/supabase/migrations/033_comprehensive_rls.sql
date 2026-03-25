-- =====================================================
-- Migration 033: Comprehensive RLS for Frontend Direct Reads
-- =====================================================
-- This migration replaces the overly-permissive "Service role full access"
-- policies with proper role-scoped SELECT policies so the frontend can
-- safely query Supabase directly using the anon key + authenticated session.
--
-- The backend uses the service_role key which bypasses RLS entirely,
-- so these policies only affect frontend Supabase client calls.
-- =====================================================

-- ===================
-- 1. HELPER FUNCTIONS (SECURITY DEFINER to bypass RLS)
-- ===================

-- Get current user's role
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS user_role AS $$
  SELECT role FROM public.users WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Get current user's department_id
CREATE OR REPLACE FUNCTION public.get_my_department_id()
RETURNS UUID AS $$
  SELECT department_id FROM public.users WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Get current user's team_id
CREATE OR REPLACE FUNCTION public.get_my_team_id()
RETURNS UUID AS $$
  SELECT team_id FROM public.users WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Check if current user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Check if current user is manager or admin
CREATE OR REPLACE FUNCTION public.is_manager_or_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'manager'))
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Check if current user is in HR department
CREATE OR REPLACE FUNCTION public.is_hr()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users u
    JOIN public.departments d ON u.department_id = d.id
    WHERE u.id = auth.uid() AND d.slug = 'hr'
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ===================
-- 2. DROP OLD PERMISSIVE POLICIES
-- ===================
-- Drop the "Service role full access" (FOR ALL USING (true)) from migration 002.
-- The backend service role bypasses RLS anyway, so these were only making
-- tables fully open to anon/authenticated users.

DROP POLICY IF EXISTS "Service role full access" ON teams;
DROP POLICY IF EXISTS "Service role full access" ON users;
DROP POLICY IF EXISTS "Service role full access" ON refresh_tokens;
DROP POLICY IF EXISTS "Service role full access" ON leads;
DROP POLICY IF EXISTS "Service role full access" ON lead_activities;
DROP POLICY IF EXISTS "Service role full access" ON lead_assignments_history;
DROP POLICY IF EXISTS "Service role full access" ON tasks;
-- DROP POLICY IF EXISTS "Service role full access" ON task_comments;
DROP POLICY IF EXISTS "Service role full access" ON attendance;
DROP POLICY IF EXISTS "Service role full access" ON attendance_rules;
DROP POLICY IF EXISTS "Service role full access" ON holidays;
DROP POLICY IF EXISTS "Service role full access" ON notifications;
-- DROP POLICY IF EXISTS "Service role full access" ON notification_preferences;
-- DROP POLICY IF EXISTS "Service role full access" ON activity_logs;
-- DROP POLICY IF EXISTS "Service role full access" ON csv_import_jobs;
-- DROP POLICY IF EXISTS "Service role full access" ON csv_export_jobs;
DROP POLICY IF EXISTS "Service role full access" ON settings;
DROP POLICY IF EXISTS "Service role full access" ON email_templates;
-- DROP POLICY IF EXISTS "Service role full access" ON saved_filters;

-- Also drop the duplicate policies from migration 032 (shift system)
-- since we'll recreate comprehensive ones below
DROP POLICY IF EXISTS "Allow authenticated users to read their own shift_type" ON users;
DROP POLICY IF EXISTS "Allow admins to manage all shift_types" ON users;

-- Drop old project policies
DROP POLICY IF EXISTS "Allow all access for service role" ON projects;
DROP POLICY IF EXISTS "Allow all access for service role" ON project_members;

-- ===================
-- 3. ENSURE RLS IS ENABLED ON ALL TABLES
-- ===================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_assignments_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE holidays ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE refresh_tokens ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE csv_import_jobs ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE csv_export_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE saved_filters ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_email_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_send_log ENABLE ROW LEVEL SECURITY;

-- ===================
-- 4. SELECT POLICIES FOR EACH TABLE
-- ===================

-- ---- USERS ----
-- Authenticated users can read active users (needed for dropdowns, assignments, etc.)
-- Inactive/deactivated users are hidden from frontend queries.
-- Admins can also see inactive users for management purposes.
DROP POLICY IF EXISTS "Authenticated users read all users" ON users;
DROP POLICY IF EXISTS "Authenticated users read active users" ON users;
CREATE POLICY "Authenticated users read active users" ON users
  FOR SELECT TO authenticated
  USING (is_active = true OR public.is_admin());

-- ---- DEPARTMENTS ----
-- Already has "Public read departments" from 032. Keep it.
-- No additional policy needed.

-- ---- TEAMS ----
-- Already has "Public read teams" from 032. Keep it.
-- No additional policy needed.

-- ---- HOLIDAYS ----
-- Already has "Public read holidays" from 032. Keep it.
-- No additional policy needed.

-- ---- ATTENDANCE RULES ----
-- Already has "Public read attendance_rules" from 032. Keep it.
-- No additional policy needed.

-- ---- LEADS ----
-- Employees: only leads assigned to them or created by them
-- Managers: leads from their team members
-- Admins: all leads
DROP POLICY IF EXISTS "leads_select_policy" ON leads;
CREATE POLICY "leads_select_policy" ON leads
  FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR assigned_to = auth.uid()
    OR created_by = auth.uid()
    OR (
      public.is_manager_or_admin()
      AND EXISTS (
        SELECT 1 FROM public.users teammate
        WHERE teammate.team_id = public.get_my_team_id()
        AND teammate.id = leads.assigned_to
      )
    )
  );

-- ---- LEAD ACTIVITIES ----
-- Follow lead visibility: if you can see the lead, you can see its activities
DROP POLICY IF EXISTS "lead_activities_select_policy" ON lead_activities;
CREATE POLICY "lead_activities_select_policy" ON lead_activities
  FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.leads l
      WHERE l.id = lead_activities.lead_id
      AND (
        l.assigned_to = auth.uid()
        OR l.created_by = auth.uid()
        OR (
          public.is_manager_or_admin()
          AND EXISTS (
            SELECT 1 FROM public.users teammate
            WHERE teammate.team_id = public.get_my_team_id()
            AND teammate.id = l.assigned_to
          )
        )
      )
    )
  );

-- ---- LEAD ASSIGNMENTS HISTORY ----
-- Follow lead visibility
DROP POLICY IF EXISTS "lead_assignments_select_policy" ON lead_assignments_history;
CREATE POLICY "lead_assignments_select_policy" ON lead_assignments_history
  FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.leads l
      WHERE l.id = lead_assignments_history.lead_id
      AND (
        l.assigned_to = auth.uid()
        OR l.created_by = auth.uid()
      )
    )
  );

-- ---- LEAD REMINDERS ----
-- Employees: own reminders only
-- Managers: team reminders
-- Admins: all
DROP POLICY IF EXISTS "lead_reminders_select_policy" ON lead_reminders;
CREATE POLICY "lead_reminders_select_policy" ON lead_reminders
  FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR user_id = auth.uid()
    OR (
      public.is_manager_or_admin()
      AND (
        -- Manager can see reminders on leads assigned to their team members
        EXISTS (
          SELECT 1 FROM public.leads l
          WHERE l.id = lead_reminders.lead_id
          AND (
            l.assigned_to = auth.uid()
            OR EXISTS (
              SELECT 1 FROM public.users teammate
              WHERE teammate.id = l.assigned_to
              AND teammate.team_id = public.get_my_team_id()
            )
          )
        )
        -- OR manager can see reminders for team members' own reminders
        OR EXISTS (
          SELECT 1 FROM public.users teammate
          WHERE teammate.team_id = public.get_my_team_id()
          AND teammate.id = lead_reminders.user_id
        )
      )
    )
  );

-- ---- TASKS ----
-- Employees: only their assigned tasks
-- Managers: department tasks
-- Admins: all tasks
DROP POLICY IF EXISTS "tasks_select_policy" ON tasks;
CREATE POLICY "tasks_select_policy" ON tasks
  FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR assigned_to = auth.uid()
    OR assigned_by = auth.uid()
    OR (
      public.is_manager_or_admin()
      AND (
        tasks.department_id = public.get_my_department_id()
        OR EXISTS (
          SELECT 1 FROM public.users teammate
          WHERE teammate.team_id = public.get_my_team_id()
          AND teammate.id = tasks.assigned_to
        )
      )
    )
  );

-- ---- COMMENTS (unified lead + task comments) ----
-- Follow parent entity visibility
DROP POLICY IF EXISTS "comments_select_policy" ON comments;
CREATE POLICY "comments_select_policy" ON comments
  FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR user_id = auth.uid()
    OR (
      entity_type = 'lead' AND EXISTS (
        SELECT 1 FROM public.leads l
        WHERE l.id = comments.entity_id
        AND (l.assigned_to = auth.uid() OR l.created_by = auth.uid())
      )
    )
    OR (
      entity_type = 'task' AND EXISTS (
        SELECT 1 FROM public.tasks t
        WHERE t.id = comments.entity_id
        AND (t.assigned_to = auth.uid() OR t.assigned_by = auth.uid())
      )
    )
  );

-- ---- ATTENDANCE ----
-- Employees: own attendance only
-- HR / Admin: all attendance
-- Managers: their department
DROP POLICY IF EXISTS "Users read own attendance" ON attendance;
DROP POLICY IF EXISTS "attendance_select_policy" ON attendance;
CREATE POLICY "attendance_select_policy" ON attendance
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_admin()
    OR public.is_hr()
    OR (
      public.is_manager_or_admin()
      AND EXISTS (
        SELECT 1 FROM public.users teammate
        WHERE teammate.id = attendance.user_id
        AND teammate.department_id = public.get_my_department_id()
      )
    )
  );

-- ---- NOTIFICATIONS ----
-- Users can only see their own notifications
DROP POLICY IF EXISTS "Users read own notifications" ON notifications;
DROP POLICY IF EXISTS "notifications_select_policy" ON notifications;
CREATE POLICY "notifications_select_policy" ON notifications
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- ---- NOTIFICATION PREFERENCES ----
-- Users can only see their own preferences
-- DROP POLICY IF EXISTS "notification_prefs_select_policy" ON notification_preferences;
-- CREATE POLICY "notification_prefs_select_policy" ON notification_preferences
--   FOR SELECT TO authenticated
--   USING (user_id = auth.uid());

-- ---- PROJECTS ----
-- Members of project can see it, managers of project can see it, admin sees all
DROP POLICY IF EXISTS "projects_select_policy" ON projects;
CREATE POLICY "projects_select_policy" ON projects
  FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR manager_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = projects.id
      AND pm.user_id = auth.uid()
    )
  );

-- ---- PROJECT MEMBERS ----
-- Can see members if you can see the project
DROP POLICY IF EXISTS "project_members_select_policy" ON project_members;
CREATE POLICY "project_members_select_policy" ON project_members
  FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_members.project_id
      AND (
        p.manager_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.project_members pm2
          WHERE pm2.project_id = p.id AND pm2.user_id = auth.uid()
        )
      )
    )
  );

-- ---- ACTIVITY LOGS ----
-- Admins: all. Others: own only.
-- DROP POLICY IF EXISTS "activity_logs_select_policy" ON activity_logs;
-- CREATE POLICY "activity_logs_select_policy" ON activity_logs
--   FOR SELECT TO authenticated
--   USING (
--     public.is_admin()
--     OR user_id = auth.uid()
--   );

-- ---- USER ACTIVITIES ----
-- Admins: all. Others: own only.
DROP POLICY IF EXISTS "user_activities_select_policy" ON user_activities;
CREATE POLICY "user_activities_select_policy" ON user_activities
  FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR user_id = auth.uid()
  );

-- ---- REFRESH TOKENS ----
-- No frontend access needed (backend-only table)
DROP POLICY IF EXISTS "refresh_tokens_no_access" ON refresh_tokens;
CREATE POLICY "refresh_tokens_no_access" ON refresh_tokens
  FOR SELECT TO authenticated
  USING (false);

-- ---- CSV IMPORT/EXPORT JOBS ----
-- Own jobs only
-- DROP POLICY IF EXISTS "csv_import_select_policy" ON csv_import_jobs;
-- CREATE POLICY "csv_import_select_policy" ON csv_import_jobs
--   FOR SELECT TO authenticated
--   USING (user_id = auth.uid() OR public.is_admin());

-- DROP POLICY IF EXISTS "csv_export_select_policy" ON csv_export_jobs;
-- CREATE POLICY "csv_export_select_policy" ON csv_export_jobs
--   FOR SELECT TO authenticated
--   USING (user_id = auth.uid() OR public.is_admin());

-- ---- SETTINGS ----
-- Admins only
DROP POLICY IF EXISTS "settings_select_policy" ON settings;
CREATE POLICY "settings_select_policy" ON settings
  FOR SELECT TO authenticated
  USING (public.is_admin());

-- ---- EMAIL TEMPLATES ----
-- All authenticated users can read templates
DROP POLICY IF EXISTS "email_templates_select_policy" ON email_templates;
CREATE POLICY "email_templates_select_policy" ON email_templates
  FOR SELECT TO authenticated
  USING (true);

-- ---- SAVED FILTERS ----
-- Own filters only
-- DROP POLICY IF EXISTS "saved_filters_select_policy" ON saved_filters;
-- CREATE POLICY "saved_filters_select_policy" ON saved_filters
--   FOR SELECT TO authenticated
--   USING (user_id = auth.uid());

-- ---- LEAVE TYPES ----
-- All authenticated users can read leave types
DROP POLICY IF EXISTS "leave_types_select_policy" ON leave_types;
CREATE POLICY "leave_types_select_policy" ON leave_types
  FOR SELECT TO authenticated
  USING (true);

-- ---- LEAVE REQUESTS ----
-- Employees: own only
-- Managers: their team/department
-- HR/Admin: all
DROP POLICY IF EXISTS "leave_requests_select_policy" ON leave_requests;
CREATE POLICY "leave_requests_select_policy" ON leave_requests
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_admin()
    OR public.is_hr()
    OR (
      public.is_manager_or_admin()
      AND EXISTS (
        SELECT 1 FROM public.users teammate
        WHERE teammate.id = leave_requests.user_id
        AND teammate.department_id = public.get_my_department_id()
      )
    )
  );

-- ---- LEAVE BALANCES ----
-- Employees: own only
-- HR/Admin: all
DROP POLICY IF EXISTS "leave_balances_select_policy" ON leave_balances;
CREATE POLICY "leave_balances_select_policy" ON leave_balances
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_admin()
    OR public.is_hr()
  );

-- ---- EMPLOYEE DOCUMENTS ----
-- Employees: own only
-- HR/Admin: all
DROP POLICY IF EXISTS "employee_documents_select_policy" ON employee_documents;
CREATE POLICY "employee_documents_select_policy" ON employee_documents
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_admin()
    OR public.is_hr()
  );

-- ---- EMPLOYEE DETAILS ----
-- Employees: own only
-- HR/Admin: all
DROP POLICY IF EXISTS "employee_details_select_policy" ON employee_details;
CREATE POLICY "employee_details_select_policy" ON employee_details
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_admin()
    OR public.is_hr()
  );

-- ---- TEAM NOTES ----
-- Already has proper RLS from team_notes_schema.sql migration.
-- No changes needed.

-- ---- USER EMAIL SETTINGS ----
-- Already has proper RLS from 003_user_email_settings.sql migration.
-- Add admin access.
DROP POLICY IF EXISTS "admin_view_email_settings" ON user_email_settings;
CREATE POLICY "admin_view_email_settings" ON user_email_settings
  FOR SELECT TO authenticated
  USING (public.is_admin());

-- ---- EMAIL SEND LOG ----
-- Already has own-user policy. Add admin access.
DROP POLICY IF EXISTS "admin_view_email_logs" ON email_send_log;
CREATE POLICY "admin_view_email_logs" ON email_send_log
  FOR SELECT TO authenticated
  USING (public.is_admin());

-- ===================
-- 5. GRANT USAGE TO AUTHENTICATED ROLE (explicit per-table, not ALL TABLES)
-- ===================
GRANT USAGE ON SCHEMA public TO authenticated;

-- Core tables (RLS-protected in this migration)
GRANT SELECT ON TABLE public.users TO authenticated;
GRANT SELECT ON TABLE public.departments TO authenticated;
GRANT SELECT ON TABLE public.teams TO authenticated;
GRANT SELECT ON TABLE public.leads TO authenticated;
GRANT SELECT ON TABLE public.lead_activities TO authenticated;
GRANT SELECT ON TABLE public.lead_assignments_history TO authenticated;
GRANT SELECT ON TABLE public.lead_reminders TO authenticated;
GRANT SELECT ON TABLE public.tasks TO authenticated;
GRANT SELECT ON TABLE public.comments TO authenticated;
GRANT SELECT ON TABLE public.attendance TO authenticated;
GRANT SELECT ON TABLE public.attendance_rules TO authenticated;
GRANT SELECT ON TABLE public.holidays TO authenticated;
GRANT SELECT ON TABLE public.notifications TO authenticated;
-- GRANT SELECT ON TABLE public.notification_preferences TO authenticated;
-- GRANT SELECT ON TABLE public.activity_logs TO authenticated;
GRANT SELECT ON TABLE public.user_activities TO authenticated;
GRANT SELECT ON TABLE public.projects TO authenticated;
GRANT SELECT ON TABLE public.project_members TO authenticated;
GRANT SELECT ON TABLE public.settings TO authenticated;
GRANT SELECT ON TABLE public.email_templates TO authenticated;
-- GRANT SELECT ON TABLE public.saved_filters TO authenticated;
GRANT SELECT ON TABLE public.leave_types TO authenticated;
GRANT SELECT ON TABLE public.leave_requests TO authenticated;
GRANT SELECT ON TABLE public.leave_balances TO authenticated;
GRANT SELECT ON TABLE public.employee_documents TO authenticated;
GRANT SELECT ON TABLE public.employee_details TO authenticated;
GRANT SELECT ON TABLE public.team_notes TO authenticated;
GRANT SELECT ON TABLE public.user_email_settings TO authenticated;
GRANT SELECT ON TABLE public.email_send_log TO authenticated;

-- Finance tables (RLS from migration 019)
GRANT SELECT ON TABLE public.invoices TO authenticated;
GRANT SELECT ON TABLE public.invoice_line_items TO authenticated;
GRANT SELECT ON TABLE public.payments TO authenticated;
GRANT SELECT ON TABLE public.expenses TO authenticated;
GRANT SELECT ON TABLE public.expense_categories TO authenticated;
GRANT SELECT ON TABLE public.finance_approvals TO authenticated;
GRANT SELECT ON TABLE public.email_requests TO authenticated;
GRANT SELECT ON TABLE public.recurring_schedules TO authenticated;
GRANT SELECT ON TABLE public.scheduled_emails TO authenticated;

-- Helper functions for RLS policies
GRANT EXECUTE ON FUNCTION public.get_my_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_department_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_team_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_manager_or_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_hr() TO authenticated;

-- NOTE: No grants to anon role. Frontend must authenticate via Supabase Auth
-- before querying. If session is not established, queries will fail gracefully
-- and fall back to backend API.

-- =====================================================
-- DONE: All tables now have proper role-scoped SELECT policies.
-- Backend (service_role) bypasses RLS entirely - no impact.
-- Frontend (anon key + authenticated session) gets proper access.
-- =====================================================
