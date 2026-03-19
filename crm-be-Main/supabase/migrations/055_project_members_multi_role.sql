-- Migration 055: Allow same user in multiple roles on a project
-- Previously UNIQUE(project_id, user_id) prevented a developer from also being a content_writer.
-- New constraint: UNIQUE(project_id, user_id, role) — one row per user+role combination.

-- Drop the old constraint
ALTER TABLE project_members
  DROP CONSTRAINT IF EXISTS project_members_project_id_user_id_key;

-- Add the new compound constraint
ALTER TABLE project_members
  ADD CONSTRAINT project_members_project_id_user_id_role_key
  UNIQUE (project_id, user_id, role);
