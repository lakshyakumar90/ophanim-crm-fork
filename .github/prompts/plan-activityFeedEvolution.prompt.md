# Plan: Activity Feed — Bug Fix + Event-Sourcing Evolution

## TL;DR
Two-track plan:
- **Track A (ship now)**: Fix missing comments bug with minimal risk — extend the UNION view + store `comment_id` in metadata.
- **Track B (strategic)**: Migrate to a single `activity_events` table (event-sourcing pattern) with cursor pagination and composite indexes, eliminating the fragile UNION view forever. Implemented via dual-write + cut-over, no downtime.

---

## Current Architecture Problems

| Problem | Cause |
|---|---|
| Comments invisible in feed | `all_activities` view doesn't read `comments` table; orphaned rows have no `user_activities` entry |
| Dedup is guesswork | No `comment_id` stored in metadata → can't tell apart a logged vs unlogged comment |
| Slow at scale | `UNION ALL` on 3 tables, OFFSET pagination scans grow O(n) |
| Hard to extend | Every new event type requires a view edit |
| Fragile | 5 separate write sites (`leads`, `tasks`, `auth`, `attendance`, `teams`, `internal`) all direct-insert to different tables |

---

## TRACK A — Immediate Bug Fix (ship first)

### A-1: Store `comment_id` in metadata *(parallel — 2 files)*

**`leads.service.ts` → `addLeadComment` (~line 1214)**
Add `comment_id: data.id` to the `metadata` object in the `user_activities` insert. `data.id` is already available — the `comments` insert uses `.select(...).single()`.

**`tasks.service.ts` → `addTaskComment` (~line 563)**
The insert currently discards the row: `const { error }`. Change to `const { data: commentData, error }` and append `.select('id').single()`. Then add `comment_id: commentData.id` to the `user_activities` metadata insert below it (~line 575).

### A-2: New migration — extend `all_activities` view with 3rd UNION branch *(depends on A-1 understanding)*

**New file: `crm-be-Main/supabase/migrations/044_fix_missing_comments_in_activities.sql`**

Drop and recreate `all_activities` adding:

```sql
UNION ALL

-- Branch 3: orphaned comments (no user_activities entry)
SELECT
  c.id,
  c.user_id,
  CASE WHEN c.entity_type = 'lead' THEN c.entity_id ELSE NULL::UUID END AS lead_id,
  c.entity_id,
  'comment'::TEXT AS activity_type,
  ('Comment on ' || COALESCE(
    CASE WHEN c.entity_type = 'lead' THEN l.lead_name
         WHEN c.entity_type = 'task' THEN t.title END,
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
  CASE WHEN c.entity_type = 'lead' THEN l.lead_name
       WHEN c.entity_type = 'task' THEN t.title END AS entity_name
FROM comments c
LEFT JOIN users u ON c.user_id = u.id
LEFT JOIN leads l ON c.entity_type = 'lead' AND c.entity_id = l.id
LEFT JOIN tasks t ON c.entity_type = 'task' AND c.entity_id = t.id
LEFT JOIN user_activities ua
  ON ua.activity_type = 'comment'
  AND (ua.metadata->>'comment_id')::uuid = c.id
WHERE c.is_deleted = FALSE
  AND ua.id IS NULL;  -- exclude comments that already have a matching user_activities row

GRANT SELECT ON all_activities TO service_role, authenticated, anon;

-- Index to support the comment dedup LEFT JOIN (prevents sequential scan on user_activities)
CREATE INDEX IF NOT EXISTS idx_ua_comment_id
  ON user_activities ((metadata->>'comment_id'));

-- Optional: speed up per-entity comment lookups
CREATE INDEX IF NOT EXISTS idx_comments_entity
  ON comments (entity_type, entity_id);
```

Branches 1 and 2 are copied verbatim from migration 037 — no changes.

---

## TRACK B — Strategic Migration to `activity_events` (single event table)

> Do after Track A is shipped and stable. No downtime — uses dual-write cut-over.

### B-1: New table + indexes migration

**New file: `crm-be-Main/supabase/migrations/045_create_activity_events.sql`**

