-- Migration: 029_reminder_done_status.sql
-- Add is_done field to lead_reminders for marking reminders complete

-- Add is_done column to lead_reminders table
ALTER TABLE lead_reminders 
ADD COLUMN IF NOT EXISTS is_done BOOLEAN DEFAULT FALSE;

-- Create index for efficient querying of active reminders
CREATE INDEX IF NOT EXISTS idx_lead_reminders_is_done ON lead_reminders(is_done) 
WHERE is_done = FALSE;

COMMENT ON COLUMN lead_reminders.is_done IS 'Whether the reminder has been marked as done/complete by the user';
