-- Migration: Create user_teams junction table for multi-team membership
-- Run this in Supabase Studio SQL editor

-- Step 1: Create junction table
CREATE TABLE IF NOT EXISTS user_teams (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, team_id)
);

-- Step 2: Migrate existing single-team memberships
INSERT INTO user_teams (user_id, team_id, role)
SELECT id, team_id, 'member'
FROM users
WHERE team_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- Step 3: Enable RLS
ALTER TABLE user_teams ENABLE ROW LEVEL SECURITY;

-- Step 4: RLS Policies
-- Users can see their own memberships
CREATE POLICY "Users can read their own team memberships"
  ON user_teams FOR SELECT
  USING (user_id = auth.uid());

-- Managers can see memberships in teams they manage
CREATE POLICY "Managers can read team memberships for their teams"
  ON user_teams FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM teams
      WHERE teams.id = user_teams.team_id
        AND teams.manager_id = auth.uid()
    )
  );

-- Admins can do everything
CREATE POLICY "Admins can manage user_teams"
  ON user_teams FOR ALL
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- Step 5: Index for performance
CREATE INDEX IF NOT EXISTS idx_user_teams_user_id ON user_teams(user_id);
CREATE INDEX IF NOT EXISTS idx_user_teams_team_id ON user_teams(team_id);

-- NOTE: The users.team_id column is kept as "primary team" for
-- attendance/shift-rule lookups. Multi-team membership is now in user_teams.
