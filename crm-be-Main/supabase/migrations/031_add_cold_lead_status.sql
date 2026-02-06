-- Add cold_lead to lead_status enum
-- This migration adds the new "cold_lead" status for leads that are not actively being worked

-- Add cold_lead value to the lead_status enum
ALTER TYPE lead_status ADD VALUE IF NOT EXISTS 'cold_lead' AFTER 'hot_lead';
