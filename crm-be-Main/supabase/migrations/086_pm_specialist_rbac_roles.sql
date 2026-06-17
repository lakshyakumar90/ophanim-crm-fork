-- ============================================================
-- Migration: 086_pm_specialist_rbac_roles.sql
-- Add PM job-title RBAC roles missing from the original seed:
-- Designer, SEO Specialist, Content Writer
-- ============================================================

WITH pm_dept AS (
  SELECT id
  FROM departments
  WHERE slug = 'project-management'
  LIMIT 1
),
pm_employee_permissions AS (
  SELECT ARRAY[
    'projects:view',
    'analytics:view_own',
    'timesheets:view',
    'timesheets:manage'
  ]::text[] AS perms
)
INSERT INTO roles (
  name,
  slug,
  scope,
  department_id,
  permissions,
  is_system
)
SELECT
  r.name,
  r.slug,
  'department',
  (SELECT id FROM pm_dept),
  (SELECT perms FROM pm_employee_permissions),
  true
FROM (
  VALUES
    ('Designer', 'designer'),
    ('SEO Specialist', 'seo-specialist'),
    ('Content Writer', 'content-writer')
) AS r(name, slug)
WHERE EXISTS (SELECT 1 FROM pm_dept)
ON CONFLICT (slug) DO UPDATE
SET
  name = EXCLUDED.name,
  scope = EXCLUDED.scope,
  department_id = EXCLUDED.department_id,
  permissions = (
    SELECT ARRAY(
      SELECT DISTINCT p
      FROM unnest(
        COALESCE(roles.permissions, ARRAY[]::text[]) || EXCLUDED.permissions
      ) AS p
      ORDER BY p
    )
  ),
  is_system = true,
  updated_at = NOW();

-- Backfill role assignments from job_title for PM specialists
DO $$
DECLARE
  mapping RECORD;
  target_role_id UUID;
BEGIN
  FOR mapping IN
    SELECT *
    FROM (
      VALUES
        ('designer'::text, 'designer'::text),
        ('seo_specialist', 'seo-specialist'),
        ('content_writer', 'content-writer')
    ) AS m(job_title, role_slug)
  LOOP
    SELECT id INTO target_role_id
    FROM roles
    WHERE slug = mapping.role_slug
    LIMIT 1;

    IF target_role_id IS NULL THEN
      CONTINUE;
    END IF;

    INSERT INTO user_roles (user_id, role_id)
    SELECT u.id, target_role_id
    FROM users u
    WHERE u.is_active = true
      AND u.job_title = mapping.job_title
    ON CONFLICT (user_id, role_id) DO NOTHING;
  END LOOP;
END $$;
