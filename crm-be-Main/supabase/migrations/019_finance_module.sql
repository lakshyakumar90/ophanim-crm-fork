-- Finance Module Migration
-- Created: 2026-01-22

-- ============================================
-- ENUMS
-- ============================================

-- Invoice status
CREATE TYPE invoice_status AS ENUM (
  'draft', 'pending_approval', 'sent', 'paid', 'overdue', 'cancelled'
);

-- Payment mode
CREATE TYPE payment_mode AS ENUM (
  'cash', 'bank_transfer', 'upi', 'card', 'cheque', 'other'
);

-- Payment status
CREATE TYPE payment_status AS ENUM ('success', 'pending', 'failed');

-- Expense status
CREATE TYPE expense_status AS ENUM ('pending', 'approved', 'rejected');

-- Approval type
CREATE TYPE approval_type AS ENUM ('invoice', 'expense', 'email');

-- Approval status
CREATE TYPE approval_status AS ENUM ('pending', 'approved', 'rejected');

-- Email type for finance
CREATE TYPE finance_email_type AS ENUM (
  'invoice', 'payment_reminder', 'receipt', 'custom'
);

-- Email request status
CREATE TYPE email_request_status AS ENUM (
  'draft', 'pending_approval', 'approved', 'rejected', 'sent', 'failed'
);

-- Recurring frequency
CREATE TYPE recurring_frequency AS ENUM (
  'weekly', 'monthly', 'quarterly', 'yearly'
);

-- Scheduled email status
CREATE TYPE scheduled_email_status AS ENUM (
  'pending', 'processing', 'sent', 'failed', 'cancelled'
);

-- ============================================
-- EXPENSE CATEGORIES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS expense_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  monthly_budget DECIMAL(15,2),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default categories
INSERT INTO expense_categories (name, description) VALUES
  ('Office Supplies', 'Stationery, furniture, and office equipment'),
  ('Travel', 'Business travel, transportation, and accommodation'),
  ('Software', 'Software licenses, subscriptions, and tools'),
  ('Marketing', 'Advertising, promotions, and marketing campaigns'),
  ('Utilities', 'Electricity, internet, phone bills'),
  ('Equipment', 'Hardware, machinery, and technical equipment'),
  ('Miscellaneous', 'Other uncategorized expenses');

