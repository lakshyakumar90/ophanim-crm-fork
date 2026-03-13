-- Create activity_events table for event-sourcing pattern.
-- This is the long-term replacement for the fragile UNION view.
-- Phase: DUAL-WRITE — existing tables remain the source of truth until cut-over (B-8).

CREATE TABLE IF NOT EXISTS activity_events (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id    UUID NOT NULL REFERENCES users(id),
  entity_type TEXT NOT NULL,          -- 'lead' | 'task' | 'team' | 'user' | 'project' | 'attendance'
  entity_id   UUID,
  entity_name TEXT,                   -- denormalized snapshot at event time — no JOIN needed
  event_type  TEXT NOT NULL,          -- 'comment_added' | 'status_changed' | 'created' | 'updated' etc.
  source      TEXT,                   -- origin context: 'lead' | 'task' | 'team' | 'attendance'
  metadata    JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Composite feed index — enables efficient cursor pagination (created_at DESC, id DESC)
CREATE INDEX IF NOT EXISTS idx_ae_feed   ON activity_events (created_at DESC, id DESC);
-- Per-entity timeline
CREATE INDEX IF NOT EXISTS idx_ae_entity ON activity_events (entity_type, entity_id, created_at DESC);
-- Per-user activity
CREATE INDEX IF NOT EXISTS idx_ae_actor  ON activity_events (actor_id, created_at DESC);
-- Filter by event type
CREATE INDEX IF NOT EXISTS idx_ae_type   ON activity_events (event_type, created_at DESC);

GRANT SELECT, INSERT ON activity_events TO service_role;
GRANT SELECT ON activity_events TO authenticated;

-- ============================================================
-- RPC: cursor-based paginated activity feed
-- PostgREST's filter DSL cannot express PostgreSQL row-value
-- comparisons like (created_at, id) < ($ts, $id), so we use
-- a stored function instead.
-- ============================================================

CREATE OR REPLACE FUNCTION get_activity_events_feed(
  p_limit      INT,
  p_cursor_ts  TIMESTAMPTZ DEFAULT NULL,
  p_cursor_id  UUID        DEFAULT NULL,
  p_actor_id   UUID        DEFAULT NULL,
  p_event_type TEXT        DEFAULT NULL
)
RETURNS SETOF activity_events
LANGUAGE sql
STABLE
AS $$
  SELECT *
  FROM activity_events
  WHERE
    (p_cursor_ts IS NULL OR (created_at, id) < (p_cursor_ts, p_cursor_id))
    AND (p_actor_id   IS NULL OR actor_id   = p_actor_id)
    AND (p_event_type IS NULL OR event_type = p_event_type)
  ORDER BY created_at DESC, id DESC
  LIMIT p_limit;
$$;

GRANT EXECUTE ON FUNCTION get_activity_events_feed(INT, TIMESTAMPTZ, UUID, UUID, TEXT)
  TO service_role, authenticated;
