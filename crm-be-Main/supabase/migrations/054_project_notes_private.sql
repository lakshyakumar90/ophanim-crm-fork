-- Migration 054: Add is_private flag to project_notes
-- Private notes are only visible to the note author.
-- Discussion messages (is_private = false) are visible to all project members.

ALTER TABLE project_notes
  ADD COLUMN IF NOT EXISTS is_private BOOLEAN NOT NULL DEFAULT FALSE;

-- Backfill: existing notes are shared discussion messages
UPDATE project_notes SET is_private = FALSE WHERE is_private IS NULL;

-- Index for efficient filtered queries
CREATE INDEX IF NOT EXISTS idx_project_notes_private
  ON project_notes (project_id, is_private, created_at DESC);
