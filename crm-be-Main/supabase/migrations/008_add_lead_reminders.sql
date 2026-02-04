-- Create lead_reminders table
-- Migration: 008_add_lead_reminders.sql

CREATE TABLE IF NOT EXISTS lead_reminders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reminder_at TIMESTAMPTZ NOT NULL,
  note TEXT,
  is_sent BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_lead_reminders_lead ON lead_reminders(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_reminders_user ON lead_reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_lead_reminders_pending ON lead_reminders(reminder_at, is_sent) 
WHERE is_sent = FALSE;

COMMENT ON TABLE lead_reminders IS 'Reminders for leads set by users';
