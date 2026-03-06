-- Ensure auto-logout always writes consistent timing and duration values.
-- This fixes stale total_hours after admin restore/reopen followed by auto-logout.

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
      COALESCE(a.auto_logout_time, NOW()) AS clock_out_at,
      ROUND(
        GREATEST(
          0,
          EXTRACT(EPOCH FROM (COALESCE(a.auto_logout_time, NOW()) - a.clock_in_time)) / 3600
          - (COALESCE(a.break_duration, 0)::NUMERIC / 60)
        )::NUMERIC,
        2
      ) AS worked_hours,
      CASE
        WHEN ROUND(
          GREATEST(
            0,
            EXTRACT(EPOCH FROM (COALESCE(a.auto_logout_time, NOW()) - a.clock_in_time)) / 3600
            - (COALESCE(a.break_duration, 0)::NUMERIC / 60)
          )::NUMERIC,
          2
        ) < 4
          THEN 'half_day'
        WHEN ROUND(
          GREATEST(
            0,
            EXTRACT(EPOCH FROM (COALESCE(a.auto_logout_time, NOW()) - a.clock_in_time)) / 3600
            - (COALESCE(a.break_duration, 0)::NUMERIC / 60)
          )::NUMERIC,
          2
        ) >= 9
          THEN CASE WHEN a.status = 'late' THEN 'late' ELSE 'present' END
        ELSE a.status
      END AS final_status
    FROM attendance a
    WHERE a.session_status = 'ACTIVE'
      AND a.auto_logout_time IS NOT NULL
      AND a.auto_logout_time <= NOW()
  ),
  updated AS (
    UPDATE attendance a
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

CREATE OR REPLACE FUNCTION public.handle_auto_logout()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.bulk_auto_logout_due_attendance();
END;
$$;
