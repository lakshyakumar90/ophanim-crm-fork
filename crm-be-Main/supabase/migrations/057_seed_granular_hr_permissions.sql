-- ============================================================
-- Migration: 057_seed_granular_hr_permissions.sql
-- Seed newly introduced granular HR permissions into HR roles
-- ============================================================

WITH role_updates AS (
  SELECT *
  FROM (
    VALUES
      (
        'hr-employee'::text,
        ARRAY[
          'hr:dashboard_view',
          'hr:employees_view',
          'hr:compensation_view',
          'hr:leave_view',
          'hr:documents_view',
          'hr:analytics_view'
        ]::text[]
      ),
      (
        'hr-manager'::text,
        ARRAY[
          'hr:dashboard_view',
          'hr:employees_view',
          'hr:employees_edit',
          'hr:compensation_view',
          'hr:leave_view',
          'hr:leave_manage',
          'hr:leave_approve',
          'hr:attendance_view',
          'hr:attendance_manage',
          'hr:documents_view',
          'hr:documents_manage',
          'hr:analytics_view',
          'hr:analytics_export'
        ]::text[]
      ),
      (
        'hr-director'::text,
        ARRAY[
          'hr:dashboard_view',
          'hr:employees_view',
          'hr:employees_edit',
          'hr:compensation_view',
          'hr:compensation_edit',
          'hr:leave_view',
          'hr:leave_manage',
          'hr:leave_approve',
          'hr:attendance_view',
          'hr:attendance_manage',
          'hr:documents_view',
          'hr:documents_manage',
          'hr:documents_delete',
          'hr:analytics_view',
          'hr:analytics_export'
        ]::text[]
      )
  ) AS updates(slug, new_permissions)
)
UPDATE roles r
SET
  permissions = (
    SELECT ARRAY(
      SELECT DISTINCT p
      FROM unnest(COALESCE(r.permissions, ARRAY[]::text[]) || ru.new_permissions) AS p
      ORDER BY p
    )
  ),
  updated_at = NOW()
FROM role_updates ru
WHERE r.slug = ru.slug;
