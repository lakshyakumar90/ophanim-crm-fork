-- Add salary band linkage to employee profiles for active package assignment.
ALTER TABLE employee_profiles
  ADD COLUMN IF NOT EXISTS salary_band_id UUID REFERENCES salary_bands(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_employee_profiles_salary_band_id
  ON employee_profiles(salary_band_id);
