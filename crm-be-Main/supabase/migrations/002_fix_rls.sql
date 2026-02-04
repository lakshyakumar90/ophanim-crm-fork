-- RLS Fix for All Tables
-- Run this in Supabase SQL Editor to fix RLS warnings

-- Enable RLS on ALL tables
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE refresh_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_assignments_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE holidays ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE csv_import_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE csv_export_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_filters ENABLE ROW LEVEL SECURITY;

-- Create service role bypass policies for all tables
-- This allows the backend (using service_role key) full access

CREATE POLICY "Service role full access" ON teams FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON refresh_tokens FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON leads FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON lead_activities FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON lead_assignments_history FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON tasks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON task_comments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON attendance FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON attendance_rules FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON holidays FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON notifications FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON notification_preferences FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON activity_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON csv_import_jobs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON csv_export_jobs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON email_templates FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON saved_filters FOR ALL USING (true) WITH CHECK (true);
