-- Add Shift System Support
-- This migration adds shift_type to users, makes attendance_rules shift-aware,
-- and sets up RLS policies for frontend direct reads

-- 1. Add shift_type column to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS shift_type VARCHAR(20) DEFAULT 'day_shift' CHECK (shift_type IN ('day_shift', 'night_shift'));

-- Update existing users to have day_shift as default (if null)
UPDATE users SET shift_type = 'day_shift' WHERE shift_type IS NULL;

-- 2. Add shift_type and auto_logout_time to attendance_rules
ALTER TABLE attendance_rules 
ADD COLUMN IF NOT EXISTS shift_type VARCHAR(20) CHECK (shift_type IN ('day_shift', 'night_shift')),
ADD COLUMN IF NOT EXISTS auto_logout_time TIME;

-- 3. Delete existing attendance_rules and insert shift-specific rules
DELETE FROM attendance_rules;

-- Insert day shift rules
INSERT INTO attendance_rules (
  shift_type,
  work_start_time,
  work_end_time,
  auto_logout_time,
  late_threshold_minutes,
  half_day_hours,
  full_day_hours,
  weekly_off_days,
  created_at,
  updated_at
) VALUES (
  'day_shift',
  '09:00',
  '18:00',
  '18:15',
  15,
  4,
  8,
  ARRAY[0, 6]::integer[],
  NOW(),
  NOW()
);

-- Insert night shift rules
INSERT INTO attendance_rules (
  shift_type,
  work_start_time,
  work_end_time,
  auto_logout_time,
  late_threshold_minutes,
  half_day_hours,
  full_day_hours,
  weekly_off_days,
  created_at,
  updated_at
) VALUES (
  'night_shift',
  '19:00',
  '04:00',
  '04:15',
  15,
  4,
  9,
  ARRAY[0, 6]::integer[],
  NOW(),
  NOW()
);

-- 4. Create index on shift_type for performance
CREATE INDEX IF NOT EXISTS idx_users_shift_type ON users(shift_type);
CREATE INDEX IF NOT EXISTS idx_attendance_rules_shift_type ON attendance_rules(shift_type);

-- 5. RLS Policies for Frontend Direct Reads
-- Enable RLS on tables that need it
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE holidays ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_rules ENABLE ROW LEVEL SECURITY;

-- Public read access for departments (all authenticated users)
DROP POLICY IF EXISTS "Public read departments" ON departments;
CREATE POLICY "Public read departments" ON departments
  FOR SELECT
  USING (true);

-- Public read access for teams (all authenticated users)
DROP POLICY IF EXISTS "Public read teams" ON teams;
CREATE POLICY "Public read teams" ON teams
  FOR SELECT
  USING (true);

-- Public read access for holidays (all authenticated users)
DROP POLICY IF EXISTS "Public read holidays" ON holidays;
CREATE POLICY "Public read holidays" ON holidays
  FOR SELECT
  USING (true);

-- Public read access for attendance_rules (all authenticated users)
DROP POLICY IF EXISTS "Public read attendance_rules" ON attendance_rules;
CREATE POLICY "Public read attendance_rules" ON attendance_rules
  FOR SELECT
  USING (true);

-- Users can read their own attendance records
DROP POLICY IF EXISTS "Users read own attendance" ON attendance;
CREATE POLICY "Users read own attendance" ON attendance
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can read their own notifications
DROP POLICY IF EXISTS "Users read own notifications" ON notifications;
CREATE POLICY "Users read own notifications" ON notifications
  FOR SELECT
  USING (auth.uid() = user_id);

-- Note: For frontend to work with RLS, we need to ensure Supabase Auth is properly configured
-- The frontend will use the anon key with RLS policies, while backend uses service_role key
