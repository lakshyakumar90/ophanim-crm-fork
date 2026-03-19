-- ============================================================
-- Migration 051: Multi-Department Roles
-- Adds department_ids UUID[] to roles table so a single role
-- can span multiple departments (e.g. a cross-dept PM role).
-- Keeps department_id for backward compatibility.
-- Updates user_resolved_permissions view to aggregate from
-- the new array column (falling back to the old column).
-- ============================================================

-- 1. Add department_ids array column (nullable, no NOT NULL)
ALTER TABLE roles ADD COLUMN IF NOT EXISTS department_ids UUID[];

-- 2. Backfill: copy existing single department_id into the array
UPDATE roles
SET department_ids = ARRAY[department_id]
WHERE department_id IS NOT NULL AND department_ids IS NULL;

-- 3. Drop the old single-column constraint
ALTER TABLE roles DROP CONSTRAINT IF EXISTS department_required_for_dept_scope;

-- 4. New constraint: department-scoped roles must have at least one dept
--    (accepts either the old column or the new array, or both)
ALTER TABLE roles ADD CONSTRAINT department_required_for_dept_scope
  CHECK (
    scope = 'global'
    OR (department_ids IS NOT NULL AND array_length(department_ids, 1) > 0)
    OR department_id IS NOT NULL
  );

-- 5. Rebuild user_resolved_permissions view to union both columns
CREATE OR REPLACE VIEW user_resolved_permissions AS
SELECT
  ur.user_id,
  array_agg(DISTINCT p)                                              AS permissions,
  array_agg(DISTINCT dept_id) FILTER (WHERE dept_id IS NOT NULL)    AS department_ids,
  bool_or(r.scope = 'global')                                        AS is_global,
  array_agg(DISTINCT r.id)                                           AS role_ids,
  array_agg(DISTINCT r.name)                                         AS role_names
FROM user_roles ur
JOIN roles r ON r.id = ur.role_id
CROSS JOIN LATERAL unnest(r.permissions) AS p
LEFT JOIN LATERAL unnest(
  COALESCE(
    r.department_ids,
    CASE WHEN r.department_id IS NOT NULL THEN ARRAY[r.department_id] ELSE NULL END
  )
) AS dept_id ON true
GROUP BY ur.user_id;
