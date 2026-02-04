-- Migration: Drop unused tables
-- These tables are not used anywhere in the backend or frontend

-- Drop saved_filters table (feature never implemented)
DROP TABLE IF EXISTS saved_filters CASCADE;

-- Drop registration_requests table (not used - admin creates users directly)
DROP TABLE IF EXISTS registration_requests CASCADE;
