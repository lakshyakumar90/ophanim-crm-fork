-- Update Lead Status Enum (Corrected)
-- Fixes ERROR: 42804: default for column "status" cannot be cast automatically

BEGIN;

-- 1. Drop the existing default value immediately to prevent casting errors
ALTER TABLE leads ALTER COLUMN status DROP DEFAULT;

-- 2. Rename existing type to keep it available for casting
ALTER TYPE lead_status RENAME TO lead_status_old;

-- 3. Create the new type with the new values
CREATE TYPE lead_status AS ENUM (
  'fresh_lead',
  'hot_lead',
  'meeting_scheduled',
  'did_not_pick',
  'follow_up',
  'future_lead',
  'not_interested',
  'not_a_lead',
  'won',
  'proposal_sent'
);

-- 4. Convert the column type using a CASE statement to map old values to new ones
-- This ensures existing data is safely migrated without errors.
ALTER TABLE leads 
ALTER COLUMN status TYPE lead_status 
USING (
  CASE status::text
    -- Exact matches
    WHEN 'follow_up' THEN 'follow_up'::lead_status
    WHEN 'won' THEN 'won'::lead_status
    WHEN 'proposal_sent' THEN 'proposal_sent'::lead_status
    
    -- Mappings for old values
    WHEN 'new' THEN 'fresh_lead'::lead_status
    WHEN 'contacted' THEN 'fresh_lead'::lead_status
    WHEN 'qualified' THEN 'hot_lead'::lead_status
    WHEN 'demo_scheduled' THEN 'meeting_scheduled'::lead_status
    WHEN 'negotiation' THEN 'hot_lead'::lead_status
    WHEN 'documentation_pending' THEN 'hot_lead'::lead_status
    WHEN 'payment_pending' THEN 'hot_lead'::lead_status
    WHEN 'closed' THEN 'won'::lead_status
    WHEN 'lost' THEN 'not_interested'::lead_status
    WHEN 'on_hold' THEN 'future_lead'::lead_status
    WHEN 'unqualified' THEN 'not_a_lead'::lead_status
    
    -- Fallback for any other value
    ELSE 'fresh_lead'::lead_status
  END
);

-- 5. Set the new default value
ALTER TABLE leads ALTER COLUMN status SET DEFAULT 'fresh_lead'::lead_status;

-- 6. Clean up the old type
DROP TYPE lead_status_old;

COMMIT;
