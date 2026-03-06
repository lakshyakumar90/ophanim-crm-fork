-- Guard/repair migration for environments where attendance columns drifted.
-- Does not recreate attendance table.

DO $$
DECLARE
  v_relkind "char";
BEGIN
  IF to_regclass('public.attendance') IS NULL THEN
    RAISE EXCEPTION 'public.attendance relation not found';
  END IF;

  SELECT c.relkind
  INTO v_relkind
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname = 'attendance'
  LIMIT 1;

  -- r = ordinary table, p = partitioned table
  IF v_relkind NOT IN ('r', 'p') THEN
    RAISE EXCEPTION 'public.attendance is not a table (relkind=%). Check for accidental view/materialized view.', v_relkind;
  END IF;
END $$;

ALTER TABLE public.attendance
  ADD COLUMN IF NOT EXISTS clock_in_time timestamptz,
  ADD COLUMN IF NOT EXISTS clock_out_time timestamptz,
  ADD COLUMN IF NOT EXISTS total_hours numeric(5,2),
  ADD COLUMN IF NOT EXISTS break_duration integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS shift_end_time timestamptz,
  ADD COLUMN IF NOT EXISTS auto_logged_out boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS auto_logout_time timestamptz,
  ADD COLUMN IF NOT EXISTS logout_time timestamptz,
  ADD COLUMN IF NOT EXISTS session_status varchar(20),
  ADD COLUMN IF NOT EXISTS logout_type varchar(20),
  ADD COLUMN IF NOT EXISTS restored_by_admin_id uuid,
  ADD COLUMN IF NOT EXISTS restored_at timestamptz,
  ADD COLUMN IF NOT EXISTS attendance_date date,
  ADD COLUMN IF NOT EXISTS attendance_status text;

-- Backfill compatibility columns if they are null.
UPDATE public.attendance
SET attendance_date = COALESCE(attendance_date, date)
WHERE attendance_date IS NULL;

UPDATE public.attendance
SET attendance_status = COALESCE(
  attendance_status,
  CASE LOWER(COALESCE(status::text, 'present'))
    WHEN 'present' THEN 'PRESENT'
    WHEN 'late' THEN 'PRESENT'
    WHEN 'half_day' THEN 'HALF_DAY'
    WHEN 'absent' THEN 'ABSENT'
    WHEN 'holiday' THEN 'HOLIDAY'
    WHEN 'leave' THEN 'ABSENT'
    ELSE 'PRESENT'
  END
)
WHERE attendance_status IS NULL;

ALTER TABLE public.attendance
  ALTER COLUMN attendance_date SET NOT NULL,
  ALTER COLUMN attendance_status SET NOT NULL;