```sql
CREATE TABLE IF NOT EXISTS activity_events (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id    UUID NOT NULL REFERENCES users(id),
  entity_type TEXT NOT NULL,          -- 'lead' | 'task' | 'team' | 'user' | 'project' | 'attendance'
  entity_id   UUID,
  entity_name TEXT,                   -- denormalized snapshot at event time — no JOIN needed
  event_type  TEXT NOT NULL,          -- 'comment_added' | 'status_changed' | 'created' | 'updated' etc.
  source      TEXT,                   -- origin context: 'lead' | 'task' | 'team' | 'attendance' (enables analytics without parsing entity_type)
  metadata    JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Composite primary feed index (cursor pagination key)
CREATE INDEX idx_ae_feed     ON activity_events (created_at DESC, id DESC);
-- Per-entity timeline
CREATE INDEX idx_ae_entity   ON activity_events (entity_type, entity_id, created_at DESC);
-- Per-user activity
CREATE INDEX idx_ae_actor    ON activity_events (actor_id, created_at DESC);
-- Filter by event type
CREATE INDEX idx_ae_type     ON activity_events (event_type, created_at DESC);

GRANT SELECT, INSERT ON activity_events TO service_role;
GRANT SELECT ON activity_events TO authenticated;
```

Why `entity_name` is denormalized: the entity may be renamed or deleted later. Snapshot is cheap and eliminates the need for a JOIN in the feed query.

### B-2: Dual-write helper *(parallel with B-1)*

**New file: `crm-be-Main/src/services/activity-events.service.ts`**

A single exported function `logActivity(event)` that inserts one row into `activity_events`. This is the **only** function all services will call going forward.

```typescript
export interface ActivityEvent {
  actorId: string;
  entityType: string;
  entityId?: string;
  entityName?: string;
  eventType: string;               // e.g. 'comment_added', 'status_changed', 'created'
  source?: string;                 // origin context: 'lead' | 'task' | 'team' | 'attendance'
  metadata?: Record<string, unknown>;
}

export async function logActivity(event: ActivityEvent): Promise<void> {
  await supabaseAdmin.from("activity_events").insert({
    actor_id: event.actorId,
    entity_type: event.entityType,
    entity_id: event.entityId ?? null,
    entity_name: event.entityName ?? null,
    event_type: event.eventType,
    source: event.source ?? null,
    metadata: event.metadata ?? null,
    created_at: getTimestampIST(),
  });
}
```

### B-3: Wire dual-write into all existing write sites *(parallel — 6 service files)*

For each existing `user_activities.insert({...})` / `lead_activities.insert({...})` call, add a `logActivity({...})` call **alongside** (not replacing) the existing one. Keep the old insert until cut-over is complete.

Write sites to update:
- `leads.service.ts` — 3 sites: `lead_activities` insert ~line 389, ~line 509, ~line 921; `user_activities` insert at `addLeadComment` ~line 1203
- `tasks.service.ts` — 5 sites: `user_activities` inserts at ~lines 314, 414, 479, 513, 575
- `auth.service.ts` — 2 sites: login ~line 177, logout ~line 512
- `attendance.service.ts` — 3 sites: clock-in ~line 822, clock-out ~line 887, ~line 969
- `teams.service.ts` — 5 sites: ~lines 203, 253, 285, 356, 380
- `users.service.ts` — 1 site: ~line 327
- `internal.routes.ts` — 1 site: ~line 139

### B-4: New `getActivityLogs` using cursor pagination *(parallel with B-3)*

**In `activity.service.ts`** — add new function `getActivityEventsFeed(filters)` reading from `activity_events`:

```typescript
// Cursor-based pagination using PostgreSQL row-value comparison:
//   WHERE (created_at, id) < ($cursorTime, $cursorId)
//   ORDER BY created_at DESC, id DESC
// Returns: { data, nextCursor: { createdAt, id } | null }
```

PostgREST's filter DSL doesn't support tuple comparisons natively, so implement via a Supabase RPC (stored function) to keep the clean SQL:

