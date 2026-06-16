-- =====================================================
-- Migration 087: Supabase database linter security hardening
-- Fixes: function_search_path_mutable, rls_policy_always_true,
--        anon/authenticated SECURITY DEFINER RPC exposure
-- No data changes — schema, grants, and policies only.
-- =====================================================

-- ===================
-- 1) Private schema for internal SECURITY DEFINER helpers
--    (not exposed via PostgREST /rest/v1/rpc)
-- ===================
CREATE SCHEMA IF NOT EXISTS private;

REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

-- Move privileged / RLS-helper functions out of public API schema.
DO $$
DECLARE
  fn text;
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    'public.current_user_has_permission(text)',
    'public.is_admin()',
    'public.is_manager_or_admin()',
    'public.is_hr()',
    'public.get_my_role()',
    'public.get_my_department_id()',
    'public.get_my_team_id()',
    'public.is_project_manager_of(uuid)',
    'public.is_project_member(uuid)',
    'public.assign_role_to_user(uuid,uuid)',
    'public.remove_role_from_user(uuid,uuid)',
    'public.bulk_auto_logout_due_attendance()',
    'public.handle_auto_logout()'
  ]::text[]
  LOOP
    BEGIN
      EXECUTE format('ALTER FUNCTION %s SET SCHEMA private', fn);
    EXCEPTION
      WHEN undefined_function THEN NULL;
    END;
  END LOOP;
END $$;

-- Lock down private schema; grant only what RLS / backend need.
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA private FROM PUBLIC, anon;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA private TO authenticated, service_role;

-- Role-assignment and cron helpers: backend / superuser only.
DO $$
DECLARE
  fn text;
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    'private.assign_role_to_user(uuid,uuid)',
    'private.remove_role_from_user(uuid,uuid)',
    'private.bulk_auto_logout_due_attendance()',
    'private.handle_auto_logout()'
  ]::text[]
  LOOP
    BEGIN
      EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', fn);
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', fn);
    EXCEPTION
      WHEN undefined_function THEN NULL;
    END;
  END LOOP;
END $$;

-- ===================
-- 2) Pin search_path on all public + private functions missing it
-- ===================
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT
      n.nspname AS schema_name,
      p.oid::regprocedure AS func
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname IN ('public', 'private')
      AND p.prokind = 'f'
      AND (
        p.proconfig IS NULL
        OR NOT EXISTS (
          SELECT 1
          FROM unnest(p.proconfig) AS cfg
          WHERE cfg LIKE 'search_path=%'
        )
      )
  LOOP
    IF r.schema_name = 'private' THEN
      EXECUTE format('ALTER FUNCTION %s SET search_path = private, public', r.func);
    ELSE
      EXECUTE format('ALTER FUNCTION %s SET search_path = public', r.func);
    END IF;
  END LOOP;
END $$;

-- ===================
-- 3) pg_cron: point at private.handle_auto_logout after schema move
-- ===================
DO $cron$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'attendance-auto-logout') THEN
      PERFORM cron.unschedule('attendance-auto-logout');
    END IF;

    PERFORM cron.schedule(
      'attendance-auto-logout',
      '*/5 * * * *',
      'SELECT private.handle_auto_logout();'
    );
  END IF;
EXCEPTION
  WHEN undefined_table OR undefined_object THEN NULL;
END $cron$;

-- ===================
-- 4) Finance RLS — replace permissive FOR ALL USING (true) policies
-- ===================

-- expense_categories: keep open SELECT; restrict writes
DROP POLICY IF EXISTS "Admin can manage expense categories" ON public.expense_categories;

CREATE POLICY "expense_categories_insert_policy" ON public.expense_categories
  FOR INSERT TO authenticated
  WITH CHECK (
    private.is_admin()
    OR private.current_user_has_permission('finance:manage')
  );

CREATE POLICY "expense_categories_update_policy" ON public.expense_categories
  FOR UPDATE TO authenticated
  USING (
    private.is_admin()
    OR private.current_user_has_permission('finance:manage')
  )
  WITH CHECK (
    private.is_admin()
    OR private.current_user_has_permission('finance:manage')
  );

