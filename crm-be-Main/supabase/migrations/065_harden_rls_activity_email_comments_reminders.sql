-- =====================================================
-- Migration 065: Harden RLS for activity_events, email_requests,
--                comments, and lead_reminders
-- =====================================================
-- Goals:
-- 1) Remove permissive finance email_requests policy
-- 2) Ensure activity_events is RLS-protected for authenticated reads
-- 3) Align comments/reminders manager visibility with lead/team/department logic
--
-- Notes:
-- - Backend uses service_role and bypasses RLS; this migration protects frontend direct reads.
-- - This migration assumes helper functions from 033 exist:
--   public.is_admin(), public.is_manager_or_admin(),
--   public.get_my_team_id(), public.get_my_department_id()
-- =====================================================

-- ===================
-- 1) activity_events hardening
-- ===================
ALTER TABLE IF EXISTS public.activity_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "activity_events_select_policy" ON public.activity_events;
CREATE POLICY "activity_events_select_policy" ON public.activity_events
  FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR actor_id = auth.uid()
    OR (
      public.is_manager_or_admin()
      AND EXISTS (
        SELECT 1
        FROM public.users actor
        WHERE actor.id = activity_events.actor_id
          AND (
            (
              public.get_my_team_id() IS NOT NULL
              AND actor.team_id = public.get_my_team_id()
            )
            OR (
              public.get_my_team_id() IS NULL
              AND public.get_my_department_id() IS NOT NULL
              AND actor.department_id = public.get_my_department_id()
            )
          )
      )
    )
  );

-- ===================
-- 2) comments parity with lead/task visibility
-- ===================
DROP POLICY IF EXISTS "comments_select_policy" ON public.comments;
CREATE POLICY "comments_select_policy" ON public.comments
  FOR SELECT TO authenticated
  USING (
    COALESCE(is_deleted, false) = false
    AND (
      public.is_admin()
      OR user_id = auth.uid()
      OR (
        entity_type = 'lead'
        AND EXISTS (
          SELECT 1
          FROM public.leads l
          WHERE l.id = comments.entity_id
            AND (
              l.assigned_to = auth.uid()
              OR l.created_by = auth.uid()
              OR (
                public.is_manager_or_admin()
                AND (
                  EXISTS (
                    SELECT 1
                    FROM public.users teammate
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
      )
      OR (
        entity_type = 'task'
        AND EXISTS (
          SELECT 1
          FROM public.tasks t
          WHERE t.id = comments.entity_id
            AND (
              t.assigned_to = auth.uid()
              OR t.assigned_by = auth.uid()
              OR (
                public.is_manager_or_admin()
                AND (
                  t.department_id = public.get_my_department_id()
                  OR EXISTS (
                    SELECT 1
                    FROM public.users teammate
                    WHERE teammate.id = t.assigned_to
                      AND teammate.team_id = public.get_my_team_id()
                  )
                )
              )
            )
        )
      )
    )
  );

-- ===================
-- 3) lead_reminders parity with updated lead manager visibility
-- ===================
DROP POLICY IF EXISTS "lead_reminders_select_policy" ON public.lead_reminders;
CREATE POLICY "lead_reminders_select_policy" ON public.lead_reminders
  FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR user_id = auth.uid()
    OR (
      public.is_manager_or_admin()
      AND (
        EXISTS (
          SELECT 1
          FROM public.leads l
          WHERE l.id = lead_reminders.lead_id
            AND (
              l.assigned_to = auth.uid()
              OR (
                EXISTS (
                  SELECT 1
                  FROM public.users teammate
                  WHERE teammate.id = l.assigned_to
                    AND teammate.team_id = public.get_my_team_id()
                    AND public.get_my_team_id() IS NOT NULL
                )
              )
              OR (
                public.get_my_team_id() IS NULL
                AND l.department_id = public.get_my_department_id()
                AND public.get_my_department_id() IS NOT NULL
              )
            )
        )
        OR EXISTS (
          SELECT 1
          FROM public.users teammate
          WHERE teammate.id = lead_reminders.user_id
            AND (
              (
                public.get_my_team_id() IS NOT NULL
                AND teammate.team_id = public.get_my_team_id()
              )
              OR (
                public.get_my_team_id() IS NULL
                AND public.get_my_department_id() IS NOT NULL
                AND teammate.department_id = public.get_my_department_id()
              )
            )
        )
      )
    )
  );

-- ===================
-- 4) email_requests hardening (replace permissive FOR ALL USING true)
-- ===================
ALTER TABLE IF EXISTS public.email_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.email_requests;
DROP POLICY IF EXISTS "email_requests_select_policy" ON public.email_requests;
DROP POLICY IF EXISTS "email_requests_insert_policy" ON public.email_requests;
DROP POLICY IF EXISTS "email_requests_update_policy" ON public.email_requests;
DROP POLICY IF EXISTS "email_requests_delete_policy" ON public.email_requests;

CREATE POLICY "email_requests_select_policy" ON public.email_requests
  FOR SELECT TO authenticated
  USING (
    sender_id = auth.uid()
    OR public.is_manager_or_admin()
  );

CREATE POLICY "email_requests_insert_policy" ON public.email_requests
  FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    OR public.is_manager_or_admin()
  );

CREATE POLICY "email_requests_update_policy" ON public.email_requests
  FOR UPDATE TO authenticated
  USING (
    sender_id = auth.uid()
    OR public.is_manager_or_admin()
  )
  WITH CHECK (
    sender_id = auth.uid()
    OR public.is_manager_or_admin()
  );

CREATE POLICY "email_requests_delete_policy" ON public.email_requests
  FOR DELETE TO authenticated
  USING (public.is_admin());
