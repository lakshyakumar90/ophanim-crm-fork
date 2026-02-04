-- Migration: Add user_activities table for tracking login/logout and other user-level activities
-- This is separate from lead_activities which tracks lead-specific activities

CREATE TABLE IF NOT EXISTS user_activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id),
  activity_type VARCHAR(30) NOT NULL, -- 'login', 'logout', 'password_change', '2fa_enabled', etc.
  title VARCHAR(255) NOT NULL,
  description TEXT,
  metadata JSONB,
  ip_address VARCHAR(50),
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_activities_user ON user_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activities_type ON user_activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_user_activities_created ON user_activities(created_at);