CREATE POLICY "expense_categories_delete_policy" ON public.expense_categories
  FOR DELETE TO authenticated
  USING (
    private.is_admin()
    OR private.current_user_has_permission('finance:manage')
  );

-- invoices
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.invoices;

CREATE POLICY "invoices_select_policy" ON public.invoices
  FOR SELECT TO authenticated
  USING (
    private.is_admin()
    OR private.current_user_has_permission('finance:view')
    OR private.current_user_has_permission('finance:manage')
  );

CREATE POLICY "invoices_insert_policy" ON public.invoices
  FOR INSERT TO authenticated
  WITH CHECK (
    private.is_admin()
    OR private.current_user_has_permission('finance:manage')
  );

CREATE POLICY "invoices_update_policy" ON public.invoices
  FOR UPDATE TO authenticated
  USING (
    private.is_admin()
    OR private.current_user_has_permission('finance:manage')
  )
  WITH CHECK (
    private.is_admin()
    OR private.current_user_has_permission('finance:manage')
  );

CREATE POLICY "invoices_delete_policy" ON public.invoices
  FOR DELETE TO authenticated
  USING (
    private.is_admin()
    OR private.current_user_has_permission('finance:manage')
  );

-- invoice_line_items (inherit access via parent invoice)
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.invoice_line_items;

CREATE POLICY "invoice_line_items_select_policy" ON public.invoice_line_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.invoices i
      WHERE i.id = invoice_line_items.invoice_id
        AND (
          private.is_admin()
          OR private.current_user_has_permission('finance:view')
          OR private.current_user_has_permission('finance:manage')
        )
    )
  );

CREATE POLICY "invoice_line_items_insert_policy" ON public.invoice_line_items
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.invoices i
      WHERE i.id = invoice_line_items.invoice_id
        AND (
          private.is_admin()
          OR private.current_user_has_permission('finance:manage')
        )
    )
  );

CREATE POLICY "invoice_line_items_update_policy" ON public.invoice_line_items
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.invoices i
      WHERE i.id = invoice_line_items.invoice_id
        AND (
          private.is_admin()
          OR private.current_user_has_permission('finance:manage')
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.invoices i
      WHERE i.id = invoice_line_items.invoice_id
        AND (
          private.is_admin()
          OR private.current_user_has_permission('finance:manage')
        )
    )
  );

CREATE POLICY "invoice_line_items_delete_policy" ON public.invoice_line_items
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.invoices i
      WHERE i.id = invoice_line_items.invoice_id
        AND (
          private.is_admin()
          OR private.current_user_has_permission('finance:manage')
        )
    )
  );

-- payments
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.payments;

CREATE POLICY "payments_select_policy" ON public.payments
  FOR SELECT TO authenticated
  USING (
    private.is_admin()
    OR private.current_user_has_permission('finance:view')
    OR private.current_user_has_permission('finance:manage')
  );

CREATE POLICY "payments_insert_policy" ON public.payments
  FOR INSERT TO authenticated
  WITH CHECK (
    private.is_admin()
    OR private.current_user_has_permission('finance:manage')
  );

CREATE POLICY "payments_update_policy" ON public.payments
  FOR UPDATE TO authenticated
  USING (
    private.is_admin()
    OR private.current_user_has_permission('finance:manage')
  )
  WITH CHECK (
    private.is_admin()
    OR private.current_user_has_permission('finance:manage')
  );

CREATE POLICY "payments_delete_policy" ON public.payments
  FOR DELETE TO authenticated
  USING (
    private.is_admin()
    OR private.current_user_has_permission('finance:manage')
  );

-- expenses
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.expenses;

CREATE POLICY "expenses_select_policy" ON public.expenses
  FOR SELECT TO authenticated
  USING (
    private.is_admin()
    OR private.current_user_has_permission('finance:view')
    OR private.current_user_has_permission('finance:manage')
    OR submitted_by = auth.uid()
  );

