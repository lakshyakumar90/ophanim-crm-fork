-- Migration: Drop activity_logs table
-- Since we now use lead_activities as the single source of truth for lead activities,
-- and removed all logActivity calls, the activity_logs table is no longer needed.

-- First, drop any foreign key constraints if they exist
-- (done automatically with CASCADE)

-- Drop the activity_logs table
DROP TABLE IF EXISTS activity_logs CASCADE;

-- Note: After this migration, all activity data will be stored in specific tables:
-- - lead_activities: For lead-related activities
-- - attendance: For clock in/out
-- - lead_assignments_history: For assignment history
-- - lead_comments: For comments
