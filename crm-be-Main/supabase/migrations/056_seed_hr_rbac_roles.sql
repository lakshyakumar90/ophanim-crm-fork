-- ============================================================
-- Migration: 056_seed_hr_rbac_roles.sql
-- Seed HR-specific RBAC roles for full HR module coverage
-- ============================================================

WITH hr_dept AS (
  SELECT id
  FROM departments
  WHERE slug = 'hr'
  LIMIT 1
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
  (SELECT id FROM hr_dept),
  r.permissions,
  true
FROM (
  VALUES
    (
      'HR Employee',
      'hr-employee',
      ARRAY[
        'hr:view',
        'employees:view',
        'recruitment:view',
        'onboarding:view',
        'performance:view',
        'payroll:view'
      ]::text[]
    ),
    (
      'HR Manager',
      'hr-manager',
      ARRAY[
        'hr:view',
        'hr:manage',
        'employees:view',
        'employees:edit',
        'recruitment:view',
        'recruitment:manage',
        'onboarding:view',
        'onboarding:manage',
        'performance:view',
        'performance:manage',
        'performance:review',
        'payroll:view',
        'payroll:manage'
      ]::text[]
    ),
    (
      'HR Director',
      'hr-director',
      ARRAY[
        'hr:view',
        'hr:manage',
        'employees:view',
        'employees:edit',
        'employees:manage',
        'recruitment:view',
        'recruitment:manage',
        'onboarding:view',
        'onboarding:manage',
        'performance:view',
        'performance:manage',
        'performance:review',
        'payroll:view',
        'payroll:manage',
        'payroll:approve'
      ]::text[]
    )
) AS r(name, slug, permissions)
WHERE EXISTS (SELECT 1 FROM hr_dept)
ON CONFLICT (slug) DO UPDATE
SET
  scope = EXCLUDED.scope,
  department_id = EXCLUDED.department_id,
  permissions = EXCLUDED.permissions,
  is_system = true,
  updated_at = NOW();
