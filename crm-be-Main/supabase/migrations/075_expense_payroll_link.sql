-- Link reimbursed expenses to payroll records

ALTER TABLE expenses
ADD COLUMN IF NOT EXISTS reimbursement_payroll_record_id UUID
  REFERENCES payroll_records(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_expenses_reimbursement_payroll
  ON expenses(reimbursement_payroll_record_id);
