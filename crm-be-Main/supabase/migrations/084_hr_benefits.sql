-- ============================================================
-- Migration: 084_hr_benefits.sql
-- Benefit plans and employee enrollments
-- ============================================================

CREATE TABLE IF NOT EXISTS benefit_plans (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name                VARCHAR(255) NOT NULL,
  description         TEXT,
  eligibility_rules   JSONB DEFAULT '{}'::jsonb,
  is_active           BOOLEAN DEFAULT TRUE,
  created_by          UUID REFERENCES users(id),
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_benefit_plans_active ON benefit_plans(is_active);

CREATE TABLE IF NOT EXISTS benefit_enrollments (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id       UUID NOT NULL REFERENCES benefit_plans(id) ON DELETE CASCADE,
  status        VARCHAR(30) DEFAULT 'pending'
                CHECK (status IN ('pending', 'active', 'cancelled', 'expired')),
  enrolled_at   TIMESTAMPTZ DEFAULT NOW(),
  cancelled_at  TIMESTAMPTZ,
  notes         TEXT,
  created_by    UUID REFERENCES users(id),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, plan_id)
);

CREATE INDEX IF NOT EXISTS idx_benefit_enrollments_user ON benefit_enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_benefit_enrollments_plan ON benefit_enrollments(plan_id);
CREATE INDEX IF NOT EXISTS idx_benefit_enrollments_status ON benefit_enrollments(status);

ALTER TABLE benefit_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE benefit_enrollments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "benefit_plans_read_authenticated" ON benefit_plans;
DROP POLICY IF EXISTS "benefit_plans_hr_manage" ON benefit_plans;
DROP POLICY IF EXISTS "benefit_plans_select_policy" ON benefit_plans;
DROP POLICY IF EXISTS "benefit_plans_insert_policy" ON benefit_plans;
DROP POLICY IF EXISTS "benefit_plans_update_policy" ON benefit_plans;
DROP POLICY IF EXISTS "benefit_plans_delete_policy" ON benefit_plans;

CREATE POLICY "benefit_plans_select_policy" ON benefit_plans
  FOR SELECT TO authenticated
  USING (
    private.is_admin()
    OR private.is_hr()
    OR private.current_user_has_permission('benefits:view')
    OR private.current_user_has_permission('benefits:manage')
    OR is_active = true
  );

CREATE POLICY "benefit_plans_insert_policy" ON benefit_plans
  FOR INSERT TO authenticated
  WITH CHECK (
    private.is_admin()
    OR private.is_hr()
    OR private.current_user_has_permission('benefits:manage')
  );

CREATE POLICY "benefit_plans_update_policy" ON benefit_plans
  FOR UPDATE TO authenticated
  USING (
    private.is_admin()
    OR private.is_hr()
    OR private.current_user_has_permission('benefits:manage')
  )
  WITH CHECK (
    private.is_admin()
    OR private.is_hr()
    OR private.current_user_has_permission('benefits:manage')
  );

CREATE POLICY "benefit_plans_delete_policy" ON benefit_plans
  FOR DELETE TO authenticated
  USING (
    private.is_admin()
    OR private.is_hr()
    OR private.current_user_has_permission('benefits:manage')
  );

DROP POLICY IF EXISTS "benefit_enrollments_own_read" ON benefit_enrollments;
DROP POLICY IF EXISTS "benefit_enrollments_hr_manage" ON benefit_enrollments;
DROP POLICY IF EXISTS "benefit_enrollments_select_policy" ON benefit_enrollments;
DROP POLICY IF EXISTS "benefit_enrollments_insert_policy" ON benefit_enrollments;
DROP POLICY IF EXISTS "benefit_enrollments_update_policy" ON benefit_enrollments;
DROP POLICY IF EXISTS "benefit_enrollments_delete_policy" ON benefit_enrollments;

CREATE POLICY "benefit_enrollments_select_policy" ON benefit_enrollments
  FOR SELECT TO authenticated
  USING (
    private.is_admin()
    OR private.is_hr()
    OR private.current_user_has_permission('benefits:view')
    OR private.current_user_has_permission('benefits:manage')
    OR user_id = auth.uid()
  );

CREATE POLICY "benefit_enrollments_insert_policy" ON benefit_enrollments
  FOR INSERT TO authenticated
  WITH CHECK (
    private.is_admin()
    OR private.is_hr()
    OR private.current_user_has_permission('benefits:manage')
    OR user_id = auth.uid()
  );

CREATE POLICY "benefit_enrollments_update_policy" ON benefit_enrollments
  FOR UPDATE TO authenticated
  USING (
    private.is_admin()
    OR private.is_hr()
    OR private.current_user_has_permission('benefits:manage')
    OR user_id = auth.uid()
  )
  WITH CHECK (
    private.is_admin()
    OR private.is_hr()
    OR private.current_user_has_permission('benefits:manage')
    OR user_id = auth.uid()
  );

CREATE POLICY "benefit_enrollments_delete_policy" ON benefit_enrollments
  FOR DELETE TO authenticated
  USING (
    private.is_admin()
    OR private.is_hr()
    OR private.current_user_has_permission('benefits:manage')
  );
