-- Migration 053: Break circular RLS between projects ↔ project_members
-- Root cause: projects_select_policy queries project_members, and
-- project_members_select_policy queries projects → infinite recursion.
-- Fix: use SECURITY DEFINER helper functions that bypass RLS.

-- ============================================================
-- 1. SECURITY DEFINER helper: check if current user manages a project
--    (queries projects table without triggering its own RLS)
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_project_manager_of(p_project_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM projects
    WHERE id = p_project_id
      AND manager_id = auth.uid()
  )
$$;

GRANT EXECUTE ON FUNCTION public.is_project_manager_of(UUID) TO authenticated;

-- ============================================================
-- 2. Ensure is_project_member helper exists (from migration 052)
--    Re-create here for safety in case 052 was never applied.
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_project_member(p_project_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM project_members
    WHERE project_id = p_project_id
      AND user_id = auth.uid()
  )
$$;

GRANT EXECUTE ON FUNCTION public.is_project_member(UUID) TO authenticated;

-- ============================================================
-- 3. Fix projects_select_policy
--    Replace direct subquery on project_members with SECURITY DEFINER call
-- ============================================================
DROP POLICY IF EXISTS "projects_select_policy" ON projects;

CREATE POLICY "projects_select_policy" ON projects
  FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR manager_id = auth.uid()
    OR public.is_project_member(projects.id)
  );

-- ============================================================
-- 4. Fix project_members_select_policy
--    Replace direct subquery on projects with SECURITY DEFINER call
-- ============================================================
DROP POLICY IF EXISTS "project_members_select_policy" ON project_members;

CREATE POLICY "project_members_select_policy" ON project_members
  FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR user_id = auth.uid()
    OR public.is_project_manager_of(project_members.project_id)
    OR public.is_project_member(project_members.project_id)
  );

-- ============================================================
-- 5. Fix project_files policies
--    They also directly reference project_members and projects → recursion
-- ============================================================
DROP POLICY IF EXISTS "project_files_select_policy" ON project_files;

CREATE POLICY "project_files_select_policy" ON project_files
  FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR public.is_project_manager_of(project_files.project_id)
    OR public.is_project_member(project_files.project_id)
  );

DROP POLICY IF EXISTS "project_files_insert_policy" ON project_files;

CREATE POLICY "project_files_insert_policy" ON project_files
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin()
    OR public.is_project_manager_of(project_files.project_id)
    OR public.is_project_member(project_files.project_id)
  );

DROP POLICY IF EXISTS "project_files_delete_policy" ON project_files;

CREATE POLICY "project_files_delete_policy" ON project_files
  FOR DELETE TO authenticated
  USING (
    uploaded_by = auth.uid()
    OR public.is_admin()
    OR public.is_project_manager_of(project_files.project_id)
  );

-- ============================================================
-- 6. Fix project_notes SELECT policy (from migration 052)
--    Replace direct projects subquery with SECURITY DEFINER call
-- ============================================================
DROP POLICY IF EXISTS "project_notes_select_policy" ON project_notes;

CREATE POLICY "project_notes_select_policy" ON project_notes
  FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR public.is_project_manager_of(project_notes.project_id)
    OR public.is_project_member(project_notes.project_id)
    OR (project_notes.is_private = true AND project_notes.user_id = auth.uid())
  );

-- ============================================================
-- 7. Fix tasks_select_policy to allow project members to see
--    tasks belonging to their projects (fixes the 500 on tasks query)
-- ============================================================
DROP POLICY IF EXISTS "tasks_select_policy" ON tasks;

CREATE POLICY "tasks_select_policy" ON tasks
  FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR assigned_to = auth.uid()
    OR assigned_by = auth.uid()
    OR (
      public.is_manager_or_admin()
      AND (
        tasks.department_id = public.get_my_department_id()
        OR EXISTS (
          SELECT 1 FROM public.users teammate
          WHERE teammate.team_id = public.get_my_team_id()
            AND teammate.id = tasks.assigned_to
        )
      )
    )
    OR (
      tasks.project_id IS NOT NULL
      AND (
        public.is_project_member(tasks.project_id)
        OR public.is_project_manager_of(tasks.project_id)
      )
    )
  );
