-- Client portal access tokens for invoice sharing

CREATE TABLE IF NOT EXISTS client_portal_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  revoked_at TIMESTAMPTZ,
  view_count INT NOT NULL DEFAULT 0,
  last_viewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_portal_tokens_token ON client_portal_tokens(token);
CREATE INDEX IF NOT EXISTS idx_client_portal_tokens_invoice_id ON client_portal_tokens(invoice_id);

ALTER TABLE client_portal_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for authenticated users" ON client_portal_tokens;
DROP POLICY IF EXISTS "client_portal_tokens_select_policy" ON client_portal_tokens;
DROP POLICY IF EXISTS "client_portal_tokens_insert_policy" ON client_portal_tokens;
DROP POLICY IF EXISTS "client_portal_tokens_update_policy" ON client_portal_tokens;
DROP POLICY IF EXISTS "client_portal_tokens_delete_policy" ON client_portal_tokens;

CREATE POLICY "client_portal_tokens_select_policy" ON client_portal_tokens
  FOR SELECT TO authenticated
  USING (
    private.is_admin()
    OR private.current_user_has_permission('finance:client_portal')
    OR private.current_user_has_permission('finance:manage')
    OR created_by = auth.uid()
  );

CREATE POLICY "client_portal_tokens_insert_policy" ON client_portal_tokens
  FOR INSERT TO authenticated
  WITH CHECK (
    private.is_admin()
    OR private.current_user_has_permission('finance:client_portal')
    OR private.current_user_has_permission('finance:manage')
    OR created_by = auth.uid()
  );

CREATE POLICY "client_portal_tokens_update_policy" ON client_portal_tokens
  FOR UPDATE TO authenticated
  USING (
    private.is_admin()
    OR private.current_user_has_permission('finance:client_portal')
    OR private.current_user_has_permission('finance:manage')
    OR created_by = auth.uid()
  )
  WITH CHECK (
    private.is_admin()
    OR private.current_user_has_permission('finance:client_portal')
    OR private.current_user_has_permission('finance:manage')
    OR created_by = auth.uid()
  );

CREATE POLICY "client_portal_tokens_delete_policy" ON client_portal_tokens
  FOR DELETE TO authenticated
  USING (
    private.is_admin()
    OR private.current_user_has_permission('finance:manage')
  );
