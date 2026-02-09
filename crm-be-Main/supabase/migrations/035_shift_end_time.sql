-- =====================================================
-- SHIFT END TIME FOR AUTO-LOGOUT
-- Migration: 035_shift_end_time.sql
-- =====================================================

-- Add shift_end_time column to attendance table
-- This stores the exact time the user's shift should end
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS shift_end_time TIMESTAMPTZ;

-- Add auto_logged_out flag to track auto-logout attendance records
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS auto_logged_out BOOLEAN DEFAULT false;

-- Add index for efficient querying of open records with shift_end_time
CREATE INDEX IF NOT EXISTS idx_attendance_open_shift 
ON attendance(shift_end_time) 
WHERE clock_out_time IS NULL;

-- Analyze table for query optimization
ANALYZE attendance;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- 
-- Changes made:
-- 1. Added shift_end_time column to store when shift should end
-- 2. Added auto_logged_out flag for audit trail
-- 3. Created index for efficient auto-logout queries
--
-- Usage:
-- - shift_end_time is set at clock-in based on shift type
-- - auto_logged_out is set to true when cron job logs out user
