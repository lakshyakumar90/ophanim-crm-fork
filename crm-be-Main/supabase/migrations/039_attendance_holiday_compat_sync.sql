-- Ensure compatibility columns/triggers for mixed attendance/holiday schema

ALTER TABLE IF EXISTS public.attendance
  ADD COLUMN IF NOT EXISTS attendance_date date;

ALTER TABLE IF EXISTS public.attendance
  ADD COLUMN IF NOT EXISTS attendance_status text;

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

ALTER TABLE IF EXISTS public.attendance
  ALTER COLUMN attendance_date SET NOT NULL;

ALTER TABLE IF EXISTS public.attendance
  ALTER COLUMN attendance_status SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'attendance_attendance_status_check'
  ) THEN
    ALTER TABLE public.attendance
      ADD CONSTRAINT attendance_attendance_status_check CHECK (
        attendance_status = ANY (ARRAY['PRESENT','ABSENT','WEEK_OFF','HOLIDAY','HALF_DAY'])
      );
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS attendance_user_attendance_date_uniq
  ON public.attendance(user_id, attendance_date);

CREATE INDEX IF NOT EXISTS idx_attendance_attendance_date_req
  ON public.attendance(attendance_date);

CREATE INDEX IF NOT EXISTS idx_attendance_attendance_status_req
  ON public.attendance(attendance_status);

ALTER TABLE IF EXISTS public.holidays
  ADD COLUMN IF NOT EXISTS holiday_date date;

UPDATE public.holidays
SET holiday_date = COALESCE(holiday_date, date)
WHERE holiday_date IS NULL;

ALTER TABLE IF EXISTS public.holidays
  ALTER COLUMN holiday_date SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_holidays_holiday_date
  ON public.holidays(holiday_date);

CREATE OR REPLACE FUNCTION public.sync_attendance_compat_columns()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.date := COALESCE(NEW.date, NEW.attendance_date);
  NEW.attendance_date := COALESCE(NEW.attendance_date, NEW.date);

  NEW.status := COALESCE(NEW.status, CASE UPPER(COALESCE(NEW.attendance_status, 'PRESENT'))
    WHEN 'PRESENT' THEN 'present'::attendance_status
    WHEN 'ABSENT' THEN 'absent'::attendance_status
    WHEN 'WEEK_OFF' THEN 'holiday'::attendance_status
    WHEN 'HOLIDAY' THEN 'holiday'::attendance_status
    WHEN 'HALF_DAY' THEN 'half_day'::attendance_status
    ELSE 'present'::attendance_status
  END);

  NEW.attendance_status := COALESCE(NEW.attendance_status, CASE LOWER(NEW.status::text)
    WHEN 'present' THEN 'PRESENT'
    WHEN 'late' THEN 'PRESENT'
    WHEN 'half_day' THEN 'HALF_DAY'
    WHEN 'absent' THEN 'ABSENT'
    WHEN 'holiday' THEN 'HOLIDAY'
    WHEN 'leave' THEN 'ABSENT'
    ELSE 'PRESENT'
  END);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_attendance_compat_columns ON public.attendance;
CREATE TRIGGER trg_sync_attendance_compat_columns
BEFORE INSERT OR UPDATE ON public.attendance
FOR EACH ROW
EXECUTE FUNCTION public.sync_attendance_compat_columns();

CREATE OR REPLACE FUNCTION public.sync_holiday_date_columns()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.date := COALESCE(NEW.date, NEW.holiday_date);
  NEW.holiday_date := COALESCE(NEW.holiday_date, NEW.date);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_holiday_date_columns ON public.holidays;
CREATE TRIGGER trg_sync_holiday_date_columns
BEFORE INSERT OR UPDATE ON public.holidays
FOR EACH ROW
EXECUTE FUNCTION public.sync_holiday_date_columns();

CREATE OR REPLACE FUNCTION public.sync_attendance_on_holiday_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.attendance
  SET
    date = COALESCE(date, attendance_date),
    attendance_date = COALESCE(attendance_date, date)
  WHERE COALESCE(date, attendance_date) = COALESCE(NEW.holiday_date, NEW.date);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_attendance_on_holiday_change ON public.holidays;
CREATE TRIGGER trg_sync_attendance_on_holiday_change
AFTER INSERT OR UPDATE OF holiday_date, date ON public.holidays
FOR EACH ROW
EXECUTE FUNCTION public.sync_attendance_on_holiday_change();
