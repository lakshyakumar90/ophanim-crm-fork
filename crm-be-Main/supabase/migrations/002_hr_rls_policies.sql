-- ============================================================
-- Migration: 002_hr_rls_policies.sql
-- Row Level Security policies for all new HR tables
-- The backend uses supabaseAdmin (service-role key) which bypasses RLS.
-- These policies protect against direct Supabase client access.
-- ============================================================

-- Enable RLS on all new tables
ALTER TABLE employee_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_compensation_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_postings ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE salary_bands ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE peer_feedback_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE increment_proposals ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------
-- employee_profiles
-- ----------------------------------------------------------------
-- Users can read/update their own profile
DROP POLICY IF EXISTS "employee_profiles_own_read" ON employee_profiles;
CREATE POLICY "employee_profiles_own_read"
  ON employee_profiles FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "employee_profiles_own_update" ON employee_profiles;
CREATE POLICY "employee_profiles_own_update"
  ON employee_profiles FOR UPDATE
  USING (user_id = auth.uid());

-- Admins can do everything (service-role bypasses this anyway)
DROP POLICY IF EXISTS "employee_profiles_admin_all" ON employee_profiles;
CREATE POLICY "employee_profiles_admin_all"
  ON employee_profiles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ----------------------------------------------------------------
-- employee_compensation_history
-- ----------------------------------------------------------------
-- Employees can only read their own history
DROP POLICY IF EXISTS "comp_history_own_read" ON employee_compensation_history;
CREATE POLICY "comp_history_own_read"
  ON employee_compensation_history FOR SELECT
  USING (employee_id = auth.uid());

-- Only admins can insert
DROP POLICY IF EXISTS "comp_history_admin_insert" ON employee_compensation_history;
CREATE POLICY "comp_history_admin_insert"
  ON employee_compensation_history FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- ----------------------------------------------------------------
-- job_postings — All authenticated users can read; HR manages
-- ----------------------------------------------------------------
DROP POLICY IF EXISTS "job_postings_read_all" ON job_postings;
CREATE POLICY "job_postings_read_all"
  ON job_postings FOR SELECT
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "job_postings_hr_manage" ON job_postings;
CREATE POLICY "job_postings_hr_manage"
  ON job_postings FOR ALL
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'manager'))
  );

-- ----------------------------------------------------------------
-- candidates — HR roles only
-- ----------------------------------------------------------------
DROP POLICY IF EXISTS "candidates_hr_only" ON candidates;
CREATE POLICY "candidates_hr_only"
  ON candidates FOR ALL
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'manager'))
  );

-- ----------------------------------------------------------------
-- interviews — Interviewers can read; HR manages
-- ----------------------------------------------------------------
DROP POLICY IF EXISTS "interviews_interviewer_read" ON interviews;
CREATE POLICY "interviews_interviewer_read"
  ON interviews FOR SELECT
  USING (
    interviewer_id = auth.uid() OR
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'manager'))
  );

DROP POLICY IF EXISTS "interviews_hr_manage" ON interviews;
CREATE POLICY "interviews_hr_manage"
  ON interviews FOR ALL
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'manager'))
  );

-- ----------------------------------------------------------------
-- salary_bands — HR managers and admins only
-- ----------------------------------------------------------------
DROP POLICY IF EXISTS "salary_bands_hr_only" ON salary_bands;
CREATE POLICY "salary_bands_hr_only"
  ON salary_bands FOR ALL
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'manager'))
  );

-- ----------------------------------------------------------------
-- payroll_runs — HR managers and admins only
-- ----------------------------------------------------------------
DROP POLICY IF EXISTS "payroll_runs_hr_only" ON payroll_runs;
CREATE POLICY "payroll_runs_hr_only"
  ON payroll_runs FOR ALL
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'manager'))
  );

-- ----------------------------------------------------------------
-- payroll_records — Employee reads own; HR reads/manages all
-- ----------------------------------------------------------------
DROP POLICY IF EXISTS "payroll_records_own_read" ON payroll_records;
CREATE POLICY "payroll_records_own_read"
  ON payroll_records FOR SELECT
  USING (employee_id = auth.uid());

