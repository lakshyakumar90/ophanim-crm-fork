-- Add personal profile fields to users table
-- Employees are allowed to self-edit: timezone, country, address
-- Admins can edit all fields

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS timezone VARCHAR(100) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS country VARCHAR(100) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS address TEXT DEFAULT NULL;
