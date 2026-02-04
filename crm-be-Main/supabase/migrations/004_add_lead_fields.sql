-- Add new fields to leads table
-- Fields: Timezone, NAL reason, Clients Response, Lead Type

BEGIN;

ALTER TABLE leads
ADD COLUMN IF NOT EXISTS timezone VARCHAR(100),
ADD COLUMN IF NOT EXISTS nal_reason TEXT,
ADD COLUMN IF NOT EXISTS client_response TEXT,
ADD COLUMN IF NOT EXISTS lead_type VARCHAR(100);

COMMIT;
