-- Expand system role permissions for lead import/export after RBAC rollout

ALTER TABLE roles
  ALTER COLUMN permissions SET DEFAULT '{}';

UPDATE roles
SET permissions = ARRAY[
  'leads:view','leads:create','leads:import','leads:export','leads:edit','leads:delete','leads:assign',
  'projects:view','projects:create','projects:edit','projects:close','projects:assign_member',
  'employees:view','employees:create','employees:edit','employees:manage',
  'analytics:view_own','analytics:view_team','analytics:view_all',
  'finance:view','finance:manage',
  'hr:view','hr:manage',
  'roles:manage','departments:manage','crm:admin'
]
WHERE slug = 'admin';

UPDATE roles
SET permissions = ARRAY[
  'leads:view','leads:create','leads:import','leads:export','leads:edit','leads:assign',
  'projects:view','analytics:view_team','analytics:view_own'
]
WHERE slug = 'sales-manager';

UPDATE roles
SET permissions = ARRAY[
  'leads:view','leads:create','leads:import','leads:export','analytics:view_own'
]
WHERE slug = 'sales-executive';
