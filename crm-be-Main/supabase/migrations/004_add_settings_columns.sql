-- Add settings columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS theme_preference text DEFAULT 'system';
ALTER TABLE users ADD COLUMN IF NOT EXISTS primary_color text DEFAULT 'indigo';
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_2fa_enabled boolean DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS notification_preferences jsonb DEFAULT '{"email": true, "push": true, "sms": false}';

-- Note: You also need to create a public storage bucket named 'avatars' in Supabase dashboard
-- and set appropriate policies to allow authenticated users to upload/read.
