-- Fix missing comments in activity feed.
-- Extends all_activities view with a 3rd UNION branch that surfaces comments
-- from the comments table that have no corresponding user_activities row.
-- Also adds a metadata index to support the dedup LEFT JOIN without a seq scan.

DROP VIEW IF EXISTS all_activities;

CREATE OR REPLACE VIEW all_activities AS

-- Branch 1: lead_activities (unchanged from 037)
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

-- Branch 2: user_activities (unchanged from 037)
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
LEFT JOIN projects p ON ua.entity_type = 'project' AND ua.entity_id = p.id

UNION ALL

-- Branch 3: orphaned comments — comments that have no matching user_activities row.
-- A comment is considered "matched" when user_activities has activity_type='comment'
-- and metadata->>'comment_id' equals the comment's id.
-- Old comments without a comment_id in metadata will continue to surface here
-- (acceptable — dedup self-corrects once Track A A-1 deploys and new comments
-- all carry comment_id in metadata).
SELECT
  c.id,
  c.user_id,
  CASE WHEN c.entity_type = 'lead' THEN c.entity_id ELSE NULL::UUID END AS lead_id,
  c.entity_id,
  'comment'::TEXT AS activity_type,
  ('Comment on ' || COALESCE(
    CASE
      WHEN c.entity_type = 'lead' THEN l.lead_name
      WHEN c.entity_type = 'task' THEN t.title
    END,
    c.entity_type
  ))::TEXT AS title,
  NULL::TEXT AS description,
  jsonb_build_object(
    'comment_id', c.id,
    'comment_preview', LEFT(c.content, 120)
  ) AS metadata,
  c.created_at,
  c.entity_type::TEXT AS source_type,
  c.entity_type::TEXT AS entity_type,
  u.email AS user_email,
  u.full_name AS user_name,
  u.avatar_url AS user_avatar,
  CASE
    WHEN c.entity_type = 'lead' THEN l.lead_name
    WHEN c.entity_type = 'task' THEN t.title
  END AS entity_name
FROM comments c
LEFT JOIN users u ON c.user_id = u.id
LEFT JOIN leads l ON c.entity_type = 'lead' AND c.entity_id = l.id
LEFT JOIN tasks t ON c.entity_type = 'task' AND c.entity_id = t.id
LEFT JOIN user_activities ua
  ON ua.activity_type = 'comment'
  AND (ua.metadata->>'comment_id')::uuid = c.id
WHERE c.is_deleted = FALSE
  AND ua.id IS NULL;  -- only surface comments with no user_activities counterpart

GRANT SELECT ON all_activities TO service_role, authenticated, anon;

-- Index to support the comment dedup LEFT JOIN (avoids full seq scan on user_activities)
CREATE INDEX IF NOT EXISTS idx_ua_comment_id
  ON user_activities ((metadata->>'comment_id'));

-- Speed up per-entity comment lookups
CREATE INDEX IF NOT EXISTS idx_comments_entity
  ON comments (entity_type, entity_id);
