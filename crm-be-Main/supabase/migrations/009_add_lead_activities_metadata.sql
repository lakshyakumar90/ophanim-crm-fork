-- Add metadata column to lead_activities table
-- Migration: 009_add_lead_activities_metadata.sql

ALTER TABLE lead_activities ADD COLUMN IF NOT EXISTS metadata JSONB;

COMMENT ON COLUMN lead_activities.metadata IS 'Additional metadata for activity (e.g., status change details)';