CREATE POLICY "expenses_insert_policy" ON public.expenses
  FOR INSERT TO authenticated
  WITH CHECK (
    private.is_admin()
    OR private.current_user_has_permission('finance:manage')
    OR submitted_by = auth.uid()
  );

CREATE POLICY "expenses_update_policy" ON public.expenses
  FOR UPDATE TO authenticated
  USING (
    private.is_admin()
    OR private.current_user_has_permission('finance:manage')
    OR submitted_by = auth.uid()
  )
  WITH CHECK (
    private.is_admin()
    OR private.current_user_has_permission('finance:manage')
    OR submitted_by = auth.uid()
  );

CREATE POLICY "expenses_delete_policy" ON public.expenses
  FOR DELETE TO authenticated
  USING (
    private.is_admin()
    OR private.current_user_has_permission('finance:manage')
  );

-- finance_approvals
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.finance_approvals;

CREATE POLICY "finance_approvals_select_policy" ON public.finance_approvals
  FOR SELECT TO authenticated
  USING (
    private.is_admin()
    OR private.current_user_has_permission('finance:view')
    OR private.current_user_has_permission('finance:manage')
    OR requested_by = auth.uid()
  );

CREATE POLICY "finance_approvals_insert_policy" ON public.finance_approvals
  FOR INSERT TO authenticated
  WITH CHECK (
    private.is_admin()
    OR private.current_user_has_permission('finance:manage')
    OR requested_by = auth.uid()
  );

CREATE POLICY "finance_approvals_update_policy" ON public.finance_approvals
  FOR UPDATE TO authenticated
  USING (
    private.is_admin()
    OR private.current_user_has_permission('finance:manage')
  )
  WITH CHECK (
    private.is_admin()
    OR private.current_user_has_permission('finance:manage')
  );

CREATE POLICY "finance_approvals_delete_policy" ON public.finance_approvals
  FOR DELETE TO authenticated
  USING (
    private.is_admin()
    OR private.current_user_has_permission('finance:manage')
  );

-- email_requests (idempotent — also covered by 065 if not yet applied)
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.email_requests;
DROP POLICY IF EXISTS "email_requests_select_policy" ON public.email_requests;
DROP POLICY IF EXISTS "email_requests_insert_policy" ON public.email_requests;
DROP POLICY IF EXISTS "email_requests_update_policy" ON public.email_requests;
DROP POLICY IF EXISTS "email_requests_delete_policy" ON public.email_requests;

CREATE POLICY "email_requests_select_policy" ON public.email_requests
  FOR SELECT TO authenticated
  USING (
    sender_id = auth.uid()
    OR private.is_manager_or_admin()
    OR private.current_user_has_permission('finance:view')
    OR private.current_user_has_permission('finance:manage')
  );

CREATE POLICY "email_requests_insert_policy" ON public.email_requests
  FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    OR private.is_manager_or_admin()
    OR private.current_user_has_permission('finance:manage')
  );

CREATE POLICY "email_requests_update_policy" ON public.email_requests
  FOR UPDATE TO authenticated
  USING (
    sender_id = auth.uid()
    OR private.is_manager_or_admin()
    OR private.current_user_has_permission('finance:manage')
  )
  WITH CHECK (
    sender_id = auth.uid()
    OR private.is_manager_or_admin()
    OR private.current_user_has_permission('finance:manage')
  );

CREATE POLICY "email_requests_delete_policy" ON public.email_requests
  FOR DELETE TO authenticated
  USING (
    private.is_admin()
    OR private.current_user_has_permission('finance:manage')
  );

-- recurring_schedules
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.recurring_schedules;

CREATE POLICY "recurring_schedules_select_policy" ON public.recurring_schedules
  FOR SELECT TO authenticated
  USING (
    private.is_admin()
    OR private.current_user_has_permission('finance:view')
    OR private.current_user_has_permission('finance:manage')
    OR created_by = auth.uid()
  );

CREATE POLICY "recurring_schedules_insert_policy" ON public.recurring_schedules
  FOR INSERT TO authenticated
  WITH CHECK (
    private.is_admin()
    OR private.current_user_has_permission('finance:manage')
    OR created_by = auth.uid()
  );

