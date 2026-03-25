-- Configurable HR document types (slug used in employee_documents.document_type)

CREATE TABLE IF NOT EXISTS hr_document_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  description TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hr_document_types_active ON hr_document_types (is_active, sort_order);

INSERT INTO hr_document_types (slug, label, sort_order) VALUES
  ('aadhar', 'Aadhar', 10),
  ('pan', 'PAN', 20),
  ('passport', 'Passport', 30),
  ('driving_license', 'Driving license', 40),
  ('offer_letter', 'Offer letter', 50),
  ('contract', 'Contract', 60),
  ('nda', 'NDA', 70),
  ('resignation', 'Resignation', 80),
  ('bank_details', 'Bank details', 90),
  ('salary_slip', 'Salary slip', 100),
  ('tax_form', 'Tax form', 110),
  ('education', 'Education', 120),
  ('certification', 'Certification', 130),
  ('experience_letter', 'Experience letter', 140),
  ('photo', 'Photo', 150),
  ('other', 'Other', 999)
ON CONFLICT (slug) DO NOTHING;

-- Allow any document_type that exists in hr_document_types (enforced in app on write);
-- drop legacy CHECK so new slugs can be added via hr_document_types.
ALTER TABLE employee_documents DROP CONSTRAINT IF EXISTS employee_documents_document_type_check;

COMMENT ON TABLE hr_document_types IS 'HR-configurable document categories; slug stored on employee_documents.document_type';
