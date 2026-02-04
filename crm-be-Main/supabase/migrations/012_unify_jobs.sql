-- Migration: Unify csv_import_jobs and csv_export_jobs into a single jobs table
-- This reduces table count and provides a unified pattern for any async jobs

-- Step 1: Create the unified jobs table
CREATE TABLE IF NOT EXISTS jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type VARCHAR(30) NOT NULL, -- 'csv_import', 'csv_export', 'email_batch', etc.
  user_id UUID NOT NULL REFERENCES users(id),
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  
  -- Common fields
  params JSONB, -- Input parameters (filters, file_name, export_type, etc.)
  result JSONB, -- Output data (total_rows, successful_rows, failed_rows, etc.)
  error_log JSONB,
  
  -- File-related
  file_path TEXT,
  
  -- Timing
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_jobs_user ON jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_jobs_type_status ON jobs(type, status);
CREATE INDEX IF NOT EXISTS idx_jobs_created ON jobs(created_at);

-- Step 2: Migrate data from csv_import_jobs (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'csv_import_jobs') THEN
    INSERT INTO jobs (id, type, user_id, status, params, result, error_log, file_path, created_at, updated_at)
    SELECT 
      id, 
      'csv_import', 
      user_id, 
      status,
      jsonb_build_object('file_name', file_name),
      jsonb_build_object(
        'total_rows', total_rows,
        'successful_rows', successful_rows,
        'failed_rows', failed_rows
      ),
      error_log,
      file_path,
      created_at,
      updated_at
    FROM csv_import_jobs
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;

-- Step 3: Migrate data from csv_export_jobs (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'csv_export_jobs') THEN
    INSERT INTO jobs (id, type, user_id, status, params, file_path, expires_at, created_at)
    SELECT 
      id, 
      'csv_export', 
      user_id, 
      status,
      jsonb_build_object('export_type', export_type, 'filters', filters),
      file_path,
      expires_at,
      created_at
    FROM csv_export_jobs
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;

-- Step 4: Drop old tables (uncomment after verifying)
-- DROP TABLE IF EXISTS csv_import_jobs CASCADE;
-- DROP TABLE IF EXISTS csv_export_jobs CASCADE;
