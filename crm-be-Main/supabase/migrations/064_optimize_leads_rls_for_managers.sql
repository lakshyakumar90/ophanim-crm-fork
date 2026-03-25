-- =====================================================
-- Migration 064: Optimize Leads RLS for Manager Access
-- =====================================================
-- Fixes issue where managers couldn't see specific team members' leads
-- when filtering by individual users. Updates RLS policy to explicitly
-- allow managers to view:
-- 1. Their own assigned leads
-- 2. Leads assigned to their team members (by team_id match)
-- 3. Leads they created
-- 4. All leads (for admins)
-- =====================================================

-- Drop and recreate the leads_select_policy with improved logic
DROP POLICY IF EXISTS "leads_select_policy" ON leads;

CREATE POLICY "leads_select_policy" ON leads
  FOR SELECT TO authenticated
  USING (
    -- Admins can see all leads
    public.is_admin()
    
    -- Users can see leads assigned to them
    OR assigned_to = auth.uid()
    
    -- Users can see leads they created
    OR created_by = auth.uid()
    
    -- Managers and admins can see leads assigned to their team members
    -- This handles both "view whole team" and "view specific team member" cases
    OR (
      public.is_manager_or_admin()
      AND (
        -- Check if the assigned-to user is in the manager's team
        EXISTS (
          SELECT 1 FROM public.users teammate
          WHERE teammate.id = leads.assigned_to
          AND teammate.team_id = public.get_my_team_id()
          AND public.get_my_team_id() IS NOT NULL
        )
        -- Also check if the lead is assigned to someone in the same department
        -- (in case team_id is not set but department_id is)
        OR (
          public.get_my_team_id() IS NULL
          AND leads.department_id = public.get_my_department_id()
          AND public.get_my_department_id() IS NOT NULL
        )
      )
    )
  );

-- Update lead_activities policy to match
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
        -- User can see the lead
        l.assigned_to = auth.uid()
        OR l.created_by = auth.uid()
        OR (
          public.is_manager_or_admin()
          AND (
            EXISTS (
              SELECT 1 FROM public.users teammate
              WHERE teammate.id = l.assigned_to
              AND teammate.team_id = public.get_my_team_id()
              AND public.get_my_team_id() IS NOT NULL
            )
            OR (
              public.get_my_team_id() IS NULL
              AND l.department_id = public.get_my_department_id()
              AND public.get_my_department_id() IS NOT NULL
            )
          )
        )
      )
    )
  );

-- Update lead assignments history policy to match
DROP POLICY IF EXISTS "lead_assignments_select_policy" ON lead_assignments_history;

CREATE POLICY "lead_assignments_select_policy" ON lead_assignments_history
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.leads l
      WHERE l.id = lead_assignments_history.lead_id
      AND (
        public.is_admin()
        OR l.assigned_to = auth.uid()
        OR l.created_by = auth.uid()
        OR (
          public.is_manager_or_admin()
          AND (
            EXISTS (
              SELECT 1 FROM public.users teammate
              WHERE teammate.id = l.assigned_to
              AND teammate.team_id = public.get_my_team_id()
              AND public.get_my_team_id() IS NOT NULL
            )
            OR (
              public.get_my_team_id() IS NULL
              AND l.department_id = public.get_my_department_id()
              AND public.get_my_department_id() IS NOT NULL
            )
          )
        )
      )
    )
  );
