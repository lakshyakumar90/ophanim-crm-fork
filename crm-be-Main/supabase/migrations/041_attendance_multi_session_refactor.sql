-- Attendance multi-session refactor:
-- - allow multiple sessions per user per day
-- - guarantee only one open session per user
-- - enforce valid time ordering
-- - improve query performance for latest-session reads
-- - harden auto-logout for stale open sessions

DROP INDEX IF EXISTS public.attendance_user_attendance_date_uniq;

DO $$
DECLARE
  attendance_table regclass := to_regclass('public.attendance');
BEGIN
  IF attendance_table IS NOT NULL THEN
    IF EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conrelid = attendance_table
        AND contype = 'u'
        AND conname = 'attendance_user_id_date_key'
    ) THEN
      EXECUTE 'ALTER TABLE public.attendance DROP CONSTRAINT attendance_user_id_date_key';
    END IF;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'attendance_valid_session_time_check'
  ) THEN
    ALTER TABLE public.attendance
      ADD CONSTRAINT attendance_valid_session_time_check
      CHECK (
        clock_out_time IS NULL
        OR clock_in_time IS NULL
        OR clock_out_time >= clock_in_time
      );
  END IF;
END $$;

-- Remove malformed sessions that do not have a valid clock-in timestamp.
-- We store only real sessions (clock-in initiated).
DELETE FROM public.attendance a
WHERE a.clock_in_time IS NULL;

-- Resolve existing duplicate open sessions before creating the unique open-session index.
-- Keep the most recent open session per user and auto-complete older open sessions.
WITH ranked_open_sessions AS (
  SELECT
    a.id,
    a.user_id,
    a.clock_in_time,
    a.auto_logout_time,
    a.break_duration,
    a.status,
    ROW_NUMBER() OVER (
      PARTITION BY a.user_id
      ORDER BY a.clock_in_time DESC NULLS LAST, a.created_at DESC, a.id DESC
    ) AS rn
  FROM public.attendance a
  WHERE a.clock_out_time IS NULL
),
to_complete AS (
  SELECT
    r.id,
    COALESCE(r.auto_logout_time, r.clock_in_time + INTERVAL '12 hour', NOW()) AS resolved_clock_out
  FROM ranked_open_sessions r
  WHERE r.rn > 1
),
updated AS (
  UPDATE public.attendance a
  SET
    clock_out_time = GREATEST(t.resolved_clock_out, COALESCE(a.clock_in_time, t.resolved_clock_out)),
    logout_time = NOW(),
    session_status = 'COMPLETED',
    logout_type = CASE
      WHEN a.logout_type IN ('AUTO_SHIFT', 'MANUAL') THEN a.logout_type
      ELSE 'AUTO_SHIFT'
    END,
    total_hours = ROUND(
      GREATEST(
        0,
        EXTRACT(
          EPOCH FROM (
            GREATEST(t.resolved_clock_out, COALESCE(a.clock_in_time, t.resolved_clock_out))
            - COALESCE(a.clock_in_time, t.resolved_clock_out)
          )
        ) / 3600
        - (COALESCE(a.break_duration, 0)::NUMERIC / 60)
      )::NUMERIC,
      2
    ),
    attendance_status = CASE
      WHEN a.status IN ('present', 'late') THEN 'PRESENT'
      WHEN a.status = 'half_day' THEN 'HALF_DAY'
      WHEN a.status IN ('absent', 'leave') THEN 'ABSENT'
      WHEN a.status = 'holiday' THEN 'HOLIDAY'
      ELSE 'PRESENT'
    END,
    updated_at = NOW()
  FROM to_complete t
  WHERE a.id = t.id
  RETURNING a.id
)
SELECT COUNT(*) FROM updated;

CREATE UNIQUE INDEX IF NOT EXISTS attendance_one_active_session
  ON public.attendance(user_id)
  WHERE clock_out_time IS NULL;

CREATE INDEX IF NOT EXISTS attendance_user_clockin_idx
  ON public.attendance(user_id, clock_in_time DESC);

CREATE OR REPLACE FUNCTION public.bulk_auto_logout_due_attendance()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected_count INTEGER := 0;
BEGIN
  WITH due_sessions AS (
    SELECT
      a.id,
      COALESCE(a.auto_logout_time, a.clock_in_time + INTERVAL '12 hour', NOW()) AS clock_out_at,
      ROUND(
        GREATEST(
          0,
          EXTRACT(EPOCH FROM (
            COALESCE(a.auto_logout_time, a.clock_in_time + INTERVAL '12 hour', NOW())
            - a.clock_in_time
          )) / 3600
          - (COALESCE(a.break_duration, 0)::NUMERIC / 60)
        )::NUMERIC,
        2
      ) AS worked_hours,
      CASE
        WHEN ROUND(
          GREATEST(
            0,
            EXTRACT(EPOCH FROM (
              COALESCE(a.auto_logout_time, a.clock_in_time + INTERVAL '12 hour', NOW())
              - a.clock_in_time
            )) / 3600
            - (COALESCE(a.break_duration, 0)::NUMERIC / 60)
          )::NUMERIC,
          2
        ) < 4
          THEN 'half_day'
        WHEN ROUND(
          GREATEST(
            0,
            EXTRACT(EPOCH FROM (
              COALESCE(a.auto_logout_time, a.clock_in_time + INTERVAL '12 hour', NOW())
              - a.clock_in_time
            )) / 3600
            - (COALESCE(a.break_duration, 0)::NUMERIC / 60)
          )::NUMERIC,
          2
        ) >= 9
          THEN CASE WHEN a.status = 'late' THEN 'late' ELSE 'present' END
        ELSE a.status
      END AS final_status
    FROM public.attendance a
    WHERE a.clock_out_time IS NULL
      AND a.clock_in_time IS NOT NULL
      AND (
        (a.auto_logout_time IS NOT NULL AND a.auto_logout_time <= NOW())
        OR (a.clock_in_time IS NOT NULL AND a.clock_in_time <= NOW() - INTERVAL '12 hour')
      )
  ),
  updated AS (
    UPDATE public.attendance a
    SET
      session_status = 'COMPLETED',
      logout_time = NOW(),
      clock_out_time = d.clock_out_at,
      logout_type = 'AUTO_SHIFT',
      total_hours = d.worked_hours,
      status = d.final_status,
      attendance_status = CASE
        WHEN d.final_status IN ('present', 'late') THEN 'PRESENT'
        WHEN d.final_status = 'half_day' THEN 'HALF_DAY'
        WHEN d.final_status IN ('absent', 'leave') THEN 'ABSENT'
        WHEN d.final_status = 'holiday' THEN 'HOLIDAY'
        ELSE 'PRESENT'
      END,
      auto_logged_out = TRUE,
      updated_at = NOW()
    FROM due_sessions d
    WHERE a.id = d.id
    RETURNING a.id
  )
  SELECT COUNT(*)::INTEGER INTO affected_count FROM updated;

  RETURN affected_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.bulk_auto_logout_due_attendance() TO authenticated, service_role;
