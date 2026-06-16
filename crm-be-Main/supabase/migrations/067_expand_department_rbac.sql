-- Migration 067: Expand department RBAC permissions across all modules

WITH role_updates AS (
  SELECT *
  FROM (
    VALUES
      (
        'admin'::text,
        ARRAY[
          'leads:convert',
          'tasks:view', 'tasks:create', 'tasks:edit', 'tasks:delete', 'tasks:assign',
          'finance:client_portal',
          'invoices:view', 'invoices:manage', 'invoices:approve',
          'payments:view', 'payments:manage',
          'expenses:view', 'expenses:manage', 'expenses:approve',
          'budgets:view', 'budgets:manage',
          'quotes:view', 'quotes:manage', 'quotes:approve', 'quotes:send',
          'commissions:view', 'commissions:manage',
          'timesheets:view', 'timesheets:manage', 'timesheets:approve',
          'milestones:view', 'milestones:manage',
          'assets:view', 'assets:manage',
          'skills:view', 'skills:manage',
          'benefits:view', 'benefits:manage'
        ]::text[]
      ),
      (
        'sales-manager'::text,
        ARRAY[
          'leads:convert',
          'tasks:view', 'tasks:create', 'tasks:edit', 'tasks:delete', 'tasks:assign',
          'quotes:view', 'quotes:manage', 'quotes:approve', 'quotes:send',
          'commissions:view', 'commissions:manage'
        ]::text[]
      ),
      (
        'sales-executive'::text,
        ARRAY[
          'leads:convert',
          'tasks:view', 'tasks:create',
          'quotes:view', 'quotes:manage',
          'commissions:view'
        ]::text[]
      ),
      (
        'finance-manager'::text,
        ARRAY[
          'finance:client_portal',
          'invoices:view', 'invoices:manage', 'invoices:approve',
          'payments:view', 'payments:manage',
          'expenses:view', 'expenses:manage', 'expenses:approve',
          'budgets:view', 'budgets:manage'
        ]::text[]
      ),
      (
        'finance-employee'::text,
        ARRAY[
          'invoices:view',
          'payments:view',
          'expenses:view'
        ]::text[]
      ),
      (
        'project-manager'::text,
        ARRAY[
          'timesheets:view', 'timesheets:manage', 'timesheets:approve',
          'milestones:view', 'milestones:manage'
        ]::text[]
      ),
      (
        'developer'::text,
        ARRAY[
          'timesheets:view', 'timesheets:manage'
        ]::text[]
      ),
      (
        'hr-manager'::text,
        ARRAY[
          'assets:view', 'assets:manage',
          'skills:view', 'skills:manage',
          'benefits:view', 'benefits:manage'
        ]::text[]
      ),
      (
        'hr-director'::text,
        ARRAY[
          'assets:view', 'assets:manage',
          'skills:view', 'skills:manage',
          'benefits:view', 'benefits:manage'
        ]::text[]
      ),
      (
        'hr-employee'::text,
        ARRAY[
          'assets:view',
          'skills:view',
          'benefits:view'
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
