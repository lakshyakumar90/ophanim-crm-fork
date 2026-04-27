-- Invoice and payment enhancements
-- - currency support on invoices
-- - richer invoice line items (service/plan/original amount/item discount)
-- - payment proof file metadata
-- - expanded payment modes (paypal/stripe/credit/debit cards)
-- - storage bucket for payment proofs

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'invoice_currency'
  ) THEN
    CREATE TYPE invoice_currency AS ENUM ('USD', 'CAD', 'GBP', 'EUR', 'INR');
  END IF;
END $$;

ALTER TYPE payment_mode ADD VALUE IF NOT EXISTS 'paypal';
ALTER TYPE payment_mode ADD VALUE IF NOT EXISTS 'stripe';
ALTER TYPE payment_mode ADD VALUE IF NOT EXISTS 'credit_card';
ALTER TYPE payment_mode ADD VALUE IF NOT EXISTS 'debit_card';

ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS currency invoice_currency NOT NULL DEFAULT 'INR';

ALTER TABLE invoice_line_items
ADD COLUMN IF NOT EXISTS service_name TEXT,
ADD COLUMN IF NOT EXISTS plan_name TEXT,
ADD COLUMN IF NOT EXISTS original_amount DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS item_discount_type TEXT NOT NULL DEFAULT 'none',
ADD COLUMN IF NOT EXISTS item_discount_value DECIMAL(15,2) NOT NULL DEFAULT 0;

ALTER TABLE invoice_line_items
DROP CONSTRAINT IF EXISTS invoice_line_items_item_discount_type_check;

ALTER TABLE invoice_line_items
ADD CONSTRAINT invoice_line_items_item_discount_type_check
CHECK (item_discount_type IN ('none', 'percentage', 'fixed'));

ALTER TABLE payments
ADD COLUMN IF NOT EXISTS transaction_proof_url TEXT,
ADD COLUMN IF NOT EXISTS transaction_proof_name TEXT;

INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-proofs', 'payment-proofs', true)
ON CONFLICT (id) DO NOTHING;
