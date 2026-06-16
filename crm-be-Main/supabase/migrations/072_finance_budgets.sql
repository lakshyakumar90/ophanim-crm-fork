-- Finance budgets and budget line items

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'budget_status') THEN
    CREATE TYPE budget_status AS ENUM ('draft', 'active', 'closed');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'budget_period') THEN
    CREATE TYPE budget_period AS ENUM ('monthly', 'quarterly', 'yearly');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  fiscal_year INT NOT NULL,
  period budget_period NOT NULL DEFAULT 'yearly',
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  status budget_status NOT NULL DEFAULT 'draft',
  currency invoice_currency NOT NULL DEFAULT 'INR',
  total_allocated DECIMAL(15,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (period_end >= period_start)
);

CREATE TABLE IF NOT EXISTS budget_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id UUID NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
  category_id UUID REFERENCES expense_categories(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  allocated_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  notes TEXT,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_budgets_department_id ON budgets(department_id);
CREATE INDEX IF NOT EXISTS idx_budgets_status ON budgets(status);
CREATE INDEX IF NOT EXISTS idx_budgets_period ON budgets(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_budget_lines_budget_id ON budget_lines(budget_id);
CREATE INDEX IF NOT EXISTS idx_budget_lines_category_id ON budget_lines(category_id);

CREATE OR REPLACE FUNCTION update_budget_total_allocated()
RETURNS TRIGGER AS $$
DECLARE
  target_budget_id UUID;
  line_total DECIMAL(15,2);
BEGIN
  IF TG_OP = 'DELETE' THEN
    target_budget_id := OLD.budget_id;
  ELSE
    target_budget_id := NEW.budget_id;
  END IF;

  SELECT COALESCE(SUM(allocated_amount), 0) INTO line_total
  FROM budget_lines
  WHERE budget_id = target_budget_id;

  UPDATE budgets
  SET total_allocated = line_total, updated_at = NOW()
  WHERE id = target_budget_id;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_budget_total_allocated ON budget_lines;
CREATE TRIGGER trg_update_budget_total_allocated
  AFTER INSERT OR UPDATE OR DELETE ON budget_lines
  FOR EACH ROW
  EXECUTE FUNCTION update_budget_total_allocated();

ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_lines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for authenticated users" ON budgets;
DROP POLICY IF EXISTS "budgets_select_policy" ON budgets;
DROP POLICY IF EXISTS "budgets_insert_policy" ON budgets;
DROP POLICY IF EXISTS "budgets_update_policy" ON budgets;
DROP POLICY IF EXISTS "budgets_delete_policy" ON budgets;

CREATE POLICY "budgets_select_policy" ON budgets
  FOR SELECT TO authenticated
  USING (
    private.is_admin()
    OR private.current_user_has_permission('budgets:view')
    OR private.current_user_has_permission('budgets:manage')
    OR created_by = auth.uid()
  );

CREATE POLICY "budgets_insert_policy" ON budgets
  FOR INSERT TO authenticated
  WITH CHECK (
    private.is_admin()
    OR private.current_user_has_permission('budgets:manage')
    OR created_by = auth.uid()
  );

CREATE POLICY "budgets_update_policy" ON budgets
  FOR UPDATE TO authenticated
  USING (
    private.is_admin()
    OR private.current_user_has_permission('budgets:manage')
    OR created_by = auth.uid()
  )
  WITH CHECK (
    private.is_admin()
    OR private.current_user_has_permission('budgets:manage')
    OR created_by = auth.uid()
  );

CREATE POLICY "budgets_delete_policy" ON budgets
  FOR DELETE TO authenticated
  USING (
    private.is_admin()
    OR private.current_user_has_permission('budgets:manage')
  );

DROP POLICY IF EXISTS "Allow all for authenticated users" ON budget_lines;
DROP POLICY IF EXISTS "budget_lines_select_policy" ON budget_lines;
DROP POLICY IF EXISTS "budget_lines_insert_policy" ON budget_lines;
DROP POLICY IF EXISTS "budget_lines_update_policy" ON budget_lines;
DROP POLICY IF EXISTS "budget_lines_delete_policy" ON budget_lines;

CREATE POLICY "budget_lines_select_policy" ON budget_lines
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM budgets b
      WHERE b.id = budget_lines.budget_id
        AND (
          private.is_admin()
          OR private.current_user_has_permission('budgets:view')
          OR private.current_user_has_permission('budgets:manage')
          OR b.created_by = auth.uid()
        )
    )
  );

CREATE POLICY "budget_lines_insert_policy" ON budget_lines
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM budgets b
      WHERE b.id = budget_lines.budget_id
        AND (
          private.is_admin()
          OR private.current_user_has_permission('budgets:manage')
          OR b.created_by = auth.uid()
        )
    )
  );

CREATE POLICY "budget_lines_update_policy" ON budget_lines
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM budgets b
      WHERE b.id = budget_lines.budget_id
        AND (
          private.is_admin()
          OR private.current_user_has_permission('budgets:manage')
          OR b.created_by = auth.uid()
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM budgets b
      WHERE b.id = budget_lines.budget_id
        AND (
          private.is_admin()
          OR private.current_user_has_permission('budgets:manage')
          OR b.created_by = auth.uid()
        )
    )
  );

CREATE POLICY "budget_lines_delete_policy" ON budget_lines
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM budgets b
      WHERE b.id = budget_lines.budget_id
        AND (
          private.is_admin()
          OR private.current_user_has_permission('budgets:manage')
        )
    )
  );

ALTER FUNCTION update_budget_total_allocated() SET search_path = public;
