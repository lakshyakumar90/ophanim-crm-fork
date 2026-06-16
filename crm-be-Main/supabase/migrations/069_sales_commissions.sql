-- Migration 069: Sales commissions

CREATE TYPE commission_status AS ENUM (
  'pending',
  'approved',
  'paid',
  'cancelled'
);

CREATE TABLE IF NOT EXISTS commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  quote_id UUID REFERENCES quotes(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount DECIMAL(15,2) NOT NULL,
  commission_rate DECIMAL(5,2),
  base_amount DECIMAL(15,2),
  status commission_status DEFAULT 'pending',
  period_start DATE,
  period_end DATE,
  paid_at TIMESTAMPTZ,
  notes TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_commissions_user_id ON commissions(user_id);
CREATE INDEX IF NOT EXISTS idx_commissions_lead_id ON commissions(lead_id);
CREATE INDEX IF NOT EXISTS idx_commissions_quote_id ON commissions(quote_id);
CREATE INDEX IF NOT EXISTS idx_commissions_status ON commissions(status);
CREATE INDEX IF NOT EXISTS idx_commissions_department_id ON commissions(department_id);
CREATE INDEX IF NOT EXISTS idx_commissions_period ON commissions(period_start, period_end);

ALTER TABLE commissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for authenticated users on commissions" ON commissions;
DROP POLICY IF EXISTS "commissions_select_policy" ON commissions;
DROP POLICY IF EXISTS "commissions_insert_policy" ON commissions;
DROP POLICY IF EXISTS "commissions_update_policy" ON commissions;
DROP POLICY IF EXISTS "commissions_delete_policy" ON commissions;

CREATE POLICY "commissions_select_policy" ON commissions
  FOR SELECT TO authenticated
  USING (
    private.is_admin()
    OR private.current_user_has_permission('commissions:view')
    OR private.current_user_has_permission('commissions:manage')
    OR user_id = auth.uid()
  );

CREATE POLICY "commissions_insert_policy" ON commissions
  FOR INSERT TO authenticated
  WITH CHECK (
    private.is_admin()
    OR private.current_user_has_permission('commissions:manage')
  );

CREATE POLICY "commissions_update_policy" ON commissions
  FOR UPDATE TO authenticated
  USING (
    private.is_admin()
    OR private.current_user_has_permission('commissions:manage')
  )
  WITH CHECK (
    private.is_admin()
    OR private.current_user_has_permission('commissions:manage')
  );

CREATE POLICY "commissions_delete_policy" ON commissions
  FOR DELETE TO authenticated
  USING (
    private.is_admin()
    OR private.current_user_has_permission('commissions:manage')
  );
