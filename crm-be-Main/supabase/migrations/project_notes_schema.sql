-- =====================================================
-- PROJECT NOTES SCHEMA
-- Run this SQL in Supabase SQL Editor
-- =====================================================

-- ===================
-- 1. PROJECT NOTES TABLE
-- ===================
CREATE TABLE IF NOT EXISTS project_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  is_pinned BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_project_notes_project_id ON project_notes(project_id);
CREATE INDEX IF NOT EXISTS idx_project_notes_user_id ON project_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_project_notes_pinned ON project_notes(project_id, is_pinned DESC, created_at DESC);

-- ===================
-- 2. UPDATED_AT TRIGGER
-- ===================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at ON project_notes;
CREATE TRIGGER set_updated_at
BEFORE UPDATE ON project_notes
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ===================
-- 3. ROW LEVEL SECURITY (Optional)
-- Enable Realtime for notes
ALTER PUBLICATION supabase_realtime ADD TABLE project_notes;

-- =========================================
-- Project Files Table
-- =========================================
CREATE TABLE IF NOT EXISTS project_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    file_type VARCHAR(100), -- e.g., 'image/png', 'application/pdf'
    file_size BIGINT, -- Size in bytes
    storage_path TEXT NOT NULL, -- Path in Supabase Storage or external URL
    uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast project file lookups
CREATE INDEX IF NOT EXISTS idx_project_files_project_id ON project_files(project_id);

-- RLS Policies for project_files
ALTER TABLE project_files ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view files of projects they have access to
DROP POLICY IF EXISTS "project_files_select_policy" ON project_files;
CREATE POLICY "project_files_select_policy" ON project_files
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM project_members pm WHERE pm.project_id = project_files.project_id AND pm.user_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM projects p WHERE p.id = project_files.project_id AND p.manager_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'admin'
        )
    );

-- Allow project managers and admins to insert files
DROP POLICY IF EXISTS "project_files_insert_policy" ON project_files;
CREATE POLICY "project_files_insert_policy" ON project_files
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM projects p WHERE p.id = project_files.project_id AND p.manager_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'admin'
        )
    );

-- Allow project managers and admins to delete files
DROP POLICY IF EXISTS "project_files_delete_policy" ON project_files;
CREATE POLICY "project_files_delete_policy" ON project_files
    FOR DELETE USING (
        uploaded_by = auth.uid()
        OR EXISTS (
            SELECT 1 FROM projects p WHERE p.id = project_files.project_id AND p.manager_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'admin'
        )
    );

-- ===================
-- STORAGE BUCKET
-- ===================
-- Create the storage bucket for project files if it doesn't exist
-- Note: This requires appropriate permissions. If it fails, create bucket 'project-files' manually in Supabase dashboard.
INSERT INTO storage.buckets (id, name, public) 
VALUES ('project-files', 'project-files', false)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies
-- Allow authenticated users to view files
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
CREATE POLICY "Public Access" ON storage.objects FOR SELECT
USING ( bucket_id = 'project-files' AND auth.role() = 'authenticated' );

-- Allow authenticated users to upload files
DROP POLICY IF EXISTS "Authenticated Upload" ON storage.objects;
CREATE POLICY "Authenticated Upload" ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'project-files' AND auth.role() = 'authenticated' );

-- Allow users to update/delete their own files or if they are admin
DROP POLICY IF EXISTS "User Delete" ON storage.objects;
CREATE POLICY "User Delete" ON storage.objects FOR DELETE
USING ( bucket_id = 'project-files' AND (owner = auth.uid() OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')) );

ALTER TABLE project_notes ENABLE ROW LEVEL SECURITY;

-- Note: RLS policies should be created based on your auth setup.
-- For service role (backend with service key), RLS is bypassed.

-- ===================
-- SCHEMA COMPLETE
-- ===================
-- Table created:
-- 1. project_notes - Notes/comments for project discussions
--    - Supports pinning important notes
--    - Cascades delete when project is deleted
--    - Tracks author and timestamps