```sql
-- In 045 migration (or a companion 045b migration)
CREATE OR REPLACE FUNCTION get_activity_events_feed(
  p_limit     INT,
  p_cursor_ts TIMESTAMPTZ DEFAULT NULL,
  p_cursor_id UUID        DEFAULT NULL,
  p_actor_id  UUID        DEFAULT NULL,
  p_event_type TEXT       DEFAULT NULL
)
RETURNS SETOF activity_events LANGUAGE sql STABLE AS $$
  SELECT * FROM activity_events
  WHERE (p_cursor_ts IS NULL OR (created_at, id) < (p_cursor_ts, p_cursor_id))
    AND (p_actor_id   IS NULL OR actor_id  = p_actor_id)
    AND (p_event_type IS NULL OR event_type = p_event_type)
  ORDER BY created_at DESC, id DESC
  LIMIT p_limit;
$$;
```

Call site in TypeScript: `supabaseAdmin.rpc('get_activity_events_feed', { p_limit, p_cursor_ts, p_cursor_id, ... })`.

API response adds `nextCursor` field to `meta`.

### B-5: Update activity route + API client to support cursor *(depends on B-4)*

**`activity.routes.ts`**: Accept `cursor_time` and `cursor_id` query params and pass to `getActivityEventsFeed`.

**`crm-fe-main/src/lib/api.ts` → `activitiesApi.list`**: Add optional `cursorTime?: string` and `cursorId?: string` params.

### B-6: Frontend infinite scroll *(depends on B-5)*

**`crm-fe-main/src/app/(global)/global/activity/page.tsx`**:
- Replace current SWR single-key fetch with `useSWRInfinite` (or manual "Load More" state)
- Pass `nextCursor` from API response as next page cursor
- Accumulate pages in a flat list
- Show "Load more" button or auto-load on scroll

### B-7: Backfill migration *(can run any time after B-1)*

**New file: `crm-be-Main/supabase/migrations/046_backfill_activity_events.sql`**

INSERT INTO `activity_events` SELECT from `lead_activities` UNION `user_activities` UNION orphaned `comments`. This is a one-time data migration to populate historical data. Run as a script, not blocking deploy.

### B-8: Cut-over *(after dual-write is stable and backfill verified)*

**Pre-cutover verification** — run this before switching the feed:

```sql
SELECT
  (SELECT COUNT(*) FROM activity_events) AS new_events,
  (SELECT COUNT(*) FROM all_activities)  AS legacy_events;
-- Counts should be close. A gap > 5% indicates a backfill gap — investigate before proceeding.
```

1. Switch `getActivityLogs` to call `getActivityEventsFeed` (reading `activity_events`)
2. Remove old dual-write inserts — services only call `logActivity()` going forward
3. Drop `all_activities` view
4. Eventually drop `lead_activities` and `user_activities` tables (keep for one release cycle as safety net)

---

## Relevant Files

| File | Track | Change |
|---|---|---|
| `crm-be-Main/src/services/leads.service.ts` | A | Add `comment_id` to metadata in `addLeadComment` |
| `crm-be-Main/src/services/tasks.service.ts` | A | Capture `data.id` in `addTaskComment`, add `comment_id` to metadata |
| `crm-be-Main/supabase/migrations/044_fix_missing_comments_in_activities.sql` | A | New file — extend view with Branch 3 from `comments` |
| `crm-be-Main/supabase/migrations/045_create_activity_events.sql` | B | New file — table + indexes |
| `crm-be-Main/src/services/activity-events.service.ts` | B | New file — `logActivity()` helper |
| `crm-be-Main/src/services/leads.service.ts` | B | Dual-write `logActivity()` at all 4 insert sites |
| `crm-be-Main/src/services/tasks.service.ts` | B | Dual-write `logActivity()` at 5 insert sites |
| `crm-be-Main/src/services/auth.service.ts` | B | Dual-write at 2 sites |
| `crm-be-Main/src/services/attendance.service.ts` | B | Dual-write at 3 sites |
| `crm-be-Main/src/services/teams.service.ts` | B | Dual-write at 5 sites |
| `crm-be-Main/src/services/users.service.ts` | B | Dual-write at 1 site |
| `crm-be-Main/src/routes/internal.routes.ts` | B | Dual-write at 1 site |
| `crm-be-Main/src/services/activity.service.ts` | B | Add `getActivityEventsFeed()` cursor function |
| `crm-be-Main/src/routes/activity.routes.ts` | B | Accept `cursor_time`, `cursor_id` params |
| `crm-be-Main/src/lib/api.ts` | B | Add cursor params to `activitiesApi.list` |
| `crm-be-Main/supabase/migrations/046_backfill_activity_events.sql` | B | Backfill script |
| `crm-fe-main/src/app/(global)/global/activity/page.tsx` | B | Infinite scroll / Load More |

