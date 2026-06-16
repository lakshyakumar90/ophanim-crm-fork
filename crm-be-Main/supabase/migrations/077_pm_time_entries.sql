-- Phase 4 PM: time_entries table for project timesheets

CREATE TABLE IF NOT EXISTS time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  hours DECIMAL(6, 2) NOT NULL CHECK (hours > 0 AND hours <= 24),
  description TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'submitted', 'approved', 'rejected')),
  submitted_at TIMESTAMPTZ,
  approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  rejected_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_time_entries_project ON time_entries(project_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_user_date ON time_entries(user_id, entry_date);
CREATE INDEX IF NOT EXISTS idx_time_entries_status ON time_entries(status);
CREATE INDEX IF NOT EXISTS idx_time_entries_task ON time_entries(task_id);

ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for service role" ON time_entries;
DROP POLICY IF EXISTS "time_entries_select_policy" ON time_entries;
DROP POLICY IF EXISTS "time_entries_insert_policy" ON time_entries;
DROP POLICY IF EXISTS "time_entries_update_policy" ON time_entries;
DROP POLICY IF EXISTS "time_entries_delete_policy" ON time_entries;

CREATE POLICY "time_entries_select_policy" ON time_entries
  FOR SELECT TO authenticated
  USING (
    private.is_admin()
    OR private.current_user_has_permission('timesheets:view')
    OR private.current_user_has_permission('timesheets:manage')
    OR user_id = auth.uid()
    OR private.is_project_member(project_id)
    OR EXISTS (
      SELECT 1 FROM public.projects
      WHERE id = time_entries.project_id
        AND manager_id = auth.uid()
    )
  );

CREATE POLICY "time_entries_insert_policy" ON time_entries
  FOR INSERT TO authenticated
  WITH CHECK (
    private.is_admin()
    OR private.current_user_has_permission('timesheets:manage')
    OR user_id = auth.uid()
  );

CREATE POLICY "time_entries_update_policy" ON time_entries
  FOR UPDATE TO authenticated
  USING (
    private.is_admin()
    OR private.current_user_has_permission('timesheets:manage')
    OR user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.projects
      WHERE id = time_entries.project_id
        AND manager_id = auth.uid()
    )
  )
  WITH CHECK (
    private.is_admin()
    OR private.current_user_has_permission('timesheets:manage')
    OR user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.projects
      WHERE id = time_entries.project_id
        AND manager_id = auth.uid()
    )
  );

CREATE POLICY "time_entries_delete_policy" ON time_entries
  FOR DELETE TO authenticated
  USING (
    private.is_admin()
    OR private.current_user_has_permission('timesheets:manage')
    OR user_id = auth.uid()
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON time_entries TO service_role;
GRANT SELECT, INSERT, UPDATE ON time_entries TO authenticated;
