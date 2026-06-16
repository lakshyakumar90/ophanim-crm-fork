-- Per-line tax fields, invoice exchange rate, and org base currency setting

ALTER TABLE invoice_line_items
ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS hsn_code TEXT;

ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS exchange_rate DECIMAL(15,6) NOT NULL DEFAULT 1;

INSERT INTO settings (category, key, value)
VALUES ('finance', 'base_currency', '"INR"'::jsonb)
ON CONFLICT (category, key) DO NOTHING;
