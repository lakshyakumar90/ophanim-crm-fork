-- Migration 052: Fix project_members RLS infinite recursion + add project_notes policy
-- The previous policy (033) contained a self-referential subquery on project_members
-- which caused infinite recursion when Supabase evaluates the policy.
-- Fix: use a SECURITY DEFINER helper function that bypasses RLS when checking membership.

-- ============================================================
-- 1. SECURITY DEFINER helper — bypasses RLS when called so the
--    project_members policy can safely check membership without
--    triggering itself recursively.
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_project_member(p_project_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM project_members
    WHERE project_id = p_project_id
      AND user_id = auth.uid()
  )
$$;

GRANT EXECUTE ON FUNCTION public.is_project_member(UUID) TO authenticated;

-- ============================================================
-- 2. Rewrite project_members SELECT policy — no self-reference
-- ============================================================

DROP POLICY IF EXISTS "project_members_select_policy" ON project_members;

CREATE POLICY "project_members_select_policy" ON project_members
  FOR SELECT TO authenticated
  USING (
    -- Global admins see everything
    public.is_admin()
    -- Each user can always see their own membership row
    OR user_id = auth.uid()
    -- Project managers can see all members of their project
    OR EXISTS (
      SELECT 1 FROM public.projects
      WHERE id = project_members.project_id
        AND manager_id = auth.uid()
    )
    -- Any project member can see other members of shared projects
    -- (uses SECURITY DEFINER helper to avoid recursive policy trigger)
    OR public.is_project_member(project_members.project_id)
  );

-- ============================================================
-- 3. Add project_notes SELECT policy
-- (RLS was enabled on the table but no SELECT policy existed,
--  causing all direct Supabase reads to be denied)
-- ============================================================

DROP POLICY IF EXISTS "project_notes_select_policy" ON project_notes;

CREATE POLICY "project_notes_select_policy" ON project_notes
  FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR public.is_project_member(project_id)
    OR EXISTS (
      SELECT 1 FROM public.projects
      WHERE id = project_notes.project_id
        AND manager_id = auth.uid()
    )
  );
