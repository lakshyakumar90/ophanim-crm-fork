-- ============================================================
-- Migration: 083_hr_skills.sql
-- Skills catalog and employee skill matrix
-- ============================================================

CREATE TABLE IF NOT EXISTS skills (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name        VARCHAR(255) NOT NULL,
  category    VARCHAR(100),
  description TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(name, category)
);

CREATE INDEX IF NOT EXISTS idx_skills_category ON skills(category);

CREATE TABLE IF NOT EXISTS employee_skills (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  skill_id        UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  proficiency     VARCHAR(30) DEFAULT 'intermediate'
                  CHECK (proficiency IN ('beginner', 'intermediate', 'advanced', 'expert')),
  certified_until DATE,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, skill_id)
);

CREATE INDEX IF NOT EXISTS idx_employee_skills_user ON employee_skills(user_id);
CREATE INDEX IF NOT EXISTS idx_employee_skills_skill ON employee_skills(skill_id);

ALTER TABLE skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_skills ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "skills_read_authenticated" ON skills;
DROP POLICY IF EXISTS "skills_hr_manage" ON skills;
DROP POLICY IF EXISTS "skills_select_policy" ON skills;
DROP POLICY IF EXISTS "skills_insert_policy" ON skills;
DROP POLICY IF EXISTS "skills_update_policy" ON skills;
DROP POLICY IF EXISTS "skills_delete_policy" ON skills;

CREATE POLICY "skills_select_policy" ON skills
  FOR SELECT TO authenticated
  USING (
    private.is_admin()
    OR private.is_hr()
    OR private.current_user_has_permission('skills:view')
    OR private.current_user_has_permission('skills:manage')
  );

CREATE POLICY "skills_insert_policy" ON skills
  FOR INSERT TO authenticated
  WITH CHECK (
    private.is_admin()
    OR private.is_hr()
    OR private.current_user_has_permission('skills:manage')
  );

CREATE POLICY "skills_update_policy" ON skills
  FOR UPDATE TO authenticated
  USING (
    private.is_admin()
    OR private.is_hr()
    OR private.current_user_has_permission('skills:manage')
  )
  WITH CHECK (
    private.is_admin()
    OR private.is_hr()
    OR private.current_user_has_permission('skills:manage')
  );

CREATE POLICY "skills_delete_policy" ON skills
  FOR DELETE TO authenticated
  USING (
    private.is_admin()
    OR private.is_hr()
    OR private.current_user_has_permission('skills:manage')
  );

DROP POLICY IF EXISTS "employee_skills_read" ON employee_skills;
DROP POLICY IF EXISTS "employee_skills_hr_manage" ON employee_skills;
DROP POLICY IF EXISTS "employee_skills_select_policy" ON employee_skills;
DROP POLICY IF EXISTS "employee_skills_insert_policy" ON employee_skills;
DROP POLICY IF EXISTS "employee_skills_update_policy" ON employee_skills;
DROP POLICY IF EXISTS "employee_skills_delete_policy" ON employee_skills;

CREATE POLICY "employee_skills_select_policy" ON employee_skills
  FOR SELECT TO authenticated
  USING (
    private.is_admin()
    OR private.is_hr()
    OR private.current_user_has_permission('skills:view')
    OR private.current_user_has_permission('skills:manage')
    OR user_id = auth.uid()
  );

CREATE POLICY "employee_skills_insert_policy" ON employee_skills
  FOR INSERT TO authenticated
  WITH CHECK (
    private.is_admin()
    OR private.is_hr()
    OR private.current_user_has_permission('skills:manage')
    OR user_id = auth.uid()
  );

CREATE POLICY "employee_skills_update_policy" ON employee_skills
  FOR UPDATE TO authenticated
  USING (
    private.is_admin()
    OR private.is_hr()
    OR private.current_user_has_permission('skills:manage')
    OR user_id = auth.uid()
  )
  WITH CHECK (
    private.is_admin()
    OR private.is_hr()
    OR private.current_user_has_permission('skills:manage')
    OR user_id = auth.uid()
  );

CREATE POLICY "employee_skills_delete_policy" ON employee_skills
  FOR DELETE TO authenticated
  USING (
    private.is_admin()
    OR private.is_hr()
    OR private.current_user_has_permission('skills:manage')
  );
