-- 048_backfill_activity_events.sql
-- One-time backfill: populate activity_events from historical lead_activities and user_activities.
-- New writes use the dual-write path (activity-events.service.ts).
-- This migration covers all records that existed before that service was deployed.
--
-- Safety notes:
--  • All INSERTs filter on EXISTS (SELECT 1 FROM users WHERE id = ...) to honour the FK constraint.
--  • Rows where user_id IS NULL are skipped (actor_id is NOT NULL in activity_events).
--  • Supabase migrations are idempotent by file — this file executes exactly once.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Backfill from lead_activities
--    Covers: status changes, lead creates/updates, lead comments, assignments, etc.
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO activity_events (
  actor_id,
  entity_type,
  entity_id,
  entity_name,
  event_type,
  source,
  metadata,
  created_at
)
SELECT
  la.user_id                AS actor_id,
  'lead'                    AS entity_type,
  la.lead_id                AS entity_id,
  l.lead_name               AS entity_name,
  la.activity_type          AS event_type,
  'lead'                    AS source,
  la.metadata,
  la.created_at
FROM lead_activities la
LEFT JOIN leads l ON l.id = la.lead_id
WHERE la.user_id IS NOT NULL
  AND EXISTS (SELECT 1 FROM users u WHERE u.id = la.user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Backfill from user_activities
--    Covers: login/logout, profile updates, task events, team events,
--            attendance, task comments, etc.
--    entity_name is resolved for the most common entity types via scalar subqueries.
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO activity_events (
  actor_id,
  entity_type,
  entity_id,
  entity_name,
  event_type,
  source,
  metadata,
  created_at
)
SELECT
  ua.user_id                                                        AS actor_id,
  COALESCE(ua.entity_type, 'user')                                  AS entity_type,
  ua.entity_id,
  CASE
    WHEN ua.entity_type = 'lead'
      THEN (SELECT l.lead_name FROM leads l WHERE l.id = ua.entity_id LIMIT 1)
    WHEN ua.entity_type = 'task'
      THEN (SELECT t.title FROM tasks t WHERE t.id = ua.entity_id LIMIT 1)
    WHEN ua.entity_type = 'team'
      THEN (SELECT tm.name FROM teams tm WHERE tm.id = ua.entity_id LIMIT 1)
    ELSE NULL
  END                                                               AS entity_name,
  ua.activity_type                                                  AS event_type,
  COALESCE(ua.entity_type, 'user')                                  AS source,
  ua.metadata,
  ua.created_at
FROM user_activities ua
WHERE ua.user_id IS NOT NULL
  AND EXISTS (SELECT 1 FROM users u WHERE u.id = ua.user_id);
