-- Phase 4 PM: client-facing project status portal tokens

CREATE TABLE IF NOT EXISTS project_portal_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  revoked_at TIMESTAMPTZ,
  view_count INT NOT NULL DEFAULT 0,
  last_viewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_project_portal_tokens_token ON project_portal_tokens(token);
CREATE INDEX IF NOT EXISTS idx_project_portal_tokens_project ON project_portal_tokens(project_id);

ALTER TABLE project_portal_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for service role" ON project_portal_tokens;
DROP POLICY IF EXISTS "project_portal_tokens_select_policy" ON project_portal_tokens;
DROP POLICY IF EXISTS "project_portal_tokens_insert_policy" ON project_portal_tokens;
DROP POLICY IF EXISTS "project_portal_tokens_update_policy" ON project_portal_tokens;
DROP POLICY IF EXISTS "project_portal_tokens_delete_policy" ON project_portal_tokens;

CREATE POLICY "project_portal_tokens_select_policy" ON project_portal_tokens
  FOR SELECT TO authenticated
  USING (
    private.is_admin()
    OR private.is_project_member(project_id)
    OR EXISTS (
      SELECT 1 FROM public.projects
      WHERE id = project_portal_tokens.project_id
        AND manager_id = auth.uid()
    )
  );

CREATE POLICY "project_portal_tokens_insert_policy" ON project_portal_tokens
  FOR INSERT TO authenticated
  WITH CHECK (
    private.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.projects
      WHERE id = project_portal_tokens.project_id
        AND manager_id = auth.uid()
    )
  );

CREATE POLICY "project_portal_tokens_update_policy" ON project_portal_tokens
  FOR UPDATE TO authenticated
  USING (
    private.is_admin()
    OR created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.projects
      WHERE id = project_portal_tokens.project_id
        AND manager_id = auth.uid()
    )
  )
  WITH CHECK (
    private.is_admin()
    OR created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.projects
      WHERE id = project_portal_tokens.project_id
        AND manager_id = auth.uid()
    )
  );

CREATE POLICY "project_portal_tokens_delete_policy" ON project_portal_tokens
  FOR DELETE TO authenticated
  USING (
    private.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.projects
      WHERE id = project_portal_tokens.project_id
        AND manager_id = auth.uid()
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON project_portal_tokens TO service_role;
GRANT SELECT, INSERT, UPDATE ON project_portal_tokens TO authenticated;
