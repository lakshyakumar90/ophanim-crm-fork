-- Add business_name column to leads table
ALTER TABLE leads ADD COLUMN IF NOT EXISTS business_name TEXT;
