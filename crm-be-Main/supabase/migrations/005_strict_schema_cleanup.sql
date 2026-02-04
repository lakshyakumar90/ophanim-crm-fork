-- Recreate/Refine Leads Table to match strict schema
-- Retains: Name, Email, Phone, Website, Country, Timezone, NAL Reason, Source, Client Response, Lead Type
-- Plus System cols: id, created_at, updated_at, status, assigned_to
-- DROPS everything else.

BEGIN;

ALTER TABLE leads
  DROP COLUMN IF EXISTS company_name,
  DROP COLUMN IF EXISTS city,
  DROP COLUMN IF EXISTS state,
  DROP COLUMN IF EXISTS industry,
  DROP COLUMN IF EXISTS lead_value,
  DROP COLUMN IF EXISTS description,
  DROP COLUMN IF EXISTS profession,
  DROP COLUMN IF EXISTS course_name,
  DROP COLUMN IF EXISTS webinar_date,
  DROP COLUMN IF EXISTS time_in_session,
  DROP COLUMN IF EXISTS days_attended,
  DROP COLUMN IF EXISTS bootcamp_attendee,
  DROP COLUMN IF EXISTS utm_source,
  DROP COLUMN IF EXISTS utm_medium,
  DROP COLUMN IF EXISTS utm_campaign,
  DROP COLUMN IF EXISTS tags,
  DROP COLUMN IF EXISTS last_contacted_at,
  DROP COLUMN IF EXISTS next_follow_up_date;

COMMIT;
