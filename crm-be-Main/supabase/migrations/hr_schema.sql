-- =====================================================
-- HR DEPARTMENT - COMPLETE SUPABASE SCHEMA
-- Run this SQL in Supabase SQL Editor
-- =====================================================

-- ===================
-- 1. HR DEPARTMENT
-- ===================
INSERT INTO departments (name, slug, description, icon, color)
VALUES ('Human Resources', 'hr', 'HR Department - Employee management, attendance oversight, leaves, and documents', 'Users', '#8B5CF6')
ON CONFLICT (slug) DO NOTHING;

-- ===================
-- 2. LEAVE TYPES TABLE
-- ===================
CREATE TABLE IF NOT EXISTS leave_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  days_allowed INTEGER NOT NULL DEFAULT 0,
  is_paid BOOLEAN DEFAULT TRUE,
  is_active BOOLEAN DEFAULT TRUE,
  carry_forward BOOLEAN DEFAULT FALSE,
  max_carry_forward_days INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default leave types
INSERT INTO leave_types (name, description, days_allowed, is_paid, carry_forward) VALUES
  ('Casual Leave', 'Personal time off for personal matters', 12, TRUE, FALSE),
  ('Sick Leave', 'Medical leave for illness', 10, TRUE, FALSE),
  ('Earned Leave', 'Accumulated leave that can be carried forward', 15, TRUE, TRUE),
  ('Maternity Leave', 'Leave for childbirth and care', 180, TRUE, FALSE),
  ('Paternity Leave', 'Leave for fathers after childbirth', 15, TRUE, FALSE),
  ('Unpaid Leave', 'Leave without pay', 0, FALSE, FALSE),
  ('Compensatory Off', 'Off day for working on holidays', 0, TRUE, FALSE),
  ('Bereavement Leave', 'Leave due to death in family', 5, TRUE, FALSE)
ON CONFLICT (name) DO NOTHING;

-- ===================
-- 3. LEAVE REQUESTS TABLE
-- ===================
CREATE TABLE IF NOT EXISTS leave_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  leave_type_id UUID REFERENCES leave_types(id) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_days NUMERIC(5,1) GENERATED ALWAYS AS (
    CASE 
      WHEN start_date = end_date THEN 1
      ELSE (end_date - start_date + 1)::NUMERIC
    END
  ) STORED,
  reason TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'manager_approved', 'approved', 'rejected', 'cancelled')),
  
  -- Manager approval (optional, for team lead flow)
  manager_id UUID REFERENCES users(id),
  manager_approved_at TIMESTAMPTZ,
  manager_notes TEXT,
  
  -- HR approval (final)
  hr_approved_by UUID REFERENCES users(id),
  hr_approved_at TIMESTAMPTZ,
  hr_notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_leave_requests_user_id ON leave_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON leave_requests(status);
CREATE INDEX IF NOT EXISTS idx_leave_requests_dates ON leave_requests(start_date, end_date);

-- ===================
-- 4. LEAVE BALANCES TABLE
-- ===================
CREATE TABLE IF NOT EXISTS leave_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  leave_type_id UUID REFERENCES leave_types(id) NOT NULL,
  year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM NOW()),
  total_days NUMERIC(5,1) NOT NULL DEFAULT 0,
  used_days NUMERIC(5,1) NOT NULL DEFAULT 0,
  remaining_days NUMERIC(5,1) GENERATED ALWAYS AS (total_days - used_days) STORED,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, leave_type_id, year)
);

CREATE INDEX IF NOT EXISTS idx_leave_balances_user_year ON leave_balances(user_id, year);

-- ===================
-- 5. EMPLOYEE DOCUMENTS TABLE
-- ===================
CREATE TABLE IF NOT EXISTS employee_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  document_type TEXT NOT NULL CHECK (document_type IN (
    'aadhar', 'pan', 'passport', 'driving_license',
    'offer_letter', 'contract', 'nda', 'resignation',
    'bank_details', 'salary_slip', 'tax_form',
    'education', 'certification', 'experience_letter',
    'photo', 'other'
  )),
  document_name TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER, -- in bytes
  mime_type TEXT,
  is_verified BOOLEAN DEFAULT FALSE,
  verified_by UUID REFERENCES users(id),
  verified_at TIMESTAMPTZ,
  expiry_date DATE, -- for documents that expire
  notes TEXT,
  uploaded_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_employee_documents_user_id ON employee_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_employee_documents_type ON employee_documents(document_type);

-- ===================
-- 6. EMPLOYEE DETAILS TABLE (Extended HR info)
-- ===================
CREATE TABLE IF NOT EXISTS employee_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  
  -- Personal Information
  date_of_birth DATE,
  gender TEXT CHECK (gender IN ('male', 'female', 'other')),
  blood_group TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  emergency_contact_relation TEXT,
  
  -- Address
  permanent_address TEXT,
  current_address TEXT,
  city TEXT,
  state TEXT,
  country TEXT DEFAULT 'India',
  postal_code TEXT,
  
  -- Employment Details
  employee_code TEXT UNIQUE,
  date_of_joining DATE,
  probation_end_date DATE,
  employment_type TEXT DEFAULT 'full_time' CHECK (employment_type IN ('full_time', 'part_time', 'contract', 'intern')),
  reporting_manager_id UUID REFERENCES users(id),
  
  -- Notice Period
  notice_period_days INTEGER DEFAULT 30,
  resignation_date DATE,
  last_working_date DATE,
  exit_reason TEXT,
  
  -- Bank Details (encrypted in production)
  bank_name TEXT,
  bank_account_number TEXT,
  ifsc_code TEXT,
  pan_number TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_employee_details_user_id ON employee_details(user_id);
