-- Migration 068: Sales quotes and quote line items

CREATE TYPE quote_status AS ENUM (
  'draft',
  'pending_approval',
  'sent',
  'accepted',
  'rejected',
  'expired',
  'cancelled'
);

CREATE TABLE IF NOT EXISTS quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_number TEXT UNIQUE,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  client_name TEXT NOT NULL,
  client_email TEXT NOT NULL,
  client_phone TEXT,
  client_address TEXT,
  quote_date DATE NOT NULL DEFAULT CURRENT_DATE,
  valid_until DATE,
  subtotal DECIMAL(15,2) NOT NULL DEFAULT 0,
  tax_rate DECIMAL(5,2) DEFAULT 0,
  tax_amount DECIMAL(15,2) DEFAULT 0,
  discount_rate DECIMAL(5,2) DEFAULT 0,
  discount_amount DECIMAL(15,2) DEFAULT 0,
  total_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  status quote_status DEFAULT 'draft',
  payment_terms TEXT DEFAULT 'Net 30',
  notes TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quotes_lead_id ON quotes(lead_id);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON quotes(status);
CREATE INDEX IF NOT EXISTS idx_quotes_created_by ON quotes(created_by);
CREATE INDEX IF NOT EXISTS idx_quotes_department_id ON quotes(department_id);
CREATE INDEX IF NOT EXISTS idx_quotes_quote_date ON quotes(quote_date);

CREATE TABLE IF NOT EXISTS quote_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity DECIMAL(10,2) NOT NULL DEFAULT 1,
  unit_price DECIMAL(15,2) NOT NULL DEFAULT 0,
  tax_rate DECIMAL(5,2) DEFAULT 0,
  total DECIMAL(15,2) NOT NULL DEFAULT 0,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quote_line_items_quote_id ON quote_line_items(quote_id);

CREATE OR REPLACE FUNCTION generate_quote_number()
RETURNS TRIGGER AS $$
DECLARE
  year_part TEXT;
  next_seq INT;
