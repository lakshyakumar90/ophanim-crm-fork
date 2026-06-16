-- ============================================================
-- Migration: 085_hr_exit_checklists.sql
-- Exit / offboarding checklists (not full onboarding module)
-- ============================================================

CREATE TABLE IF NOT EXISTS exit_checklists (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  template_json     JSONB NOT NULL DEFAULT '[]'::jsonb,
  completed_items   JSONB NOT NULL DEFAULT '[]'::jsonb,
  exit_date         DATE,
  last_working_day  DATE,
  exit_type         VARCHAR(50),
  status            VARCHAR(30) DEFAULT 'in_progress'
                    CHECK (status IN ('in_progress', 'completed', 'cancelled')),
  notes             TEXT,
  created_by        UUID REFERENCES users(id),
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_exit_checklists_user ON exit_checklists(user_id);
CREATE INDEX IF NOT EXISTS idx_exit_checklists_status ON exit_checklists(status);
CREATE INDEX IF NOT EXISTS idx_exit_checklists_exit_date ON exit_checklists(exit_date);

ALTER TABLE exit_checklists ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "exit_checklists_hr_read" ON exit_checklists;
DROP POLICY IF EXISTS "exit_checklists_hr_manage" ON exit_checklists;
DROP POLICY IF EXISTS "exit_checklists_select_policy" ON exit_checklists;
DROP POLICY IF EXISTS "exit_checklists_insert_policy" ON exit_checklists;
DROP POLICY IF EXISTS "exit_checklists_update_policy" ON exit_checklists;
DROP POLICY IF EXISTS "exit_checklists_delete_policy" ON exit_checklists;

CREATE POLICY "exit_checklists_select_policy" ON exit_checklists
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR private.is_admin()
    OR private.is_hr()
  );

CREATE POLICY "exit_checklists_insert_policy" ON exit_checklists
  FOR INSERT TO authenticated
  WITH CHECK (
    private.is_admin()
    OR private.is_hr()
  );

CREATE POLICY "exit_checklists_update_policy" ON exit_checklists
  FOR UPDATE TO authenticated
  USING (
    private.is_admin()
    OR private.is_hr()
  )
  WITH CHECK (
    private.is_admin()
    OR private.is_hr()
  );

CREATE POLICY "exit_checklists_delete_policy" ON exit_checklists
  FOR DELETE TO authenticated
  USING (
    private.is_admin()
    OR private.is_hr()
  );