---

## Verification

**Track A:**
1. `SELECT COUNT(*) FROM all_activities WHERE activity_type = 'comment'` — count jumps after running migration 044
2. Activity page → "Comments" filter → all orphaned comments now visible
3. Add a new lead comment → appears exactly once (no duplicate)
4. Add a new task comment → same
5. `SELECT metadata FROM user_activities WHERE activity_type='comment' ORDER BY created_at DESC LIMIT 5` → each row has `comment_id` key

**Track B:**
1. After B-3 dual-write: `SELECT COUNT(*) FROM activity_events` grows with new actions
2. After B-7 backfill: `SELECT COUNT(*) FROM activity_events` ≈ `SELECT COUNT(*) FROM all_activities`
3. Cursor pagination: `GET /activities?limit=20` → `meta.nextCursor` present, second call `?cursor_time=...&cursor_id=...` returns next 20 without overlap
4. Load More on frontend paginates without reset or jump

---

## Decisions

- **Track A dedup strategy**: Exact `comment_id` match only via `LEFT JOIN user_activities ua ON (ua.metadata->>'comment_id')::uuid = c.id WHERE ua.id IS NULL`. Old comments with no `user_activities` row appear (correct). Rare legacy `user_activities` rows without `comment_id` may produce a duplicate — acceptable; self-corrects after A-1 deploys. The previous 5-minute time-window was removed: it prevented index usage, could hide real comments, and added unnecessary complexity.
- **No backfill in Track A**: We surface orphaned comments directly from `comments` table in the view. Zero data mutation.
- **`entity_name` denormalized in `activity_events`**: Snapshot at event time. Eliminates JOIN chain. Justified for immutable event records — entity may be renamed or deleted later.
- **`source` column in `activity_events`**: Optional but recommended. Decouples "what happened" (`event_type`) from "where it happened" (`source`). Enables analytics like "all `comment_added` events on `lead` source" without parsing `entity_type`. Keep it nullable — populate going forward.
- **RPC for cursor pagination**: PostgREST's filter DSL doesn't support PostgreSQL row-value comparison `(created_at, id) < (t, id)`. Using `.rpc('get_activity_events_feed', ...)` is cleaner than chaining `.or()` and correctly leverages the composite index.
- **Dual-write (not cutover)**: Safer — allows rollback. Old tables stay the source of truth until B-8 cutover is explicitly triggered.
- **Track B is optional / phased**: Track A fixes the immediate user-visible bug. Track B is the right long-term direction but carries risk — schedule it as a separate sprint. Do NOT block Track A on Track B.

---

## Sprint Plan

| Sprint | Goal | Steps |
|---|---|---|
| **Sprint 1** | Fix the bug (ship now) | A-1: `leads.service.ts` + `tasks.service.ts`; A-2: migration 044 |
| **Sprint 2** | Foundation + dual-write | B-1: `045_create_activity_events.sql`; B-2: `activity-events.service.ts`; B-3: dual-write at all 20 write sites |
| **Sprint 3** | New feed + backfill | B-4: `getActivityEventsFeed()` RPC + cursor; B-5: route + API client; B-6: frontend Load More; B-7: migration 046 backfill |
| **Sprint 4** | Cut-over + cleanup | Pre-cutover count verification; B-8: switch feed, drop view, remove dual-write; schedule legacy table drop after one release cycle |