CREATE POLICY "recurring_schedules_update_policy" ON public.recurring_schedules
  FOR UPDATE TO authenticated
  USING (
    private.is_admin()
    OR private.current_user_has_permission('finance:manage')
    OR created_by = auth.uid()
  )
  WITH CHECK (
    private.is_admin()
    OR private.current_user_has_permission('finance:manage')
    OR created_by = auth.uid()
  );

CREATE POLICY "recurring_schedules_delete_policy" ON public.recurring_schedules
  FOR DELETE TO authenticated
  USING (
    private.is_admin()
    OR private.current_user_has_permission('finance:manage')
  );

-- scheduled_emails (access via parent email_request)
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.scheduled_emails;

CREATE POLICY "scheduled_emails_select_policy" ON public.scheduled_emails
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.email_requests er
      WHERE er.id = scheduled_emails.email_request_id
        AND (
          er.sender_id = auth.uid()
          OR private.is_manager_or_admin()
          OR private.current_user_has_permission('finance:view')
          OR private.current_user_has_permission('finance:manage')
        )
    )
  );

CREATE POLICY "scheduled_emails_insert_policy" ON public.scheduled_emails
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.email_requests er
      WHERE er.id = scheduled_emails.email_request_id
        AND (
          er.sender_id = auth.uid()
          OR private.is_manager_or_admin()
          OR private.current_user_has_permission('finance:manage')
        )
    )
  );

CREATE POLICY "scheduled_emails_update_policy" ON public.scheduled_emails
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.email_requests er
      WHERE er.id = scheduled_emails.email_request_id
        AND (
          er.sender_id = auth.uid()
          OR private.is_manager_or_admin()
          OR private.current_user_has_permission('finance:manage')
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.email_requests er
      WHERE er.id = scheduled_emails.email_request_id
        AND (
          er.sender_id = auth.uid()
          OR private.is_manager_or_admin()
          OR private.current_user_has_permission('finance:manage')
        )
    )
  );

CREATE POLICY "scheduled_emails_delete_policy" ON public.scheduled_emails
  FOR DELETE TO authenticated
  USING (
    private.is_admin()
    OR private.current_user_has_permission('finance:manage')
  );

-- ===================
-- 5) Missing RLS policies (rls_enabled_no_policy)
-- ===================

-- activity_events
ALTER TABLE IF EXISTS public.activity_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "activity_events_select_policy" ON public.activity_events;
CREATE POLICY "activity_events_select_policy" ON public.activity_events
  FOR SELECT TO authenticated
  USING (
    private.is_admin()
    OR actor_id = auth.uid()
    OR (
      private.is_manager_or_admin()
      AND EXISTS (
        SELECT 1
        FROM public.users actor
        WHERE actor.id = activity_events.actor_id
          AND (
            (
              private.get_my_team_id() IS NOT NULL
              AND actor.team_id = private.get_my_team_id()
            )
            OR (
              private.get_my_team_id() IS NULL
              AND private.get_my_department_id() IS NOT NULL
              AND actor.department_id = private.get_my_department_id()
            )
          )
      )
    )
  );

-- cron_job_runs (admin read-only; writes via service_role / cron)
DROP POLICY IF EXISTS "cron_job_runs_select_policy" ON public.cron_job_runs;
CREATE POLICY "cron_job_runs_select_policy" ON public.cron_job_runs
  FOR SELECT TO authenticated
  USING (private.is_admin());

-- hr_document_types
DROP POLICY IF EXISTS "hr_document_types_select_policy" ON public.hr_document_types;
DROP POLICY IF EXISTS "hr_document_types_insert_policy" ON public.hr_document_types;
DROP POLICY IF EXISTS "hr_document_types_update_policy" ON public.hr_document_types;
DROP POLICY IF EXISTS "hr_document_types_delete_policy" ON public.hr_document_types;

CREATE POLICY "hr_document_types_select_policy" ON public.hr_document_types
  FOR SELECT TO authenticated
  USING (is_active = true OR private.is_hr() OR private.is_admin());