DROP POLICY IF EXISTS "payroll_records_hr_all" ON payroll_records;
CREATE POLICY "payroll_records_hr_all"
  ON payroll_records FOR ALL
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'manager'))
  );

-- ----------------------------------------------------------------
-- review_cycles — All authenticated users can read active cycles; HR manages
-- ----------------------------------------------------------------
DROP POLICY IF EXISTS "review_cycles_read" ON review_cycles;
CREATE POLICY "review_cycles_read"
  ON review_cycles FOR SELECT
  USING (auth.uid() IS NOT NULL AND status = 'active');

DROP POLICY IF EXISTS "review_cycles_hr_all" ON review_cycles;
CREATE POLICY "review_cycles_hr_all"
  ON review_cycles FOR ALL
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'manager'))
  );

-- ----------------------------------------------------------------
-- performance_reviews — Employees read own; managers read their reports; HR Director reads all
-- ----------------------------------------------------------------
DROP POLICY IF EXISTS "perf_reviews_own_read" ON performance_reviews;
CREATE POLICY "perf_reviews_own_read"
  ON performance_reviews FOR SELECT
  USING (
    employee_id = auth.uid() OR
    manager_id = auth.uid() OR
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "perf_reviews_own_self_assessment" ON performance_reviews;
CREATE POLICY "perf_reviews_own_self_assessment"
  ON performance_reviews FOR UPDATE
  USING (employee_id = auth.uid() OR manager_id = auth.uid());

DROP POLICY IF EXISTS "perf_reviews_hr_all" ON performance_reviews;
CREATE POLICY "perf_reviews_hr_all"
  ON performance_reviews FOR ALL
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'manager'))
  );

-- ----------------------------------------------------------------
-- peer_feedback_submissions — Submitter can INSERT own; HR Director reads all
-- ----------------------------------------------------------------
DROP POLICY IF EXISTS "peer_feedback_submitter_insert" ON peer_feedback_submissions;
CREATE POLICY "peer_feedback_submitter_insert"
  ON peer_feedback_submissions FOR INSERT
  WITH CHECK (submitter_id = auth.uid());

DROP POLICY IF EXISTS "peer_feedback_admin_read" ON peer_feedback_submissions;
CREATE POLICY "peer_feedback_admin_read"
  ON peer_feedback_submissions FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- ----------------------------------------------------------------
-- onboarding_templates — HR manages; all read
-- ----------------------------------------------------------------
DROP POLICY IF EXISTS "onboarding_templates_read" ON onboarding_templates;
CREATE POLICY "onboarding_templates_read"
  ON onboarding_templates FOR SELECT
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "onboarding_templates_hr_manage" ON onboarding_templates;
CREATE POLICY "onboarding_templates_hr_manage"
  ON onboarding_templates FOR ALL
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'manager'))
  );

-- ----------------------------------------------------------------
-- onboarding_checklists — Employees read own; HR manages all
-- ----------------------------------------------------------------
DROP POLICY IF EXISTS "onboarding_checklists_own_read" ON onboarding_checklists;
CREATE POLICY "onboarding_checklists_own_read"
  ON onboarding_checklists FOR SELECT
  USING (
    employee_id = auth.uid() OR
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'manager'))
  );

DROP POLICY IF EXISTS "onboarding_checklists_hr_all" ON onboarding_checklists;
CREATE POLICY "onboarding_checklists_hr_all"
  ON onboarding_checklists FOR ALL
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'manager'))
  );

-- ----------------------------------------------------------------
-- increment_proposals — Employee reads own; HR manages
-- ----------------------------------------------------------------
DROP POLICY IF EXISTS "increment_proposals_own_read" ON increment_proposals;
CREATE POLICY "increment_proposals_own_read"
  ON increment_proposals FOR SELECT
  USING (
    employee_id = auth.uid() OR
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'manager'))
  );

DROP POLICY IF EXISTS "increment_proposals_hr_all" ON increment_proposals;
CREATE POLICY "increment_proposals_hr_all"
  ON increment_proposals FOR ALL
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'manager'))
  );