BEGIN
  year_part := EXTRACT(YEAR FROM CURRENT_DATE)::TEXT;

  SELECT COALESCE(MAX(
    CAST(SUBSTRING(quote_number FROM 'QT-' || year_part || '-(\d+)') AS INT)
  ), 0) + 1 INTO next_seq
  FROM quotes
  WHERE quote_number LIKE 'QT-' || year_part || '-%';

  NEW.quote_number := 'QT-' || year_part || '-' || LPAD(next_seq::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_quote_number ON quotes;
CREATE TRIGGER trg_quote_number
  BEFORE INSERT ON quotes
  FOR EACH ROW
  WHEN (NEW.quote_number IS NULL)
  EXECUTE FUNCTION generate_quote_number();

CREATE OR REPLACE FUNCTION update_quote_totals()
RETURNS TRIGGER AS $$
DECLARE
  q_subtotal DECIMAL(15,2);
  q_tax_rate DECIMAL(5,2);
  q_discount_rate DECIMAL(5,2);
  q_tax_amount DECIMAL(15,2);
  q_discount_amount DECIMAL(15,2);
  q_total DECIMAL(15,2);
BEGIN
  SELECT COALESCE(SUM(total), 0) INTO q_subtotal
  FROM quote_line_items
  WHERE quote_id = COALESCE(NEW.quote_id, OLD.quote_id);

  SELECT tax_rate, discount_rate
  INTO q_tax_rate, q_discount_rate
  FROM quotes
  WHERE id = COALESCE(NEW.quote_id, OLD.quote_id);

  q_discount_amount := q_subtotal * (COALESCE(q_discount_rate, 0) / 100);
  q_tax_amount := (q_subtotal - q_discount_amount) * (COALESCE(q_tax_rate, 0) / 100);
  q_total := q_subtotal - q_discount_amount + q_tax_amount;

  UPDATE quotes
  SET
    subtotal = q_subtotal,
    discount_amount = q_discount_amount,
    tax_amount = q_tax_amount,
    total_amount = q_total,
    updated_at = NOW()
  WHERE id = COALESCE(NEW.quote_id, OLD.quote_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_quote_line_items_totals ON quote_line_items;
CREATE TRIGGER trg_quote_line_items_totals
  AFTER INSERT OR UPDATE OR DELETE ON quote_line_items
  FOR EACH ROW
  EXECUTE FUNCTION update_quote_totals();

ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_line_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for authenticated users on quotes" ON quotes;
DROP POLICY IF EXISTS "quotes_select_policy" ON quotes;
DROP POLICY IF EXISTS "quotes_insert_policy" ON quotes;
DROP POLICY IF EXISTS "quotes_update_policy" ON quotes;
DROP POLICY IF EXISTS "quotes_delete_policy" ON quotes;

CREATE POLICY "quotes_select_policy" ON quotes
  FOR SELECT TO authenticated
  USING (
    private.is_admin()
    OR private.current_user_has_permission('quotes:view')
    OR private.current_user_has_permission('quotes:manage')
    OR created_by = auth.uid()
  );

CREATE POLICY "quotes_insert_policy" ON quotes
  FOR INSERT TO authenticated
  WITH CHECK (
    private.is_admin()
    OR private.current_user_has_permission('quotes:manage')
    OR created_by = auth.uid()
  );

CREATE POLICY "quotes_update_policy" ON quotes
  FOR UPDATE TO authenticated
  USING (
    private.is_admin()
    OR private.current_user_has_permission('quotes:manage')
    OR created_by = auth.uid()
  )
  WITH CHECK (
    private.is_admin()
    OR private.current_user_has_permission('quotes:manage')
    OR created_by = auth.uid()
  );

CREATE POLICY "quotes_delete_policy" ON quotes
  FOR DELETE TO authenticated
  USING (
    private.is_admin()
    OR private.current_user_has_permission('quotes:manage')
  );

DROP POLICY IF EXISTS "Allow all for authenticated users on quote_line_items" ON quote_line_items;
DROP POLICY IF EXISTS "quote_line_items_select_policy" ON quote_line_items;
DROP POLICY IF EXISTS "quote_line_items_insert_policy" ON quote_line_items;
DROP POLICY IF EXISTS "quote_line_items_update_policy" ON quote_line_items;
DROP POLICY IF EXISTS "quote_line_items_delete_policy" ON quote_line_items;

CREATE POLICY "quote_line_items_select_policy" ON quote_line_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM quotes q
      WHERE q.id = quote_line_items.quote_id
        AND (
          private.is_admin()
          OR private.current_user_has_permission('quotes:view')
          OR private.current_user_has_permission('quotes:manage')
          OR q.created_by = auth.uid()
        )
    )
  );

CREATE POLICY "quote_line_items_insert_policy" ON quote_line_items
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM quotes q
      WHERE q.id = quote_line_items.quote_id
        AND (
          private.is_admin()
          OR private.current_user_has_permission('quotes:manage')
          OR q.created_by = auth.uid()
        )
    )
  );

CREATE POLICY "quote_line_items_update_policy" ON quote_line_items
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM quotes q
      WHERE q.id = quote_line_items.quote_id
        AND (
          private.is_admin()
          OR private.current_user_has_permission('quotes:manage')
          OR q.created_by = auth.uid()
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM quotes q
      WHERE q.id = quote_line_items.quote_id
        AND (
          private.is_admin()
          OR private.current_user_has_permission('quotes:manage')
          OR q.created_by = auth.uid()
        )
    )
  );

CREATE POLICY "quote_line_items_delete_policy" ON quote_line_items
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM quotes q
      WHERE q.id = quote_line_items.quote_id
        AND (
          private.is_admin()
          OR private.current_user_has_permission('quotes:manage')
        )
    )
  );

ALTER FUNCTION generate_quote_number() SET search_path = public;
ALTER FUNCTION update_quote_totals() SET search_path = public;
