-- Phase 4 PM: sprints table and optional task linkage

CREATE TABLE IF NOT EXISTS sprints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  goal TEXT,
  start_date DATE,
  end_date DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'planned'
    CHECK (status IN ('planned', 'active', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sprints_project ON sprints(project_id);
CREATE INDEX IF NOT EXISTS idx_sprints_status ON sprints(status);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'tasks'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'tasks'
      AND column_name = 'sprint_id'
  ) THEN
    ALTER TABLE tasks
      ADD COLUMN sprint_id UUID REFERENCES sprints(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_tasks_sprint ON tasks(sprint_id);
  END IF;
END $$;

ALTER TABLE sprints ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for service role" ON sprints;
DROP POLICY IF EXISTS "sprints_select_policy" ON sprints;
DROP POLICY IF EXISTS "sprints_insert_policy" ON sprints;
DROP POLICY IF EXISTS "sprints_update_policy" ON sprints;
DROP POLICY IF EXISTS "sprints_delete_policy" ON sprints;

CREATE POLICY "sprints_select_policy" ON sprints
  FOR SELECT TO authenticated
  USING (
    private.is_admin()
    OR private.current_user_has_permission('milestones:view')
    OR private.current_user_has_permission('milestones:manage')
    OR private.is_project_member(project_id)
    OR EXISTS (
      SELECT 1 FROM public.projects
      WHERE id = sprints.project_id
        AND manager_id = auth.uid()
    )
  );

CREATE POLICY "sprints_insert_policy" ON sprints
  FOR INSERT TO authenticated
  WITH CHECK (
    private.is_admin()
    OR private.current_user_has_permission('milestones:manage')
    OR EXISTS (
      SELECT 1 FROM public.projects
      WHERE id = sprints.project_id
        AND manager_id = auth.uid()
    )
  );

CREATE POLICY "sprints_update_policy" ON sprints
  FOR UPDATE TO authenticated
  USING (
    private.is_admin()
    OR private.current_user_has_permission('milestones:manage')
    OR EXISTS (
      SELECT 1 FROM public.projects
      WHERE id = sprints.project_id
        AND manager_id = auth.uid()
    )
  )
  WITH CHECK (
    private.is_admin()
    OR private.current_user_has_permission('milestones:manage')
    OR EXISTS (
      SELECT 1 FROM public.projects
      WHERE id = sprints.project_id
        AND manager_id = auth.uid()
    )
  );

CREATE POLICY "sprints_delete_policy" ON sprints
  FOR DELETE TO authenticated
  USING (
    private.is_admin()
    OR private.current_user_has_permission('milestones:manage')
    OR EXISTS (
      SELECT 1 FROM public.projects
      WHERE id = sprints.project_id
        AND manager_id = auth.uid()
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON sprints TO service_role;
GRANT SELECT, INSERT, UPDATE ON sprints TO authenticated;
