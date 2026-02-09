-- Migration: Set existing users to night shift
-- This sets all current users to night_shift as per requirement

UPDATE users 
SET shift_type = 'night_shift' 
WHERE shift_type IS NULL OR shift_type = 'day_shift';

-- Verify: Count users by shift type
SELECT 
  shift_type, 
  COUNT(*) as user_count 
FROM users 
GROUP BY shift_type;