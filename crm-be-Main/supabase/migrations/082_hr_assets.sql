-- ============================================================
-- Migration: 082_hr_assets.sql
-- Company assets and assignment history
-- ============================================================

CREATE TABLE IF NOT EXISTS assets (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name              VARCHAR(255) NOT NULL,
  serial_number     VARCHAR(100),
  category          VARCHAR(100),
  assigned_user_id  UUID REFERENCES users(id) ON DELETE SET NULL,
  status            VARCHAR(30) DEFAULT 'available'
                    CHECK (status IN ('available', 'assigned', 'maintenance', 'retired')),
  purchased_at      DATE,
  warranty_until    DATE,
  notes             TEXT,
  created_by        UUID REFERENCES users(id),
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_assets_status ON assets(status);
CREATE INDEX IF NOT EXISTS idx_assets_assigned_user ON assets(assigned_user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_assets_serial_number
  ON assets(serial_number) WHERE serial_number IS NOT NULL;

CREATE TABLE IF NOT EXISTS asset_assignments (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_id      UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_at   TIMESTAMPTZ DEFAULT NOW(),
  returned_at   TIMESTAMPTZ,
  assigned_by   UUID REFERENCES users(id),
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_asset_assignments_asset ON asset_assignments(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_assignments_user ON asset_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_asset_assignments_active
  ON asset_assignments(asset_id) WHERE returned_at IS NULL;

ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "assets_read_authenticated" ON assets;
DROP POLICY IF EXISTS "assets_hr_manage" ON assets;
DROP POLICY IF EXISTS "assets_select_policy" ON assets;
DROP POLICY IF EXISTS "assets_insert_policy" ON assets;
DROP POLICY IF EXISTS "assets_update_policy" ON assets;
DROP POLICY IF EXISTS "assets_delete_policy" ON assets;

CREATE POLICY "assets_select_policy" ON assets
  FOR SELECT TO authenticated
  USING (
    private.is_admin()
    OR private.is_hr()
    OR private.current_user_has_permission('assets:view')
    OR private.current_user_has_permission('assets:manage')
    OR assigned_user_id = auth.uid()
  );

CREATE POLICY "assets_insert_policy" ON assets
  FOR INSERT TO authenticated
  WITH CHECK (
    private.is_admin()
    OR private.is_hr()
    OR private.current_user_has_permission('assets:manage')
  );

CREATE POLICY "assets_update_policy" ON assets
  FOR UPDATE TO authenticated
  USING (
    private.is_admin()
    OR private.is_hr()
    OR private.current_user_has_permission('assets:manage')
  )
  WITH CHECK (
    private.is_admin()
    OR private.is_hr()
    OR private.current_user_has_permission('assets:manage')
  );

CREATE POLICY "assets_delete_policy" ON assets
  FOR DELETE TO authenticated
  USING (
    private.is_admin()
    OR private.is_hr()
    OR private.current_user_has_permission('assets:manage')
  );

DROP POLICY IF EXISTS "asset_assignments_read_authenticated" ON asset_assignments;
DROP POLICY IF EXISTS "asset_assignments_hr_manage" ON asset_assignments;
DROP POLICY IF EXISTS "asset_assignments_select_policy" ON asset_assignments;
DROP POLICY IF EXISTS "asset_assignments_insert_policy" ON asset_assignments;
DROP POLICY IF EXISTS "asset_assignments_update_policy" ON asset_assignments;
DROP POLICY IF EXISTS "asset_assignments_delete_policy" ON asset_assignments;

CREATE POLICY "asset_assignments_select_policy" ON asset_assignments
  FOR SELECT TO authenticated
  USING (
    private.is_admin()
    OR private.is_hr()
    OR private.current_user_has_permission('assets:view')
    OR private.current_user_has_permission('assets:manage')
    OR user_id = auth.uid()
  );

CREATE POLICY "asset_assignments_insert_policy" ON asset_assignments
  FOR INSERT TO authenticated
  WITH CHECK (
    private.is_admin()
    OR private.is_hr()
    OR private.current_user_has_permission('assets:manage')
  );

CREATE POLICY "asset_assignments_update_policy" ON asset_assignments
  FOR UPDATE TO authenticated
  USING (
    private.is_admin()
    OR private.is_hr()
    OR private.current_user_has_permission('assets:manage')
  )
  WITH CHECK (
    private.is_admin()
    OR private.is_hr()
    OR private.current_user_has_permission('assets:manage')
  );

CREATE POLICY "asset_assignments_delete_policy" ON asset_assignments
  FOR DELETE TO authenticated
  USING (
    private.is_admin()
    OR private.is_hr()
    OR private.current_user_has_permission('assets:manage')
  );