CREATE INDEX IF NOT EXISTS idx_employee_details_employee_code ON employee_details(employee_code);

-- ===================
-- 7. VIEW: HR EMPLOYEE DIRECTORY
-- ===================
CREATE OR REPLACE VIEW hr_employee_directory AS
SELECT 
  u.id,
  u.full_name,
  u.email,
  u.role,
  u.is_active,
  u.avatar_url,
  u.job_title,
  u.created_at,
  t.id AS team_id,
  t.name AS team_name,
  d.id AS department_id,
  d.name AS department_name,
  d.slug AS department_slug,
  ed.employee_code,
  ed.date_of_joining,
  ed.employment_type,
  rm.full_name AS reporting_manager_name
FROM users u
LEFT JOIN teams t ON u.team_id = t.id
LEFT JOIN departments d ON t.department_id = d.id
LEFT JOIN employee_details ed ON u.id = ed.user_id
LEFT JOIN users rm ON ed.reporting_manager_id = rm.id
ORDER BY u.full_name;

-- ===================
-- 8. VIEW: LEAVE SUMMARY
-- ===================
CREATE OR REPLACE VIEW leave_summary AS
SELECT 
  lr.id,
  lr.user_id,
  u.full_name AS employee_name,
  u.email AS employee_email,
  lt.name AS leave_type,
  lt.is_paid,
  lr.start_date,
  lr.end_date,
  lr.total_days,
  lr.reason,
  lr.status,
  lr.manager_id,
  m.full_name AS manager_name,
  lr.manager_approved_at,
  lr.hr_approved_by,
  hr.full_name AS hr_approver_name,
  lr.hr_approved_at,
  lr.created_at
FROM leave_requests lr
JOIN users u ON lr.user_id = u.id
JOIN leave_types lt ON lr.leave_type_id = lt.id
LEFT JOIN users m ON lr.manager_id = m.id
LEFT JOIN users hr ON lr.hr_approved_by = hr.id
ORDER BY lr.created_at DESC;

-- ===================
-- 9. FUNCTION: Initialize Leave Balances for New Year
-- ===================
CREATE OR REPLACE FUNCTION initialize_leave_balances(target_year INTEGER DEFAULT NULL)
RETURNS void AS $$
DECLARE
  yr INTEGER := COALESCE(target_year, EXTRACT(YEAR FROM NOW())::INTEGER);
BEGIN
  -- Insert leave balances for all active users and all active leave types
  INSERT INTO leave_balances (user_id, leave_type_id, year, total_days)
  SELECT u.id, lt.id, yr, lt.days_allowed
  FROM users u
  CROSS JOIN leave_types lt
  WHERE u.is_active = TRUE AND lt.is_active = TRUE
  ON CONFLICT (user_id, leave_type_id, year) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- Initialize for current year
SELECT initialize_leave_balances();

-- ===================
-- 10. FUNCTION: Update Leave Balance on Request Approval
-- ===================
CREATE OR REPLACE FUNCTION update_leave_balance_on_approval()
RETURNS TRIGGER AS $$
BEGIN
  -- When leave request is approved, deduct from balance
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    UPDATE leave_balances
    SET used_days = used_days + NEW.total_days,
        updated_at = NOW()
    WHERE user_id = NEW.user_id 
      AND leave_type_id = NEW.leave_type_id 
      AND year = EXTRACT(YEAR FROM NEW.start_date);
  END IF;
  
  -- If approval is reversed (rejected after approved), restore balance
  IF NEW.status IN ('rejected', 'cancelled') AND OLD.status = 'approved' THEN
    UPDATE leave_balances
    SET used_days = GREATEST(0, used_days - OLD.total_days),
        updated_at = NOW()
    WHERE user_id = NEW.user_id 
      AND leave_type_id = NEW.leave_type_id 
      AND year = EXTRACT(YEAR FROM NEW.start_date);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_leave_balance
AFTER UPDATE ON leave_requests
FOR EACH ROW
EXECUTE FUNCTION update_leave_balance_on_approval();

-- ===================
-- 11. ROW LEVEL SECURITY (Optional but recommended)
-- ===================

-- Enable RLS on tables
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_details ENABLE ROW LEVEL SECURITY;

-- Note: RLS policies should be created based on your auth setup.
-- For service role (backend with service key), RLS is bypassed.
-- If you need RLS policies for direct Supabase client access, add them here.

-- ===================
-- 12. UPDATED_AT TRIGGERS
-- ===================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all HR tables
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['leave_types', 'leave_requests', 'leave_balances', 'employee_documents', 'employee_details']
  LOOP
    EXECUTE format('
      DROP TRIGGER IF EXISTS set_updated_at ON %I;
      CREATE TRIGGER set_updated_at
      BEFORE UPDATE ON %I
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
    ', tbl, tbl);
  END LOOP;
END;
$$;

-- ===================
-- SCHEMA COMPLETE
-- ===================
-- Tables created:
-- 1. leave_types - Types of leaves (casual, sick, earned, etc.)
-- 2. leave_requests - Employee leave applications with approval workflow
-- 3. leave_balances - Per-user leave balance tracking by year
-- 4. employee_documents - Document storage (ID proofs, contracts, etc.)
-- 5. employee_details - Extended employee information for HR

-- Views created:
-- 1. hr_employee_directory - Complete employee directory with dept/team info
-- 2. leave_summary - Leave requests with resolved names

-- Functions created:
-- 1. initialize_leave_balances() - Initialize balances for all users
-- 2. update_leave_balance_on_approval() - Auto-update balance on approval/rejection

-- Don't forget to run: SELECT initialize_leave_balances();
-- This populates leave balances for all active users
