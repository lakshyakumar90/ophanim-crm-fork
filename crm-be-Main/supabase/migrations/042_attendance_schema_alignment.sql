-- Align attendance schema/constraints/indexes across environments.
-- This migration is idempotent and does NOT recreate tables.

DO $$
BEGIN
  IF to_regclass('public.attendance') IS NULL THEN
    RAISE NOTICE 'public.attendance not found, skipping migration 042';
    RETURN;
  END IF;
END $$;

-- 1) Align session_status semantics to the working variant:
-- nullable + no forced default. Open-session truth is clock_out_time IS NULL.
ALTER TABLE public.attendance
  ALTER COLUMN session_status DROP NOT NULL,
  ALTER COLUMN session_status DROP DEFAULT;

-- 2) Remove legacy/v1 + v2 variants of constraints, then recreate canonical v2 checks.
ALTER TABLE public.attendance
  DROP CONSTRAINT IF EXISTS attendance_session_status_check,
  DROP CONSTRAINT IF EXISTS attendance_session_status_check_v2,
  DROP CONSTRAINT IF EXISTS attendance_completed_requires_logout_time_check,
  DROP CONSTRAINT IF EXISTS attendance_completed_requires_logout_time_check_v2,
  DROP CONSTRAINT IF EXISTS attendance_logout_type_check,
  DROP CONSTRAINT IF EXISTS attendance_logout_type_check_v2;

ALTER TABLE public.attendance
  ADD CONSTRAINT attendance_session_status_check_v2
  CHECK (
    session_status IS NULL
    OR session_status IN ('ACTIVE', 'COMPLETED')
  );

ALTER TABLE public.attendance
  ADD CONSTRAINT attendance_completed_requires_logout_time_check_v2
  CHECK (
    session_status IS DISTINCT FROM 'COMPLETED'
    OR logout_time IS NOT NULL
  );

ALTER TABLE public.attendance
  ADD CONSTRAINT attendance_logout_type_check_v2
  CHECK (
    logout_type IS NULL
    OR logout_type IN ('AUTO_SHIFT', 'MANUAL')
  );

-- 3) Ensure valid timing constraint exists (kept permissive for legacy null clock_in rows).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'attendance_valid_session_time_check'
      AND conrelid = 'public.attendance'::regclass
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

-- 4) Index alignment:
-- Keep unique "one active session" and fast latest-session index.
-- Clean malformed/duplicate open sessions first to prevent unique-index failures.
DELETE FROM public.attendance
WHERE clock_in_time IS NULL;

WITH ranked_open_sessions AS (
  SELECT
    id,
    user_id,
    clock_in_time,
    auto_logout_time,
    break_duration,
    ROW_NUMBER() OVER (
      PARTITION BY user_id
      ORDER BY clock_in_time DESC NULLS LAST, created_at DESC, id DESC
    ) AS rn
  FROM public.attendance
  WHERE clock_out_time IS NULL
),
to_complete AS (
  SELECT
    id,
    COALESCE(auto_logout_time, clock_in_time + INTERVAL '12 hour', NOW()) AS resolved_clock_out
  FROM ranked_open_sessions
  WHERE rn > 1
),
updated AS (
  UPDATE public.attendance a
  SET
    clock_out_time = GREATEST(t.resolved_clock_out, COALESCE(a.clock_in_time, t.resolved_clock_out)),
    logout_time = COALESCE(a.logout_time, NOW()),
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

-- Keep explicit session-status index names expected by existing migrations.
CREATE INDEX IF NOT EXISTS idx_attendance_session_status_req
  ON public.attendance(session_status);

CREATE INDEX IF NOT EXISTS idx_attendance_active_auto_logout_due
  ON public.attendance(auto_logout_time)
  WHERE session_status = 'ACTIVE';

-- 5) Keep trigger presence deterministic.
DO $$
BEGIN
  IF to_regprocedure('public.sync_attendance_compat_columns()') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS trg_sync_attendance_compat_columns ON public.attendance;
    CREATE TRIGGER trg_sync_attendance_compat_columns
    BEFORE INSERT OR UPDATE ON public.attendance
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_attendance_compat_columns();
  END IF;
END $$;
