-- Add reminder fields to tasks table
-- Migration: 007_add_task_reminders.sql

-- Add reminder_before_minutes column (null = no reminder)
-- Values: 15, 30, 60 (1 hour), 1440 (1 day)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS reminder_before_minutes INTEGER DEFAULT NULL;

-- Add reminder_sent flag to track if reminder notification was sent
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS reminder_sent BOOLEAN DEFAULT FALSE;

-- Create index for efficient reminder processing
CREATE INDEX IF NOT EXISTS idx_tasks_reminder ON tasks(due_date, reminder_before_minutes, reminder_sent) 
WHERE reminder_before_minutes IS NOT NULL AND reminder_sent = FALSE AND is_deleted = FALSE;

COMMENT ON COLUMN tasks.reminder_before_minutes IS 'Minutes before due date to send reminder (15, 30, 60, 1440)';
COMMENT ON COLUMN tasks.reminder_sent IS 'Whether reminder notification has been sent';