-- ============================================
-- INVOICES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT UNIQUE NOT NULL,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  client_name TEXT NOT NULL,
  client_email TEXT NOT NULL,
  client_phone TEXT,
  client_address TEXT,
  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  subtotal DECIMAL(15,2) NOT NULL DEFAULT 0,
  tax_rate DECIMAL(5,2) DEFAULT 0,
  tax_amount DECIMAL(15,2) DEFAULT 0,
  discount_rate DECIMAL(5,2) DEFAULT 0,
  discount_amount DECIMAL(15,2) DEFAULT 0,
  total_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  amount_paid DECIMAL(15,2) DEFAULT 0,
  status invoice_status DEFAULT 'draft',
  payment_terms TEXT DEFAULT 'Net 30',
  notes TEXT,
  attachments JSONB DEFAULT '[]'::jsonb,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  is_recurring BOOLEAN DEFAULT false,
  recurring_schedule_id UUID,
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for invoices
CREATE INDEX idx_invoices_lead_id ON invoices(lead_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_created_by ON invoices(created_by);
CREATE INDEX idx_invoices_due_date ON invoices(due_date);
CREATE INDEX idx_invoices_department_id ON invoices(department_id);

-- ============================================
-- INVOICE LINE ITEMS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS invoice_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity DECIMAL(10,2) NOT NULL DEFAULT 1,
  unit_price DECIMAL(15,2) NOT NULL DEFAULT 0,
  tax_rate DECIMAL(5,2) DEFAULT 0,
  total DECIMAL(15,2) NOT NULL DEFAULT 0,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for line items
CREATE INDEX idx_invoice_line_items_invoice_id ON invoice_line_items(invoice_id);

-- ============================================
-- PAYMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  amount DECIMAL(15,2) NOT NULL,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_mode payment_mode NOT NULL DEFAULT 'bank_transfer',
  transaction_id TEXT,
  status payment_status DEFAULT 'success',
  notes TEXT,
  recorded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for payments
CREATE INDEX idx_payments_invoice_id ON payments(invoice_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_payment_date ON payments(payment_date);

-- ============================================
-- EXPENSES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_number TEXT UNIQUE NOT NULL,
  category_id UUID REFERENCES expense_categories(id) ON DELETE SET NULL,
  amount DECIMAL(15,2) NOT NULL,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  paid_by UUID REFERENCES users(id) ON DELETE SET NULL,
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  vendor_name TEXT,
  description TEXT NOT NULL,
  receipt_url TEXT,
  status expense_status DEFAULT 'pending',
  submitted_by UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for expenses
CREATE INDEX idx_expenses_category_id ON expenses(category_id);
CREATE INDEX idx_expenses_status ON expenses(status);
CREATE INDEX idx_expenses_department_id ON expenses(department_id);
CREATE INDEX idx_expenses_expense_date ON expenses(expense_date);
CREATE INDEX idx_expenses_submitted_by ON expenses(submitted_by);

-- ============================================
-- FINANCE APPROVALS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS finance_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  approval_type approval_type NOT NULL,
  entity_id UUID NOT NULL,
  requested_by UUID REFERENCES users(id) ON DELETE SET NULL,
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  status approval_status DEFAULT 'pending',
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  comments TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for approvals
CREATE INDEX idx_finance_approvals_type ON finance_approvals(approval_type);
CREATE INDEX idx_finance_approvals_status ON finance_approvals(status);
CREATE INDEX idx_finance_approvals_requested_by ON finance_approvals(requested_by);
CREATE INDEX idx_finance_approvals_entity_id ON finance_approvals(entity_id);

-- ============================================
-- EMAIL REQUESTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS email_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_type finance_email_type NOT NULL DEFAULT 'invoice',
  invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_email TEXT NOT NULL,
  recipient_name TEXT,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  attachments JSONB DEFAULT '[]'::jsonb,
  status email_request_status DEFAULT 'draft',
  scheduled_at TIMESTAMPTZ,
  approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  rejection_reason TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for email requests
CREATE INDEX idx_email_requests_status ON email_requests(status);
CREATE INDEX idx_email_requests_sender_id ON email_requests(sender_id);
CREATE INDEX idx_email_requests_scheduled_at ON email_requests(scheduled_at);
CREATE INDEX idx_email_requests_invoice_id ON email_requests(invoice_id);

-- ============================================
-- RECURRING SCHEDULES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS recurring_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  client_name TEXT NOT NULL,
  client_email TEXT NOT NULL,
  frequency recurring_frequency NOT NULL DEFAULT 'monthly',
  day_of_month INT CHECK (day_of_month >= 1 AND day_of_month <= 28),
  day_of_week INT CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_date DATE NOT NULL,
  end_date DATE,
  next_run_date DATE NOT NULL,
  base_amount DECIMAL(15,2) NOT NULL,
  tax_rate DECIMAL(5,2) DEFAULT 0,
  line_items_template JSONB DEFAULT '[]'::jsonb,
  auto_send_email BOOLEAN DEFAULT false,
  requires_approval BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for recurring schedules
CREATE INDEX idx_recurring_schedules_next_run ON recurring_schedules(next_run_date);
CREATE INDEX idx_recurring_schedules_active ON recurring_schedules(is_active);
CREATE INDEX idx_recurring_schedules_lead_id ON recurring_schedules(lead_id);

-- Add foreign key for invoices -> recurring_schedules
ALTER TABLE invoices 
ADD CONSTRAINT fk_invoices_recurring_schedule 
FOREIGN KEY (recurring_schedule_id) REFERENCES recurring_schedules(id) ON DELETE SET NULL;

-- ============================================
-- SCHEDULED EMAILS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS scheduled_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_request_id UUID NOT NULL REFERENCES email_requests(id) ON DELETE CASCADE,
  scheduled_for TIMESTAMPTZ NOT NULL,
  status scheduled_email_status DEFAULT 'pending',
  attempts INT DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for scheduled emails
CREATE INDEX idx_scheduled_emails_scheduled_for ON scheduled_emails(scheduled_for);
CREATE INDEX idx_scheduled_emails_status ON scheduled_emails(status);

-- ============================================
-- AUTO-GENERATE INVOICE NUMBERS
-- ============================================
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TRIGGER AS $$
DECLARE
  year_part TEXT;
  next_seq INT;
BEGIN
  year_part := EXTRACT(YEAR FROM CURRENT_DATE)::TEXT;
  
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(invoice_number FROM 'INV-' || year_part || '-(\d+)') AS INT)
  ), 0) + 1 INTO next_seq
  FROM invoices
  WHERE invoice_number LIKE 'INV-' || year_part || '-%';
  
  NEW.invoice_number := 'INV-' || year_part || '-' || LPAD(next_seq::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_invoice_number
  BEFORE INSERT ON invoices
  FOR EACH ROW
  WHEN (NEW.invoice_number IS NULL)
  EXECUTE FUNCTION generate_invoice_number();

-- ============================================
-- AUTO-GENERATE EXPENSE NUMBERS
-- ============================================
CREATE OR REPLACE FUNCTION generate_expense_number()
RETURNS TRIGGER AS $$
DECLARE
  year_part TEXT;
  next_seq INT;
BEGIN
  year_part := EXTRACT(YEAR FROM CURRENT_DATE)::TEXT;
  
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(expense_number FROM 'EXP-' || year_part || '-(\d+)') AS INT)
  ), 0) + 1 INTO next_seq
  FROM expenses
  WHERE expense_number LIKE 'EXP-' || year_part || '-%';
  
  NEW.expense_number := 'EXP-' || year_part || '-' || LPAD(next_seq::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_expense_number
  BEFORE INSERT ON expenses
  FOR EACH ROW
  WHEN (NEW.expense_number IS NULL)
  EXECUTE FUNCTION generate_expense_number();

-- ============================================
-- UPDATE INVOICE TOTALS ON LINE ITEM CHANGE
-- ============================================
CREATE OR REPLACE FUNCTION update_invoice_totals()
RETURNS TRIGGER AS $$
DECLARE
  inv_subtotal DECIMAL(15,2);
  inv_tax_rate DECIMAL(5,2);
  inv_discount_rate DECIMAL(5,2);
  inv_tax_amount DECIMAL(15,2);
  inv_discount_amount DECIMAL(15,2);
  inv_total DECIMAL(15,2);
BEGIN
  -- Get the invoice_id from OLD or NEW depending on operation
  DECLARE
    target_invoice_id UUID;
  BEGIN
    IF TG_OP = 'DELETE' THEN
      target_invoice_id := OLD.invoice_id;
    ELSE
      target_invoice_id := NEW.invoice_id;
    END IF;
    
    -- Calculate subtotal from line items
    SELECT COALESCE(SUM(total), 0) INTO inv_subtotal
    FROM invoice_line_items
    WHERE invoice_id = target_invoice_id;
    
    -- Get current tax and discount rates
    SELECT tax_rate, discount_rate INTO inv_tax_rate, inv_discount_rate
    FROM invoices WHERE id = target_invoice_id;
    
    -- Calculate amounts
    inv_discount_amount := inv_subtotal * (COALESCE(inv_discount_rate, 0) / 100);
    inv_tax_amount := (inv_subtotal - inv_discount_amount) * (COALESCE(inv_tax_rate, 0) / 100);
    inv_total := inv_subtotal - inv_discount_amount + inv_tax_amount;
    
    -- Update invoice
    UPDATE invoices SET
      subtotal = inv_subtotal,
      tax_amount = inv_tax_amount,
      discount_amount = inv_discount_amount,
      total_amount = inv_total,
      updated_at = NOW()
    WHERE id = target_invoice_id;
  END;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_invoice_totals
  AFTER INSERT OR UPDATE OR DELETE ON invoice_line_items
  FOR EACH ROW
  EXECUTE FUNCTION update_invoice_totals();

-- ============================================
-- UPDATE INVOICE AMOUNT_PAID ON PAYMENT CHANGE
-- ============================================
CREATE OR REPLACE FUNCTION update_invoice_amount_paid()
RETURNS TRIGGER AS $$
DECLARE
  target_invoice_id UUID;
  total_paid DECIMAL(15,2);
  inv_total DECIMAL(15,2);
  new_status invoice_status;
BEGIN
  IF TG_OP = 'DELETE' THEN
    target_invoice_id := OLD.invoice_id;
  ELSE
    target_invoice_id := NEW.invoice_id;
  END IF;
  
  -- Calculate total successful payments
  SELECT COALESCE(SUM(amount), 0) INTO total_paid
  FROM payments
  WHERE invoice_id = target_invoice_id AND status = 'success';
  
  -- Get invoice total
  SELECT total_amount, status INTO inv_total, new_status
  FROM invoices WHERE id = target_invoice_id;
  
  -- Determine new status based on payment
  IF total_paid >= inv_total AND new_status NOT IN ('draft', 'pending_approval', 'cancelled') THEN
    new_status := 'paid';
  END IF;
  
  -- Update invoice
  UPDATE invoices SET
    amount_paid = total_paid,
    status = new_status,
    updated_at = NOW()
  WHERE id = target_invoice_id;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_invoice_amount_paid
  AFTER INSERT OR UPDATE OR DELETE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION update_invoice_amount_paid();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

-- Enable RLS
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_emails ENABLE ROW LEVEL SECURITY;

-- Policies for expense_categories (all authenticated can read, admin can write)
CREATE POLICY "Anyone can read expense categories"
  ON expense_categories FOR SELECT
  USING (true);

CREATE POLICY "Admin can manage expense categories"
  ON expense_categories FOR ALL
  USING (true);

-- Basic policies for all finance tables (will be enforced in application layer)
CREATE POLICY "Allow all for authenticated users"
  ON invoices FOR ALL USING (true);

CREATE POLICY "Allow all for authenticated users"
  ON invoice_line_items FOR ALL USING (true);

CREATE POLICY "Allow all for authenticated users"
  ON payments FOR ALL USING (true);

CREATE POLICY "Allow all for authenticated users"
  ON expenses FOR ALL USING (true);

CREATE POLICY "Allow all for authenticated users"
  ON finance_approvals FOR ALL USING (true);

CREATE POLICY "Allow all for authenticated users"
  ON email_requests FOR ALL USING (true);

CREATE POLICY "Allow all for authenticated users"
  ON recurring_schedules FOR ALL USING (true);

CREATE POLICY "Allow all for authenticated users"
  ON scheduled_emails FOR ALL USING (true);
