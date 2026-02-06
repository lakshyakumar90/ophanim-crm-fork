-- Set Night Shift Attendance Rules (7pm IST to 4am IST)
-- Run this in your Supabase SQL Editor

-- First, check if attendance_rules table has any records
DO $$
BEGIN
  -- Delete any existing rules (if you want to start fresh)
  -- DELETE FROM attendance_rules;
  
  -- Insert or update the attendance rules for night shift
  INSERT INTO attendance_rules (
    work_start_time,
    work_end_time,
    late_threshold_minutes,
    half_day_hours,
    full_day_hours,
    weekly_off_days,
    created_at,
    updated_at
  ) VALUES (
    '19:00',  -- 7pm IST
    '04:00',  -- 4am IST
    15,       -- 15 minutes late threshold
    4,        -- 4 hours for half day
    9,        -- 9 hours for full day (9 hour shift with breaks)
    ARRAY[0, 6]::integer[],  -- Weekly off: 0=Sunday, 6=Saturday
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    work_start_time = '19:00',
    work_end_time = '04:00',
    late_threshold_minutes = 15,
    half_day_hours = 4,
    full_day_hours = 9,
    weekly_off_days = ARRAY[0, 6]::integer[],
    updated_at = NOW();
END $$;

-- Verify the settings
SELECT * FROM attendance_rules;
