-- Phase 4 PM: project milestones and deliverables

CREATE TABLE IF NOT EXISTS project_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  due_date TIMESTAMPTZ,
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS milestone_deliverables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  milestone_id UUID NOT NULL REFERENCES project_milestones(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_project_milestones_project ON project_milestones(project_id);
CREATE INDEX IF NOT EXISTS idx_project_milestones_status ON project_milestones(status);
CREATE INDEX IF NOT EXISTS idx_milestone_deliverables_milestone ON milestone_deliverables(milestone_id);

ALTER TABLE project_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE milestone_deliverables ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for service role" ON project_milestones;
DROP POLICY IF EXISTS "project_milestones_select_policy" ON project_milestones;
DROP POLICY IF EXISTS "project_milestones_insert_policy" ON project_milestones;
DROP POLICY IF EXISTS "project_milestones_update_policy" ON project_milestones;
DROP POLICY IF EXISTS "project_milestones_delete_policy" ON project_milestones;

CREATE POLICY "project_milestones_select_policy" ON project_milestones
  FOR SELECT TO authenticated
  USING (
    private.is_admin()
    OR private.current_user_has_permission('milestones:view')
    OR private.current_user_has_permission('milestones:manage')
    OR private.is_project_member(project_id)
    OR EXISTS (
      SELECT 1 FROM public.projects
      WHERE id = project_milestones.project_id
        AND manager_id = auth.uid()
    )
  );

CREATE POLICY "project_milestones_insert_policy" ON project_milestones
  FOR INSERT TO authenticated
  WITH CHECK (
    private.is_admin()
    OR private.current_user_has_permission('milestones:manage')
    OR EXISTS (
      SELECT 1 FROM public.projects
      WHERE id = project_milestones.project_id
        AND manager_id = auth.uid()
    )
  );

CREATE POLICY "project_milestones_update_policy" ON project_milestones
  FOR UPDATE TO authenticated
  USING (
    private.is_admin()
    OR private.current_user_has_permission('milestones:manage')
    OR EXISTS (
      SELECT 1 FROM public.projects
      WHERE id = project_milestones.project_id
        AND manager_id = auth.uid()
    )
  )
  WITH CHECK (
    private.is_admin()
    OR private.current_user_has_permission('milestones:manage')
    OR EXISTS (
      SELECT 1 FROM public.projects
      WHERE id = project_milestones.project_id
        AND manager_id = auth.uid()
    )
  );

CREATE POLICY "project_milestones_delete_policy" ON project_milestones
  FOR DELETE TO authenticated
  USING (
    private.is_admin()
    OR private.current_user_has_permission('milestones:manage')
    OR EXISTS (
      SELECT 1 FROM public.projects
      WHERE id = project_milestones.project_id
        AND manager_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Allow all for service role" ON milestone_deliverables;
DROP POLICY IF EXISTS "milestone_deliverables_select_policy" ON milestone_deliverables;
DROP POLICY IF EXISTS "milestone_deliverables_insert_policy" ON milestone_deliverables;
DROP POLICY IF EXISTS "milestone_deliverables_update_policy" ON milestone_deliverables;
DROP POLICY IF EXISTS "milestone_deliverables_delete_policy" ON milestone_deliverables;

CREATE POLICY "milestone_deliverables_select_policy" ON milestone_deliverables
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_milestones pm
      WHERE pm.id = milestone_deliverables.milestone_id
        AND (
          private.is_admin()
          OR private.current_user_has_permission('milestones:view')
          OR private.current_user_has_permission('milestones:manage')
          OR private.is_project_member(pm.project_id)
          OR EXISTS (
            SELECT 1 FROM public.projects p
            WHERE p.id = pm.project_id AND p.manager_id = auth.uid()
          )
        )
    )
  );

CREATE POLICY "milestone_deliverables_insert_policy" ON milestone_deliverables
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_milestones pm
      WHERE pm.id = milestone_deliverables.milestone_id
        AND (
          private.is_admin()
          OR private.current_user_has_permission('milestones:manage')
          OR EXISTS (
            SELECT 1 FROM public.projects p
            WHERE p.id = pm.project_id AND p.manager_id = auth.uid()
          )
        )
    )
  );

CREATE POLICY "milestone_deliverables_update_policy" ON milestone_deliverables
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_milestones pm
      WHERE pm.id = milestone_deliverables.milestone_id
        AND (
          private.is_admin()
          OR private.current_user_has_permission('milestones:manage')
          OR EXISTS (
            SELECT 1 FROM public.projects p
            WHERE p.id = pm.project_id AND p.manager_id = auth.uid()
          )
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_milestones pm
      WHERE pm.id = milestone_deliverables.milestone_id
        AND (
          private.is_admin()
          OR private.current_user_has_permission('milestones:manage')
          OR EXISTS (
            SELECT 1 FROM public.projects p
            WHERE p.id = pm.project_id AND p.manager_id = auth.uid()
          )
        )
    )
  );

CREATE POLICY "milestone_deliverables_delete_policy" ON milestone_deliverables
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_milestones pm
      JOIN public.projects p ON p.id = pm.project_id
      WHERE pm.id = milestone_deliverables.milestone_id
        AND (
          private.is_admin()
          OR private.current_user_has_permission('milestones:manage')
          OR p.manager_id = auth.uid()
        )
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON project_milestones TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON milestone_deliverables TO service_role;
GRANT SELECT, INSERT, UPDATE ON project_milestones TO authenticated;
GRANT SELECT, INSERT, UPDATE ON milestone_deliverables TO authenticated;
