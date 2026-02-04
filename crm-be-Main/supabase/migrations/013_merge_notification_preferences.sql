-- Migration: Merge notification_preferences into users.notification_settings
-- This reduces table count by storing preferences as JSONB in users table

-- Step 1: Add notification_settings column to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS notification_settings JSONB DEFAULT '{}';

-- Step 2: Migrate data from notification_preferences (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'notification_preferences') THEN
    UPDATE users u
    SET notification_settings = (
      SELECT jsonb_build_object(
        'lead_assignment', np.lead_assignment,
        'task_assignment', np.task_assignment,
        'status_updates', np.status_updates,
        'mentions', np.mentions,
        'system_notifications', np.system_notifications,
        'attendance_alerts', np.attendance_alerts,
        'email_notifications', np.email_notifications
      )
      FROM notification_preferences np
      WHERE np.user_id = u.id
    )
    WHERE EXISTS (
      SELECT 1 FROM notification_preferences np WHERE np.user_id = u.id
    );
  END IF;
END $$;

-- Step 3: Drop old table (uncomment after verifying)
-- DROP TABLE IF EXISTS notification_preferences CASCADE;

-- Note: After running this migration and verifying the data is correct,
-- the notification preferences will be stored in users.notification_settings JSONB
-- Example structure:
-- {
--   "lead_assignment": true,
--   "task_assignment": true,
--   "status_updates": true,
--   "mentions": true,
--   "system_notifications": true,
--   "attendance_alerts": true,
--   "email_notifications": false
-- }
