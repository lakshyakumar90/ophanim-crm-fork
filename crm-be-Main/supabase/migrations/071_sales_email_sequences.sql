-- Migration 071: Lead email sequences and steps

CREATE TYPE sequence_step_status AS ENUM (
  'pending',
  'sent',
  'skipped',
  'failed'
);

CREATE TABLE IF NOT EXISTS lead_email_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lead_email_sequences_created_by ON lead_email_sequences(created_by);
CREATE INDEX IF NOT EXISTS idx_lead_email_sequences_department_id ON lead_email_sequences(department_id);
CREATE INDEX IF NOT EXISTS idx_lead_email_sequences_is_active ON lead_email_sequences(is_active);

CREATE TABLE IF NOT EXISTS lead_sequence_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_id UUID NOT NULL REFERENCES lead_email_sequences(id) ON DELETE CASCADE,
  step_order INT NOT NULL DEFAULT 1,
  delay_days INT NOT NULL DEFAULT 0,
  subject TEXT NOT NULL,
  body_template TEXT NOT NULL,
  channel TEXT DEFAULT 'email',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (sequence_id, step_order)
);

CREATE INDEX IF NOT EXISTS idx_lead_sequence_steps_sequence_id ON lead_sequence_steps(sequence_id);

ALTER TABLE lead_email_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_sequence_steps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for authenticated users on lead_email_sequences" ON lead_email_sequences;
DROP POLICY IF EXISTS "lead_email_sequences_select_policy" ON lead_email_sequences;
DROP POLICY IF EXISTS "lead_email_sequences_insert_policy" ON lead_email_sequences;
DROP POLICY IF EXISTS "lead_email_sequences_update_policy" ON lead_email_sequences;
DROP POLICY IF EXISTS "lead_email_sequences_delete_policy" ON lead_email_sequences;

CREATE POLICY "lead_email_sequences_select_policy" ON lead_email_sequences
  FOR SELECT TO authenticated
  USING (
    private.is_admin()
    OR private.is_manager_or_admin()
    OR created_by = auth.uid()
  );

CREATE POLICY "lead_email_sequences_insert_policy" ON lead_email_sequences
  FOR INSERT TO authenticated
  WITH CHECK (
    private.is_admin()
    OR private.is_manager_or_admin()
    OR created_by = auth.uid()
  );

CREATE POLICY "lead_email_sequences_update_policy" ON lead_email_sequences
  FOR UPDATE TO authenticated
  USING (
    private.is_admin()
    OR private.is_manager_or_admin()
    OR created_by = auth.uid()
  )
  WITH CHECK (
    private.is_admin()
    OR private.is_manager_or_admin()
    OR created_by = auth.uid()
  );

CREATE POLICY "lead_email_sequences_delete_policy" ON lead_email_sequences
  FOR DELETE TO authenticated
  USING (private.is_admin() OR private.is_manager_or_admin());

DROP POLICY IF EXISTS "Allow all for authenticated users on lead_sequence_steps" ON lead_sequence_steps;
DROP POLICY IF EXISTS "lead_sequence_steps_select_policy" ON lead_sequence_steps;
DROP POLICY IF EXISTS "lead_sequence_steps_insert_policy" ON lead_sequence_steps;
DROP POLICY IF EXISTS "lead_sequence_steps_update_policy" ON lead_sequence_steps;
DROP POLICY IF EXISTS "lead_sequence_steps_delete_policy" ON lead_sequence_steps;

CREATE POLICY "lead_sequence_steps_select_policy" ON lead_sequence_steps
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM lead_email_sequences s
      WHERE s.id = lead_sequence_steps.sequence_id
        AND (
          private.is_admin()
          OR private.is_manager_or_admin()
          OR s.created_by = auth.uid()
        )
    )
  );

CREATE POLICY "lead_sequence_steps_insert_policy" ON lead_sequence_steps
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM lead_email_sequences s
      WHERE s.id = lead_sequence_steps.sequence_id
        AND (
          private.is_admin()
          OR private.is_manager_or_admin()
          OR s.created_by = auth.uid()
        )
    )
  );

CREATE POLICY "lead_sequence_steps_update_policy" ON lead_sequence_steps
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM lead_email_sequences s
      WHERE s.id = lead_sequence_steps.sequence_id
        AND (
          private.is_admin()
          OR private.is_manager_or_admin()
          OR s.created_by = auth.uid()
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM lead_email_sequences s
      WHERE s.id = lead_sequence_steps.sequence_id
        AND (
          private.is_admin()
          OR private.is_manager_or_admin()
          OR s.created_by = auth.uid()
        )
    )
  );

CREATE POLICY "lead_sequence_steps_delete_policy" ON lead_sequence_steps
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM lead_email_sequences s
      WHERE s.id = lead_sequence_steps.sequence_id
        AND (private.is_admin() OR private.is_manager_or_admin())
    )
  );
