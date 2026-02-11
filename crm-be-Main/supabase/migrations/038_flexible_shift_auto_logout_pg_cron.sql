-- Migration: 038_flexible_shift_auto_logout_pg_cron.sql
-- Purpose: Flexible shift auto logout using Supabase pg_cron

-- 1) Ensure pg_cron is enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2) Ensure required attendance session columns exist
ALTER TABLE attendance
ADD COLUMN IF NOT EXISTS auto_logout_time TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS logout_time TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS session_status VARCHAR(20),
ADD COLUMN IF NOT EXISTS logout_type VARCHAR(20);

-- Optional backfill for existing rows:
-- - If shift_end_time exists from older flow, use it first.
-- - Otherwise use clock_in_time + 9 hours (default shift duration).
UPDATE attendance
SET
  auto_logout_time = COALESCE(auto_logout_time, shift_end_time, clock_in_time + INTERVAL '9 hour'),
  session_status = COALESCE(
    session_status,
    CASE WHEN COALESCE(logout_time, clock_out_time) IS NULL THEN 'ACTIVE' ELSE 'COMPLETED' END
  ),
  logout_time = COALESCE(logout_time, clock_out_time)
WHERE auto_logout_time IS NULL
   OR session_status IS NULL
   OR logout_time IS NULL;

-- Normalize legacy logout types before enforcing new rule set.
UPDATE attendance
SET logout_type = CASE
  WHEN logout_type = 'AUTO' THEN 'AUTO_SHIFT'
  WHEN logout_type = 'ADMIN_FORCE' THEN 'MANUAL'
  ELSE logout_type
END
WHERE logout_type IN ('AUTO', 'ADMIN_FORCE');

-- 3) Tighten constraints to required status/type model
ALTER TABLE attendance
DROP CONSTRAINT IF EXISTS attendance_session_status_check;
ALTER TABLE attendance
ADD CONSTRAINT attendance_session_status_check
CHECK (session_status IN ('ACTIVE', 'COMPLETED'));

ALTER TABLE attendance
DROP CONSTRAINT IF EXISTS attendance_logout_type_check;
ALTER TABLE attendance
ADD CONSTRAINT attendance_logout_type_check
CHECK (logout_type IS NULL OR logout_type IN ('AUTO_SHIFT', 'MANUAL'));

-- 4) Required indexes with requested names.
-- Reuse previous indexes by renaming when available to avoid duplicates.
DO $$
BEGIN
  IF to_regclass('public.idx_attendance_status') IS NULL THEN
    IF to_regclass('public.idx_attendance_session_status') IS NOT NULL THEN
      ALTER INDEX idx_attendance_session_status RENAME TO idx_attendance_status;
    ELSE
      CREATE INDEX idx_attendance_status ON attendance(session_status);
    END IF;
  END IF;

  IF to_regclass('public.idx_attendance_auto_logout') IS NULL THEN
    IF to_regclass('public.idx_attendance_auto_logout_time') IS NOT NULL THEN
      ALTER INDEX idx_attendance_auto_logout_time RENAME TO idx_attendance_auto_logout;
    ELSE
      CREATE INDEX idx_attendance_auto_logout ON attendance(auto_logout_time);
    END IF;
  END IF;
END
$$;

-- 5) Bulk auto-logout function (no loops)
CREATE OR REPLACE FUNCTION public.handle_auto_logout()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE attendance
  SET
    session_status = 'COMPLETED',
    logout_time = NOW(),
    logout_type = 'AUTO_SHIFT'
  WHERE session_status = 'ACTIVE'
    AND auto_logout_time <= NOW();
END;
$$;

-- 6) Schedule cron every 5 minutes (idempotent)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM cron.job
    WHERE jobname = 'attendance-auto-logout'
  ) THEN
    PERFORM cron.unschedule('attendance-auto-logout');
  END IF;
END
$$;

SELECT cron.schedule(
  'attendance-auto-logout',
  '*/5 * * * *',
  $$ SELECT public.handle_auto_logout(); $$
);
