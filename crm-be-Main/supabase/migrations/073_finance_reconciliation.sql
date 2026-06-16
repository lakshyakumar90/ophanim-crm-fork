-- Bank transaction reconciliation

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'bank_transaction_type') THEN
    CREATE TYPE bank_transaction_type AS ENUM ('credit', 'debit');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'bank_transaction_status') THEN
    CREATE TYPE bank_transaction_status AS ENUM ('unmatched', 'matched', 'ignored');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS bank_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_date DATE NOT NULL,
  description TEXT NOT NULL,
  amount DECIMAL(15,2) NOT NULL CHECK (amount > 0),
  transaction_type bank_transaction_type NOT NULL,
  reference TEXT,
  bank_account TEXT,
  payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
  expense_id UUID REFERENCES expenses(id) ON DELETE SET NULL,
  status bank_transaction_status NOT NULL DEFAULT 'unmatched',
  imported_by UUID REFERENCES users(id) ON DELETE SET NULL,
  matched_by UUID REFERENCES users(id) ON DELETE SET NULL,
  matched_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bank_transactions_date ON bank_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_status ON bank_transactions(status);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_payment_id ON bank_transactions(payment_id);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_expense_id ON bank_transactions(expense_id);

ALTER TABLE bank_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for authenticated users" ON bank_transactions;
DROP POLICY IF EXISTS "bank_transactions_select_policy" ON bank_transactions;
DROP POLICY IF EXISTS "bank_transactions_insert_policy" ON bank_transactions;
DROP POLICY IF EXISTS "bank_transactions_update_policy" ON bank_transactions;
DROP POLICY IF EXISTS "bank_transactions_delete_policy" ON bank_transactions;

CREATE POLICY "bank_transactions_select_policy" ON bank_transactions
  FOR SELECT TO authenticated
  USING (
    private.is_admin()
    OR private.current_user_has_permission('finance:view')
    OR private.current_user_has_permission('finance:manage')
  );

CREATE POLICY "bank_transactions_insert_policy" ON bank_transactions
  FOR INSERT TO authenticated
  WITH CHECK (
    private.is_admin()
    OR private.current_user_has_permission('finance:manage')
  );

CREATE POLICY "bank_transactions_update_policy" ON bank_transactions
  FOR UPDATE TO authenticated
  USING (
    private.is_admin()
    OR private.current_user_has_permission('finance:manage')
  )
  WITH CHECK (
    private.is_admin()
    OR private.current_user_has_permission('finance:manage')
  );

CREATE POLICY "bank_transactions_delete_policy" ON bank_transactions
  FOR DELETE TO authenticated
  USING (
    private.is_admin()
    OR private.current_user_has_permission('finance:manage')
  );
