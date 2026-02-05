-- Migration: 028_enhanced_reminders.sql
-- Enhanced reminder system with multi-stage notifications

-- ============================================
-- LEAD REMINDERS: Add multi-stage tracking
-- ============================================

-- Add columns for tracking each notification stage
ALTER TABLE lead_reminders 
ADD COLUMN IF NOT EXISTS sent_30min BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS sent_5min BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS sent_at_time BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS sent_overdue BOOLEAN DEFAULT FALSE;

-- Drop the old is_sent column if we want to fully migrate
-- For now, keep it for backward compatibility and migrate logic to use new columns

-- Create optimized indexes for reminder processing
DROP INDEX IF EXISTS idx_lead_reminders_pending;
CREATE INDEX idx_lead_reminders_30min ON lead_reminders(reminder_at, sent_30min) 
WHERE sent_30min = FALSE;

CREATE INDEX idx_lead_reminders_5min ON lead_reminders(reminder_at, sent_5min) 
WHERE sent_5min = FALSE;

CREATE INDEX idx_lead_reminders_at_time ON lead_reminders(reminder_at, sent_at_time) 
WHERE sent_at_time = FALSE;

CREATE INDEX idx_lead_reminders_overdue ON lead_reminders(reminder_at, sent_overdue) 
WHERE sent_overdue = FALSE;

COMMENT ON COLUMN lead_reminders.sent_30min IS 'Notification sent 30 minutes before reminder time';
COMMENT ON COLUMN lead_reminders.sent_5min IS 'Notification sent 5 minutes before reminder time';
COMMENT ON COLUMN lead_reminders.sent_at_time IS 'Notification sent at exact reminder time';
COMMENT ON COLUMN lead_reminders.sent_overdue IS 'Single overdue notification sent after reminder time passed';

-- ============================================
-- TASKS: Add multi-stage tracking
-- ============================================

-- Add columns for tracking each notification stage (in addition to existing reminder_sent)
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS reminder_sent_30min BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS reminder_sent_5min BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS reminder_sent_at_time BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS reminder_sent_overdue BOOLEAN DEFAULT FALSE;

-- Create optimized indexes for task reminder processing
DROP INDEX IF EXISTS idx_tasks_reminder;

CREATE INDEX idx_tasks_reminder_30min ON tasks(due_date, reminder_before_minutes, reminder_sent_30min) 
WHERE reminder_before_minutes IS NOT NULL AND reminder_sent_30min = FALSE AND is_deleted = FALSE;

CREATE INDEX idx_tasks_reminder_5min ON tasks(due_date, reminder_sent_5min) 
WHERE reminder_sent_5min = FALSE AND is_deleted = FALSE;

CREATE INDEX idx_tasks_reminder_at_time ON tasks(due_date, reminder_sent_at_time) 
WHERE reminder_sent_at_time = FALSE AND is_deleted = FALSE;

CREATE INDEX idx_tasks_reminder_overdue ON tasks(due_date, reminder_sent_overdue) 
WHERE reminder_sent_overdue = FALSE AND is_deleted = FALSE AND status NOT IN ('completed', 'cancelled');

COMMENT ON COLUMN tasks.reminder_sent_30min IS 'Notification sent 30 minutes before due date';
COMMENT ON COLUMN tasks.reminder_sent_5min IS 'Notification sent 5 minutes before due date';
COMMENT ON COLUMN tasks.reminder_sent_at_time IS 'Notification sent at exact due time';
COMMENT ON COLUMN tasks.reminder_sent_overdue IS 'Single overdue notification sent after due time passed';
