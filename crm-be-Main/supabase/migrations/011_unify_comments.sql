-- Migration: Unify lead_comments and task_comments into a single comments table
-- This reduces table count and simplifies the comments system

-- Step 1: Create the unified comments table
CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_type VARCHAR(20) NOT NULL, -- 'lead' or 'task'
  entity_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id),
  content TEXT NOT NULL,
  is_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_comments_entity ON comments(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_comments_user ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_created ON comments(created_at);

-- Step 2: Migrate data from lead_comments (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'lead_comments') THEN
    INSERT INTO comments (id, entity_type, entity_id, user_id, content, is_deleted, created_at, updated_at)
    SELECT id, 'lead', lead_id, user_id, content, COALESCE(is_deleted, false), created_at, COALESCE(updated_at, created_at)
    FROM lead_comments
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;

-- Step 3: Migrate data from task_comments (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'task_comments') THEN
    INSERT INTO comments (id, entity_type, entity_id, user_id, content, is_deleted, created_at, updated_at)
    SELECT id, 'task', task_id, user_id, comment_text, false, created_at, created_at
    FROM task_comments
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;

-- Step 4: Drop old tables (uncomment after verifying migration)
-- DROP TABLE IF EXISTS lead_comments CASCADE;
-- DROP TABLE IF EXISTS task_comments CASCADE;

-- Note: After running this migration and verifying the data is correct,
-- uncomment the DROP TABLE statements above and run again.
