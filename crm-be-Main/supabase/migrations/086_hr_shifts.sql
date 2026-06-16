-- ============================================================
-- Migration: 086_hr_shifts.sql
-- Per-employee shift scheduling (extends attendance shift system)
-- ============================================================

CREATE TABLE IF NOT EXISTS shifts (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  shift_date    DATE NOT NULL,
  start_time    TIME NOT NULL,
  end_time      TIME NOT NULL,
  shift_type    VARCHAR(20) DEFAULT 'day_shift'
                CHECK (shift_type IN ('day_shift', 'night_shift')),
  notes         TEXT,
  created_by    UUID REFERENCES users(id),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, shift_date)
);

CREATE INDEX IF NOT EXISTS idx_shifts_user ON shifts(user_id);
CREATE INDEX IF NOT EXISTS idx_shifts_date ON shifts(shift_date);
CREATE INDEX IF NOT EXISTS idx_shifts_user_date ON shifts(user_id, shift_date);

ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "shifts_read" ON shifts;
DROP POLICY IF EXISTS "shifts_hr_manage" ON shifts;
DROP POLICY IF EXISTS "shifts_select_policy" ON shifts;
DROP POLICY IF EXISTS "shifts_insert_policy" ON shifts;
DROP POLICY IF EXISTS "shifts_update_policy" ON shifts;
DROP POLICY IF EXISTS "shifts_delete_policy" ON shifts;

CREATE POLICY "shifts_select_policy" ON shifts
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR private.is_admin()
    OR private.is_hr()
    OR private.is_manager_or_admin()
  );

CREATE POLICY "shifts_insert_policy" ON shifts
  FOR INSERT TO authenticated
  WITH CHECK (
    private.is_admin()
    OR private.is_hr()
    OR private.is_manager_or_admin()
  );

CREATE POLICY "shifts_update_policy" ON shifts
  FOR UPDATE TO authenticated
  USING (
    private.is_admin()
    OR private.is_hr()
    OR private.is_manager_or_admin()
  )
  WITH CHECK (
    private.is_admin()
    OR private.is_hr()
    OR private.is_manager_or_admin()
  );

CREATE POLICY "shifts_delete_policy" ON shifts
  FOR DELETE TO authenticated
  USING (
    private.is_admin()
    OR private.is_hr()
    OR private.is_manager_or_admin()
  );
