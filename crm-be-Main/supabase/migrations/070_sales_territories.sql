-- Migration 070: Sales territories and lead territory assignment

CREATE TABLE IF NOT EXISTS territories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  region TEXT,
  manager_id UUID REFERENCES users(id) ON DELETE SET NULL,
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_territories_manager_id ON territories(manager_id);
CREATE INDEX IF NOT EXISTS idx_territories_department_id ON territories(department_id);
CREATE INDEX IF NOT EXISTS idx_territories_is_active ON territories(is_active);

CREATE TABLE IF NOT EXISTS territory_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  territory_id UUID NOT NULL REFERENCES territories(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (territory_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_territory_members_territory_id ON territory_members(territory_id);
CREATE INDEX IF NOT EXISTS idx_territory_members_user_id ON territory_members(user_id);

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS territory_id UUID REFERENCES territories(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_leads_territory_id ON leads(territory_id);

ALTER TABLE territories ENABLE ROW LEVEL SECURITY;
ALTER TABLE territory_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for authenticated users on territories" ON territories;
DROP POLICY IF EXISTS "territories_select_policy" ON territories;
DROP POLICY IF EXISTS "territories_insert_policy" ON territories;
DROP POLICY IF EXISTS "territories_update_policy" ON territories;
DROP POLICY IF EXISTS "territories_delete_policy" ON territories;

CREATE POLICY "territories_select_policy" ON territories
  FOR SELECT TO authenticated
  USING (
    private.is_admin()
    OR private.is_manager_or_admin()
    OR manager_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM territory_members tm
      WHERE tm.territory_id = territories.id AND tm.user_id = auth.uid()
    )
  );

CREATE POLICY "territories_insert_policy" ON territories
  FOR INSERT TO authenticated
  WITH CHECK (private.is_admin() OR private.is_manager_or_admin());

CREATE POLICY "territories_update_policy" ON territories
  FOR UPDATE TO authenticated
  USING (private.is_admin() OR private.is_manager_or_admin() OR manager_id = auth.uid())
  WITH CHECK (private.is_admin() OR private.is_manager_or_admin() OR manager_id = auth.uid());

CREATE POLICY "territories_delete_policy" ON territories
  FOR DELETE TO authenticated
  USING (private.is_admin());

DROP POLICY IF EXISTS "Allow all for authenticated users on territory_members" ON territory_members;
DROP POLICY IF EXISTS "territory_members_select_policy" ON territory_members;
DROP POLICY IF EXISTS "territory_members_insert_policy" ON territory_members;
DROP POLICY IF EXISTS "territory_members_update_policy" ON territory_members;
DROP POLICY IF EXISTS "territory_members_delete_policy" ON territory_members;

CREATE POLICY "territory_members_select_policy" ON territory_members
  FOR SELECT TO authenticated
  USING (
    private.is_admin()
    OR private.is_manager_or_admin()
    OR user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM territories t
      WHERE t.id = territory_members.territory_id AND t.manager_id = auth.uid()
    )
  );

CREATE POLICY "territory_members_insert_policy" ON territory_members
  FOR INSERT TO authenticated
  WITH CHECK (private.is_admin() OR private.is_manager_or_admin());

CREATE POLICY "territory_members_update_policy" ON territory_members
  FOR UPDATE TO authenticated
  USING (private.is_admin() OR private.is_manager_or_admin())
  WITH CHECK (private.is_admin() OR private.is_manager_or_admin());

CREATE POLICY "territory_members_delete_policy" ON territory_members
  FOR DELETE TO authenticated
  USING (private.is_admin() OR private.is_manager_or_admin());
