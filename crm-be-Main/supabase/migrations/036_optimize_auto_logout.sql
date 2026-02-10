-- Migration: 036_optimize_auto_logout.sql
-- Purpose: flexible shift auto-logout with admin restore support

-- 1) Session-tracking columns
ALTER TABLE attendance
ADD COLUMN IF NOT EXISTS auto_logout_time TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS logout_time TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS session_status VARCHAR(20),
ADD COLUMN IF NOT EXISTS logout_type VARCHAR(20),
ADD COLUMN IF NOT EXISTS restored_by_admin_id UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS restored_at TIMESTAMPTZ;

-- 2) Backfill for existing data
UPDATE attendance
SET
  auto_logout_time = COALESCE(auto_logout_time, shift_end_time),
  logout_time = COALESCE(logout_time, clock_out_time),
  session_status = COALESCE(
    session_status,
    CASE WHEN clock_out_time IS NULL THEN 'ACTIVE' ELSE 'COMPLETED' END
  )
WHERE auto_logout_time IS NULL
   OR logout_time IS NULL
   OR session_status IS NULL;

-- 3) Constraints for controlled values
ALTER TABLE attendance
DROP CONSTRAINT IF EXISTS attendance_session_status_check;
ALTER TABLE attendance
ADD CONSTRAINT attendance_session_status_check
CHECK (session_status IN ('ACTIVE', 'COMPLETED'));

ALTER TABLE attendance
DROP CONSTRAINT IF EXISTS attendance_logout_type_check;
ALTER TABLE attendance
ADD CONSTRAINT attendance_logout_type_check
CHECK (logout_type IS NULL OR logout_type IN ('AUTO', 'MANUAL', 'ADMIN_FORCE'));

-- 4) Indexes requested + optimized due-session index
CREATE INDEX IF NOT EXISTS idx_attendance_auto_logout_time
  ON attendance(auto_logout_time);

CREATE INDEX IF NOT EXISTS idx_attendance_session_status
  ON attendance(session_status);

CREATE INDEX IF NOT EXISTS idx_attendance_session_status_auto_logout_time
  ON attendance(session_status, auto_logout_time);

-- Tight partial index for due checks at scale
CREATE INDEX IF NOT EXISTS idx_attendance_active_due
  ON attendance(auto_logout_time)
  WHERE session_status = 'ACTIVE';

-- 5) Single atomic bulk auto-logout function
CREATE OR REPLACE FUNCTION public.bulk_auto_logout_due_attendance()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  affected_count INTEGER := 0;
BEGIN
  WITH updated AS (
    UPDATE attendance
    SET
      session_status = 'COMPLETED',
      logout_time = NOW(),
      clock_out_time = NOW(),
      logout_type = 'AUTO',
      auto_logged_out = TRUE,
      updated_at = NOW()
    WHERE session_status = 'ACTIVE'
      AND auto_logout_time IS NOT NULL
      AND auto_logout_time <= NOW()
    RETURNING id
  )
  SELECT COUNT(*)::INTEGER INTO affected_count FROM updated;

  RETURN affected_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.bulk_auto_logout_due_attendance() TO authenticated, service_role;

ANALYZE attendance;
