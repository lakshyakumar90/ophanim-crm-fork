-- User Email Settings Table
-- Stores user-specific SMTP/email credentials for sending emails from CRM

CREATE TABLE IF NOT EXISTS user_email_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Email configuration
  email_type VARCHAR(20) DEFAULT 'smtp' CHECK (email_type IN ('smtp', 'gmail')),
  smtp_host VARCHAR(255),
  smtp_port INTEGER DEFAULT 587,
  smtp_user VARCHAR(255), -- The email address to send from
  smtp_password_encrypted TEXT, -- Encrypted password/app password
  smtp_secure BOOLEAN DEFAULT false, -- Use TLS
  
  -- Status
  is_configured BOOLEAN DEFAULT false,
  last_test_at TIMESTAMP WITH TIME ZONE,
  last_test_success BOOLEAN,
  
  -- Rate limiting
  daily_sent_count INTEGER DEFAULT 0,
  last_sent_reset_date DATE DEFAULT CURRENT_DATE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- One config per user
  UNIQUE(user_id)
);

-- Email Send Log (optional - for tracking sent emails)
CREATE TABLE IF NOT EXISTS email_send_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Email details
  recipient_email VARCHAR(255) NOT NULL,
  recipient_name VARCHAR(255),
  subject VARCHAR(500) NOT NULL,
  
  -- Related entities (optional)
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  
  -- Status
  status VARCHAR(20) DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'pending')),
  error_message TEXT,
  
  -- Timestamps
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_email_settings_user_id ON user_email_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_email_send_log_user_id ON email_send_log(user_id);
CREATE INDEX IF NOT EXISTS idx_email_send_log_sent_at ON email_send_log(sent_at);
CREATE INDEX IF NOT EXISTS idx_email_send_log_lead_id ON email_send_log(lead_id);

-- RLS Policies
ALTER TABLE user_email_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_send_log ENABLE ROW LEVEL SECURITY;

-- Users can only see their own email settings
CREATE POLICY "Users can view own email settings"
ON user_email_settings FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can manage own email settings"
ON user_email_settings FOR ALL
USING (user_id = auth.uid());

-- Users can only see their own email logs
CREATE POLICY "Users can view own email logs"
ON email_send_log FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can insert own email logs"
ON email_send_log FOR INSERT
WITH CHECK (user_id = auth.uid());