CREATE POLICY "hr_document_types_insert_policy" ON public.hr_document_types
  FOR INSERT TO authenticated
  WITH CHECK (private.is_hr() OR private.is_admin());

CREATE POLICY "hr_document_types_update_policy" ON public.hr_document_types
  FOR UPDATE TO authenticated
  USING (private.is_hr() OR private.is_admin())
  WITH CHECK (private.is_hr() OR private.is_admin());

CREATE POLICY "hr_document_types_delete_policy" ON public.hr_document_types
  FOR DELETE TO authenticated
  USING (private.is_admin());

-- jobs
DROP POLICY IF EXISTS "jobs_select_policy" ON public.jobs;
DROP POLICY IF EXISTS "jobs_insert_policy" ON public.jobs;
DROP POLICY IF EXISTS "jobs_update_policy" ON public.jobs;
DROP POLICY IF EXISTS "jobs_delete_policy" ON public.jobs;

CREATE POLICY "jobs_select_policy" ON public.jobs
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR private.is_manager_or_admin()
    OR private.is_admin()
  );

CREATE POLICY "jobs_insert_policy" ON public.jobs
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR private.is_manager_or_admin() OR private.is_admin());

CREATE POLICY "jobs_update_policy" ON public.jobs
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR private.is_manager_or_admin() OR private.is_admin())
  WITH CHECK (user_id = auth.uid() OR private.is_manager_or_admin() OR private.is_admin());

CREATE POLICY "jobs_delete_policy" ON public.jobs
  FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR private.is_admin());

-- otp_tokens (backend/service_role only — no direct client access)
REVOKE ALL ON TABLE public.otp_tokens FROM anon, authenticated;

DROP POLICY IF EXISTS "otp_tokens_deny_authenticated" ON public.otp_tokens;
CREATE POLICY "otp_tokens_deny_authenticated" ON public.otp_tokens
  FOR ALL TO authenticated
  USING (false)
  WITH CHECK (false);

-- user_departments
DROP POLICY IF EXISTS "user_departments_select_policy" ON public.user_departments;
DROP POLICY IF EXISTS "user_departments_insert_policy" ON public.user_departments;
DROP POLICY IF EXISTS "user_departments_update_policy" ON public.user_departments;
DROP POLICY IF EXISTS "user_departments_delete_policy" ON public.user_departments;

CREATE POLICY "user_departments_select_policy" ON public.user_departments
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR private.is_admin()
    OR private.is_hr()
  );

CREATE POLICY "user_departments_insert_policy" ON public.user_departments
  FOR INSERT TO authenticated
  WITH CHECK (private.is_admin() OR private.is_hr());

CREATE POLICY "user_departments_update_policy" ON public.user_departments
  FOR UPDATE TO authenticated
  USING (private.is_admin() OR private.is_hr())
  WITH CHECK (private.is_admin() OR private.is_hr());

CREATE POLICY "user_departments_delete_policy" ON public.user_departments
  FOR DELETE TO authenticated
  USING (private.is_admin() OR private.is_hr());

-- ===================
-- 6) Secure permissions view (security_invoker)
-- ===================
CREATE OR REPLACE VIEW public.user_resolved_permissions
WITH (security_invoker = true) AS
SELECT
  ur.user_id,
  array_agg(DISTINCT p)                                              AS permissions,
  array_agg(DISTINCT dept_id) FILTER (WHERE dept_id IS NOT NULL)    AS department_ids,
  bool_or(r.scope = 'global')                                        AS is_global,
  array_agg(DISTINCT r.id)                                           AS role_ids,
  array_agg(DISTINCT r.name)                                         AS role_names
FROM user_roles ur
JOIN roles r ON r.id = ur.role_id
CROSS JOIN LATERAL unnest(r.permissions) AS p
LEFT JOIN LATERAL unnest(
  COALESCE(
    r.department_ids,
    CASE WHEN r.department_id IS NOT NULL THEN ARRAY[r.department_id] ELSE NULL END
  )
) AS dept_id ON true
GROUP BY ur.user_id;
