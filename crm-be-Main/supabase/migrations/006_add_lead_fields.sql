-- Add new fields to leads table for better CSV support
ALTER TABLE leads
ADD COLUMN IF NOT EXISTS profession VARCHAR(100),
ADD COLUMN IF NOT EXISTS course_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS webinar_date DATE,
ADD COLUMN IF NOT EXISTS time_in_session VARCHAR(50),
ADD COLUMN IF NOT EXISTS days_attended INTEGER,
ADD COLUMN IF NOT EXISTS bootcamp_attendee BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS utm_source VARCHAR(100),
ADD COLUMN IF NOT EXISTS utm_campaign VARCHAR(100),
ADD COLUMN IF NOT EXISTS utm_medium VARCHAR(100);

-- Update lead_source enum if needed (optional, keeping existing for now)

-- Create index for some new fields that might be filtered
CREATE INDEX IF NOT EXISTS idx_leads_course_name ON leads(course_name);
CREATE INDEX IF NOT EXISTS idx_leads_webinar_date ON leads(webinar_date);
CREATE INDEX IF NOT EXISTS idx_leads_utm_source ON leads(utm_source);
