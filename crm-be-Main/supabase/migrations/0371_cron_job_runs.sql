-- Migration: 037_cron_job_runs.sql
-- Purpose: persist cron execution metrics for monitoring in serverless environments

CREATE TABLE IF NOT EXISTS cron_job_runs (
  id BIGSERIAL PRIMARY KEY,
  job_name TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  success BOOLEAN,
  processed_count INTEGER DEFAULT 0,
  duration_ms INTEGER,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cron_job_runs_job_started
  ON cron_job_runs(job_name, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_cron_job_runs_started_at
  ON cron_job_runs(started_at DESC);

ANALYZE cron_job_runs;

