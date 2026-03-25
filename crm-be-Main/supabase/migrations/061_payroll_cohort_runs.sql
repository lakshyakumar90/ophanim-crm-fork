-- Allow multiple non-correction payroll runs in the same month by cohort
-- and keep same-cohort uniqueness.

ALTER TABLE payroll_runs
  ADD COLUMN IF NOT EXISTS cohort_name VARCHAR(120),
  ADD COLUMN IF NOT EXISTS employee_selection JSONB DEFAULT '{"type":"all"}'::jsonb;

ALTER TABLE payroll_runs
  DROP CONSTRAINT IF EXISTS payroll_runs_month_is_correction_original_run_id_key;

DROP INDEX IF EXISTS idx_payroll_runs_month_cohort_non_correction;
CREATE UNIQUE INDEX idx_payroll_runs_month_cohort_non_correction
  ON payroll_runs (month, COALESCE(cohort_name, '__all__'))
  WHERE is_correction = FALSE;
