-- Migration: Enhance user_activities for generic logging and update all_activities view
-- Adds entity_type and entity_id to link with tasks, teams, etc.

-- 1. Add new columns to user_activities
ALTER TABLE user_activities 
ADD COLUMN IF NOT EXISTS entity_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS entity_id UUID;

CREATE INDEX IF NOT EXISTS idx_user_activities_entity ON user_activities(entity_type, entity_id);

-- 2. Update the Unified View to include joins with tasks and teams
DROP VIEW IF EXISTS all_activities;

CREATE OR REPLACE VIEW all_activities AS
SELECT
  la.id,
  la.user_id,
  la.lead_id,
  NULL::UUID as entity_id,
  la.activity_type,
  la.title,
  la.description,
  la.metadata,
  la.created_at,
  'lead' as source_type,
  'lead' as entity_type,
  u.email as user_email,
  u.full_name as user_name,
  u.avatar_url as user_avatar,
  l.lead_name as entity_name -- Use generic entity_name column for display
FROM lead_activities la
LEFT JOIN users u ON la.user_id = u.id
LEFT JOIN leads l ON la.lead_id = l.id

UNION ALL

SELECT
  ua.id,
  ua.user_id,
  NULL::UUID as lead_id,
  ua.entity_id,
  ua.activity_type,
  ua.title,
  ua.description,
  ua.metadata,
  ua.created_at,
  'user' as source_type,
  ua.entity_type,
  u.email as user_email,
  u.full_name as user_name,
  u.avatar_url as user_avatar,
  -- Dynamic entity name fetching based on type
  CASE 
    WHEN ua.entity_type = 'task' THEN t.title
    WHEN ua.entity_type = 'team' THEN tm.name
    WHEN ua.entity_type = 'user' THEN u2.full_name
    ELSE NULL
  END as entity_name
FROM user_activities ua
LEFT JOIN users u ON ua.user_id = u.id
LEFT JOIN tasks t ON ua.entity_type = 'task' AND ua.entity_id = t.id
LEFT JOIN teams tm ON ua.entity_type = 'team' AND ua.entity_id = tm.id
LEFT JOIN users u2 ON ua.entity_type = 'user' AND ua.entity_id = u2.id;

-- Grant access
GRANT SELECT ON all_activities TO service_role;
GRANT SELECT ON all_activities TO authenticated;
GRANT SELECT ON all_activities TO anon;
