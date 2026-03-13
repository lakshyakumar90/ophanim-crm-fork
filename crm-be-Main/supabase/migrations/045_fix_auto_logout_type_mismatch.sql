-- Fix two issues in bulk_auto_logout_due_attendance:
--
-- 1. TYPE MISMATCH: The CASE expression mixed text literals ('half_day', 'late', 'present')
--    with the attendance_status enum column (a.status), which PostgreSQL cannot unify.
--    Fix: cast a.status::text in the ELSE branch so all branches return text,
--    then cast the result back to attendance_status when assigning to status column.
--
-- 2. LATE CLOCK-IN CALCULATION: On-time workers should clock out at the exact shift
--    end time (e.g. 6pm / 4am). Late workers should clock out at clock_in + shift_duration.
--    Previously the grace period (15 min) was added to both cases.
--    Fix: auto_logout_time is now set correctly at clock_in time (by TypeScript service),
--    so the SQL function simply uses the stored auto_logout_time value as-is.

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
      COALESCE(a.auto_logout_time, a.clock_in_time + INTERVAL '12 hour') AS clock_out_at,
      ROUND(
        GREATEST(
          0,
          EXTRACT(EPOCH FROM (
            COALESCE(a.auto_logout_time, a.clock_in_time + INTERVAL '12 hour')
            - a.clock_in_time
          )) / 3600
          - (COALESCE(a.break_duration, 0)::NUMERIC / 60)
        )::NUMERIC,
        2
      ) AS worked_hours,
      -- All CASE branches return text; cast back to attendance_status at UPDATE time.
      CASE
        WHEN ROUND(
          GREATEST(
            0,
            EXTRACT(EPOCH FROM (
              COALESCE(a.auto_logout_time, a.clock_in_time + INTERVAL '12 hour')
              - a.clock_in_time
            )) / 3600
            - (COALESCE(a.break_duration, 0)::NUMERIC / 60)
          )::NUMERIC,
          2
        ) < 4
          THEN 'half_day'::text
        WHEN ROUND(
          GREATEST(
            0,
            EXTRACT(EPOCH FROM (
              COALESCE(a.auto_logout_time, a.clock_in_time + INTERVAL '12 hour')
              - a.clock_in_time
            )) / 3600
            - (COALESCE(a.break_duration, 0)::NUMERIC / 60)
          )::NUMERIC,
          2
        ) >= 9
          THEN CASE WHEN a.status::text = 'late' THEN 'late'::text ELSE 'present'::text END
        ELSE a.status::text
      END AS final_status
    FROM public.attendance a
    WHERE a.clock_out_time IS NULL
      AND a.clock_in_time IS NOT NULL
      AND (
        (a.auto_logout_time IS NOT NULL AND a.auto_logout_time <= NOW())
        OR (a.clock_in_time <= NOW() - INTERVAL '12 hour')
      )
  ),
  updated AS (
    UPDATE public.attendance a
    SET
      session_status  = 'COMPLETED',
      logout_time     = NOW(),
      clock_out_time  = d.clock_out_at,
      logout_type     = 'AUTO_SHIFT',
      total_hours     = d.worked_hours,
      -- cast text result back to the attendance_status enum
      status          = d.final_status::attendance_status,
      attendance_status = CASE
        WHEN d.final_status IN ('present', 'late') THEN 'PRESENT'::text
        WHEN d.final_status = 'half_day'           THEN 'HALF_DAY'::text
        WHEN d.final_status IN ('absent', 'leave') THEN 'ABSENT'::text
        WHEN d.final_status = 'holiday'            THEN 'HOLIDAY'::text
        ELSE 'PRESENT'::text
      END,
      auto_logged_out = TRUE,
      updated_at      = NOW()
    FROM due_sessions d
    WHERE a.id = d.id
    RETURNING a.id
  )
  SELECT COUNT(*)::INTEGER INTO affected_count FROM updated;

  RETURN affected_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.bulk_auto_logout_due_attendance() TO authenticated, service_role;
