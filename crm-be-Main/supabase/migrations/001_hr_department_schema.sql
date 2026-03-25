-- ============================================================
-- Migration: 001_hr_department_schema.sql
-- HR Department Complete Schema
-- Safe to run multiple times (IF NOT EXISTS guards)
-- ============================================================

-- --------------------------------
-- EMPLOYEE PROFILES (1:1 with users — HR-specific data kept separate from auth table)
-- --------------------------------
CREATE TABLE IF NOT EXISTS employee_profiles (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id               UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  employee_id           VARCHAR(20),                               -- e.g. EMP-0042
  -- Personal
  date_of_birth         DATE,
  gender                VARCHAR(20),
  nationality           VARCHAR(100),
  personal_email        VARCHAR(255),
  permanent_address     JSONB,                                     -- {street, city, state, country, pincode}
  current_address       JSONB,
  emergency_contact     JSONB,                                     -- {name, relationship, phone}
  -- Employment
  designation           VARCHAR(255),
  department            VARCHAR(255),
  employment_type       VARCHAR(50) DEFAULT 'full_time',           -- full_time|part_time|contract|intern
  date_of_joining       DATE,
  probation_end_date    DATE,
  work_location         VARCHAR(255),
  reporting_manager_id  UUID REFERENCES users(id),
  -- Compensation (sensitive — kept out of users table)
  current_ctc           NUMERIC(15,2),
  salary_components     JSONB,                                     -- [{name, amount, type}]
  bank_details          JSONB,                                     -- {account_number, ifsc, bank_name}
  tax_id                VARCHAR(100),                              -- PAN / Tax ID
  -- Profile
  skills                TEXT[],
  bio                   TEXT,
  linkedin_url          VARCHAR(500),
  -- Status
  hr_status             VARCHAR(30) DEFAULT 'active',              -- active|probation|on_leave|archived
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_employee_profiles_user_id ON employee_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_employee_profiles_hr_status ON employee_profiles(hr_status);
CREATE INDEX IF NOT EXISTS idx_employee_profiles_probation_end ON employee_profiles(probation_end_date);

-- --------------------------------
-- EMPLOYEE COMPENSATION HISTORY (append-only, immutable)
-- --------------------------------
CREATE TABLE IF NOT EXISTS employee_compensation_history (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id           UUID NOT NULL REFERENCES users(id),
  effective_date        DATE NOT NULL,
  previous_ctc          NUMERIC(15,2),
  new_ctc               NUMERIC(15,2) NOT NULL,
  change_percentage     NUMERIC(5,2),
  reason                TEXT,
  approved_by           UUID REFERENCES users(id),
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comp_history_employee ON employee_compensation_history(employee_id);
CREATE INDEX IF NOT EXISTS idx_comp_history_date ON employee_compensation_history(effective_date);

-- --------------------------------
-- JOB POSTINGS
-- --------------------------------
CREATE TABLE IF NOT EXISTS job_postings (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title                 VARCHAR(255) NOT NULL,
  department            VARCHAR(255),
  positions_open        INTEGER DEFAULT 1,
  description           TEXT,
  required_skills       TEXT[],
  salary_range_min      NUMERIC(15,2),
  salary_range_max      NUMERIC(15,2),
  application_deadline  DATE,
  posted_by             UUID REFERENCES users(id),
  status                VARCHAR(20) DEFAULT 'open',               -- open|paused|closed
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_job_postings_status ON job_postings(status);
CREATE INDEX IF NOT EXISTS idx_job_postings_department ON job_postings(department);

-- --------------------------------
-- CANDIDATES
-- --------------------------------
CREATE TABLE IF NOT EXISTS candidates (
  id                          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  job_posting_id              UUID REFERENCES job_postings(id),
  full_name                   VARCHAR(255) NOT NULL,
  email                       VARCHAR(255),
  phone                       VARCHAR(50),
  source                      VARCHAR(50),                         -- referral|job_board|direct|agency
  resume_url                  TEXT,
  applied_at                  TIMESTAMPTZ DEFAULT NOW(),
  stage                       VARCHAR(50) DEFAULT 'applied',       -- applied|screened|interview_r1|interview_r2|hr_round|offer_sent|hired|rejected|on_hold
  stage_history               JSONB[] DEFAULT '{}',               -- [{stage, moved_by, moved_at}]
  offer                       JSONB,                               -- {ctc, joining_date, designation, sent_at, response, response_at}
  converted_to_user_id        UUID REFERENCES users(id),          -- populated on hire (onHireTrigger creates the user)
  created_at                  TIMESTAMPTZ DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_candidates_job_posting ON candidates(job_posting_id);
CREATE INDEX IF NOT EXISTS idx_candidates_stage ON candidates(stage);
CREATE INDEX IF NOT EXISTS idx_candidates_email ON candidates(email);

-- --------------------------------
-- INTERVIEWS
-- --------------------------------
CREATE TABLE IF NOT EXISTS interviews (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  candidate_id          UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  round                 INTEGER NOT NULL DEFAULT 1,
  interviewer_id        UUID REFERENCES users(id),
  scheduled_at          TIMESTAMPTZ,
  interview_type        VARCHAR(20) DEFAULT 'video',               -- video|in_person|phone
  feedback              TEXT,
  rating                SMALLINT CHECK (rating BETWEEN 1 AND 5),
  status                VARCHAR(20) DEFAULT 'scheduled',           -- scheduled|completed|cancelled
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_interviews_candidate ON interviews(candidate_id);
CREATE INDEX IF NOT EXISTS idx_interviews_interviewer ON interviews(interviewer_id);

-- --------------------------------
-- SALARY BANDS
-- --------------------------------
CREATE TABLE IF NOT EXISTS salary_bands (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  designation           VARCHAR(255) NOT NULL,
  department            VARCHAR(255),
  min_ctc               NUMERIC(15,2) NOT NULL,
  max_ctc               NUMERIC(15,2) NOT NULL,
  components_template   JSONB,                                     -- default component breakdown
  created_by            UUID REFERENCES users(id),
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- --------------------------------
-- PAYROLL RUNS (header)
-- --------------------------------
CREATE TABLE IF NOT EXISTS payroll_runs (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  month                 VARCHAR(7) NOT NULL,                       -- YYYY-MM
  initiated_by          UUID NOT NULL REFERENCES users(id),
  approved_by           UUID REFERENCES users(id),
  status                VARCHAR(20) DEFAULT 'draft',               -- draft|submitted|approved|disbursed
  total_gross           NUMERIC(15,2),
  total_deductions      NUMERIC(15,2),
  total_net             NUMERIC(15,2),
  notes                 TEXT,
  disbursed_at          TIMESTAMPTZ,
  is_correction         BOOLEAN DEFAULT FALSE,
  original_run_id       UUID REFERENCES payroll_runs(id),
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(month, is_correction, original_run_id)                    -- prevent duplicate runs for the same month
);

CREATE INDEX IF NOT EXISTS idx_payroll_runs_month ON payroll_runs(month);
CREATE INDEX IF NOT EXISTS idx_payroll_runs_status ON payroll_runs(status);

-- --------------------------------
-- PAYROLL RECORDS (per employee per run)
-- --------------------------------
CREATE TABLE IF NOT EXISTS payroll_records (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  payroll_run_id        UUID NOT NULL REFERENCES payroll_runs(id) ON DELETE CASCADE,
  employee_id           UUID NOT NULL REFERENCES users(id),
  month                 VARCHAR(7) NOT NULL,                       -- denormalised for easy filtering
  earnings              JSONB NOT NULL DEFAULT '{}',               -- {basic, hra, allowances, bonuses:[]}
  gross_pay             NUMERIC(15,2) NOT NULL DEFAULT 0,
  deductions            JSONB NOT NULL DEFAULT '{}',               -- {tds, pf, esi, lop, advance_recovery, manual:[]}
  total_deductions      NUMERIC(15,2) NOT NULL DEFAULT 0,
  net_pay               NUMERIC(15,2) NOT NULL DEFAULT 0,
  attendance_summary    JSONB,                                     -- {working_days, present_days, lop_days, leave_days}
  edits                 JSONB[] DEFAULT '{}',                      -- [{field, old_value, new_value, edited_by, reason, timestamp}]
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(payroll_run_id, employee_id)
);

CREATE INDEX IF NOT EXISTS idx_payroll_records_run ON payroll_records(payroll_run_id);
CREATE INDEX IF NOT EXISTS idx_payroll_records_employee ON payroll_records(employee_id);
CREATE INDEX IF NOT EXISTS idx_payroll_records_month ON payroll_records(month);

-- --------------------------------
-- REVIEW CYCLES
-- --------------------------------
CREATE TABLE IF NOT EXISTS review_cycles (
  id                          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name                        VARCHAR(255) NOT NULL,
  scope                       VARCHAR(20) DEFAULT 'all',           -- all|department
  department_id               UUID,
  frequency                   VARCHAR(20),                         -- quarterly|half_yearly|annual
  goal_setting_deadline       DATE,
  mid_checkin_date            DATE,
  self_assessment_deadline    DATE,
  manager_review_deadline     DATE,
  calibration_deadline        DATE,
  results_release_date        DATE,
  status                      VARCHAR(20) DEFAULT 'draft',         -- draft|active|completed
  created_by                  UUID REFERENCES users(id),
  created_at                  TIMESTAMPTZ DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_review_cycles_status ON review_cycles(status);

-- --------------------------------
-- PERFORMANCE REVIEWS
-- --------------------------------
CREATE TABLE IF NOT EXISTS performance_reviews (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cycle_id              UUID NOT NULL REFERENCES review_cycles(id) ON DELETE CASCADE,
  employee_id           UUID NOT NULL REFERENCES users(id),
  manager_id            UUID REFERENCES users(id),
  goals                 JSONB[] DEFAULT '{}',                      -- [{title, kpi, target, weight, self_rating, manager_rating, self_comment, manager_comment}]
  self_assessment       JSONB,                                     -- {summary, achievements, blockers, submitted_at}
  manager_review        JSONB,                                     -- {overall_rating, comments, increment_recommended, promotion_flag, submitted_at}
  calibrated_rating     VARCHAR(30),                               -- exceptional|exceeds|meets|below|unsatisfactory
  peer_feedback         JSONB,                                     -- AGGREGATED ONLY: [{dimension, aggregated_score, comment_count}]
  pip_triggered         BOOLEAN DEFAULT FALSE,
  status                VARCHAR(30) DEFAULT 'draft',               -- draft|self_submitted|manager_submitted|calibrated|released
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(cycle_id, employee_id)
);

CREATE INDEX IF NOT EXISTS idx_perf_reviews_cycle ON performance_reviews(cycle_id);
CREATE INDEX IF NOT EXISTS idx_perf_reviews_employee ON performance_reviews(employee_id);
CREATE INDEX IF NOT EXISTS idx_perf_reviews_manager ON performance_reviews(manager_id);

-- --------------------------------
-- PEER FEEDBACK SUBMISSIONS (anonymous — raw data, HR Director access only via RLS)
-- --------------------------------
CREATE TABLE IF NOT EXISTS peer_feedback_submissions (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  review_id             UUID NOT NULL REFERENCES performance_reviews(id) ON DELETE CASCADE,
  submitter_id          UUID NOT NULL REFERENCES users(id),
  dimension             VARCHAR(100) NOT NULL,                     -- collaboration|communication|delivery|reliability
  score                 SMALLINT CHECK (score BETWEEN 1 AND 5),
  comment               TEXT,
  submitted_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(review_id, submitter_id, dimension)
);

CREATE INDEX IF NOT EXISTS idx_peer_feedback_review ON peer_feedback_submissions(review_id);

-- --------------------------------
-- ONBOARDING TEMPLATES
-- --------------------------------
CREATE TABLE IF NOT EXISTS onboarding_templates (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name                  VARCHAR(255) NOT NULL,
  department            VARCHAR(255),
  type                  VARCHAR(30) DEFAULT 'onboarding',          -- onboarding|offboarding
  tasks                 JSONB[] DEFAULT '{}',                      -- [{task_name, description, owner, due_days_from_joining}]
  created_by            UUID REFERENCES users(id),
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- --------------------------------
-- ONBOARDING CHECKLISTS (instance per employee)
-- --------------------------------
CREATE TABLE IF NOT EXISTS onboarding_checklists (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id           UUID NOT NULL REFERENCES users(id),
  template_id           UUID REFERENCES onboarding_templates(id),
  type                  VARCHAR(30) DEFAULT 'onboarding',          -- onboarding|offboarding
  joining_date          DATE,
  tasks                 JSONB[] DEFAULT '{}',                      -- [{task_name, description, owner, due_date, status, completed_at, notes}]
  -- completion_rate is computed at query time: (done / total) — NOT stored
  exit_details          JSONB,                                     -- {resignation_date, last_working_day, exit_type, exit_interview_data}
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_onboarding_checklists_employee ON onboarding_checklists(employee_id);

-- --------------------------------
-- INCREMENT PROPOSALS (pending approval ledger)
-- --------------------------------
CREATE TABLE IF NOT EXISTS increment_proposals (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id           UUID NOT NULL REFERENCES users(id),
  proposed_by           UUID REFERENCES users(id),
  approved_by           UUID REFERENCES users(id),
  current_ctc           NUMERIC(15,2),
  proposed_ctc          NUMERIC(15,2) NOT NULL,
  effective_date        DATE NOT NULL,
  reason                TEXT,
  status                VARCHAR(20) DEFAULT 'pending',             -- pending|approved|rejected
  payroll_run_id        UUID REFERENCES payroll_runs(id),          -- linked run if applicable
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_increment_proposals_employee ON increment_proposals(employee_id);
CREATE INDEX IF NOT EXISTS idx_increment_proposals_status ON increment_proposals(status);
