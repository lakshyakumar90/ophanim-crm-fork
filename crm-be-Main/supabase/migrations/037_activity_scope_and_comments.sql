-- Expand unified activity view so user_activities can represent lead/task/project
-- activity cleanly, including comment events written through user_activities.

DROP VIEW IF EXISTS all_activities;

CREATE OR REPLACE VIEW all_activities AS
SELECT
  la.id,
  la.user_id,
  la.lead_id,
  la.lead_id AS entity_id,
  la.activity_type,
  la.title,
  la.description,
  la.metadata,
  la.created_at,
  'lead'::TEXT AS source_type,
  'lead'::TEXT AS entity_type,
  u.email AS user_email,
  u.full_name AS user_name,
  u.avatar_url AS user_avatar,
  l.lead_name AS entity_name
FROM lead_activities la
LEFT JOIN users u ON la.user_id = u.id
LEFT JOIN leads l ON la.lead_id = l.id

UNION ALL

SELECT
  ua.id,
  ua.user_id,
  CASE
    WHEN ua.entity_type = 'lead' THEN ua.entity_id
    ELSE NULL::UUID
  END AS lead_id,
  ua.entity_id,
  ua.activity_type,
  ua.title,
  ua.description,
  ua.metadata,
  ua.created_at,
  COALESCE(ua.entity_type, 'user') AS source_type,
  COALESCE(ua.entity_type, 'user') AS entity_type,
  u.email AS user_email,
  u.full_name AS user_name,
  u.avatar_url AS user_avatar,
  CASE
    WHEN ua.entity_type = 'lead' THEN l.lead_name
    WHEN ua.entity_type = 'task' THEN t.title
    WHEN ua.entity_type = 'team' THEN tm.name
    WHEN ua.entity_type = 'user' THEN u2.full_name
    WHEN ua.entity_type = 'project' THEN p.name
    ELSE NULL
  END AS entity_name
FROM user_activities ua
LEFT JOIN users u ON ua.user_id = u.id
LEFT JOIN leads l ON ua.entity_type = 'lead' AND ua.entity_id = l.id
LEFT JOIN tasks t ON ua.entity_type = 'task' AND ua.entity_id = t.id
LEFT JOIN teams tm ON ua.entity_type = 'team' AND ua.entity_id = tm.id
LEFT JOIN users u2 ON ua.entity_type = 'user' AND ua.entity_id = u2.id
LEFT JOIN projects p ON ua.entity_type = 'project' AND ua.entity_id = p.id;

GRANT SELECT ON all_activities TO service_role;
GRANT SELECT ON all_activities TO authenticated;
GRANT SELECT ON all_activities TO anon;
