-- Migration: Create a unified view for all activities
-- This combines lead_activities and user_activities into a single queryable view
-- Includes joined user and lead details to avoid complex joins in API calls

CREATE OR REPLACE VIEW all_activities AS
SELECT
  la.id,
  la.user_id,
  la.lead_id,
  la.activity_type,
  la.title,
  la.description,
  la.metadata,
  la.created_at,
  'lead' as source_type,
  u.email as user_email,
  u.full_name as user_name,
  u.avatar_url as user_avatar,
  l.lead_name
FROM lead_activities la
LEFT JOIN users u ON la.user_id = u.id
LEFT JOIN leads l ON la.lead_id = l.id

UNION ALL

SELECT
  ua.id,
  ua.user_id,
  NULL as lead_id,
  ua.activity_type,
  ua.title,
  ua.description,
  ua.metadata,
  ua.created_at,
  'user' as source_type,
  u.email as user_email,
  u.full_name as user_name,
  u.avatar_url as user_avatar,
  NULL as lead_name
FROM user_activities ua
LEFT JOIN users u ON ua.user_id = u.id;

-- Grant access to the view
GRANT SELECT ON all_activities TO service_role;
GRANT SELECT ON all_activities TO authenticated;
GRANT SELECT ON all_activities TO anon;
