-- ============================================================
-- Migration 049: Dynamic RBAC System
-- Creates roles, user_roles, resolved permissions view, RLS,
-- and seeds system roles. Backfills existing users.
-- ============================================================

-- ----------------------------------------------------------------
-- 1. ROLES TABLE
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  scope TEXT NOT NULL DEFAULT 'department'
    CHECK (scope IN ('global', 'department')),
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  permissions TEXT[] NOT NULL DEFAULT '{}',
  is_system BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT department_required_for_dept_scope
    CHECK (scope = 'global' OR department_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_roles_scope ON roles(scope);
CREATE INDEX IF NOT EXISTS idx_roles_department ON roles(department_id);

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS roles_updated_at ON roles;
CREATE TRIGGER roles_updated_at
  BEFORE UPDATE ON roles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------------------------------
-- 2. USER_ROLES JUNCTION TABLE
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(user_id, role_id)
);

CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role_id);

-- ----------------------------------------------------------------
-- 3. HELPER FUNCTION: check if current user has a permission
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION current_user_has_permission(perm TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid()
      AND perm = ANY(r.permissions)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ----------------------------------------------------------------
-- 4. ROW LEVEL SECURITY
-- ----------------------------------------------------------------
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Roles: everyone can read, only crm:admin can write
DROP POLICY IF EXISTS "roles_read" ON roles;
CREATE POLICY "roles_read" ON roles FOR SELECT USING (true);

DROP POLICY IF EXISTS "roles_write" ON roles;
CREATE POLICY "roles_write" ON roles FOR ALL
  USING (current_user_has_permission('roles:manage'));

-- User roles: users can read own assignments, admin can read all
DROP POLICY IF EXISTS "user_roles_read_own" ON user_roles;
CREATE POLICY "user_roles_read_own" ON user_roles FOR SELECT
  USING (user_id = auth.uid() OR current_user_has_permission('crm:admin'));

DROP POLICY IF EXISTS "user_roles_write" ON user_roles;
CREATE POLICY "user_roles_write" ON user_roles FOR ALL
  USING (current_user_has_permission('crm:admin'));

-- ----------------------------------------------------------------
-- 5. RESOLVED PERMISSIONS VIEW (single source of truth)
-- ----------------------------------------------------------------
CREATE OR REPLACE VIEW user_resolved_permissions AS
SELECT
  ur.user_id,
  array_agg(DISTINCT p) AS permissions,
  array_agg(DISTINCT r.department_id) FILTER (WHERE r.department_id IS NOT NULL) AS department_ids,
  bool_or(r.scope = 'global') AS is_global,
  array_agg(DISTINCT r.id) AS role_ids,
  array_agg(DISTINCT r.name) AS role_names
FROM user_roles ur
JOIN roles r ON r.id = ur.role_id
CROSS JOIN LATERAL unnest(r.permissions) AS p
GROUP BY ur.user_id;

-- ----------------------------------------------------------------
-- 6. SEED SYSTEM ROLES
-- ----------------------------------------------------------------
DO $$
DECLARE
  sales_id    UUID;
  dev_id      UUID;
  hr_id       UUID;
  finance_id  UUID;
BEGIN
  SELECT id INTO sales_id   FROM departments WHERE slug = 'sales'              LIMIT 1;
  SELECT id INTO dev_id     FROM departments WHERE slug = 'project-management' LIMIT 1;
  SELECT id INTO hr_id      FROM departments WHERE slug = 'hr'                 LIMIT 1;
  SELECT id INTO finance_id FROM departments WHERE slug = 'finance'            LIMIT 1;

  INSERT INTO roles (name, slug, scope, department_id, permissions, is_system) VALUES

    -- Global admin
    ('Admin', 'admin', 'global', NULL,
      ARRAY[
        'leads:view','leads:create','leads:edit','leads:delete','leads:assign',
        'projects:view','projects:create','projects:edit','projects:close','projects:assign_member',
        'employees:view','employees:create','employees:edit','employees:manage',
        'analytics:view_own','analytics:view_team','analytics:view_all',
        'finance:view','finance:manage',
        'hr:view','hr:manage',
        'roles:manage','departments:manage','crm:admin'
      ], true),

    -- Sales department
    ('Sales Manager', 'sales-manager', 'department', sales_id,
      ARRAY[
        'leads:view','leads:create','leads:edit','leads:assign',
        'projects:view','analytics:view_team','analytics:view_own'
      ], true),

    ('Sales Executive', 'sales-executive', 'department', sales_id,
      ARRAY[
        'leads:view','leads:create','analytics:view_own'
      ], true),

    -- Project Management department
    ('Project Manager', 'project-manager', 'department', dev_id,
      ARRAY[
        'projects:view','projects:create','projects:edit','projects:assign_member',
        'employees:view','analytics:view_team','analytics:view_own'
      ], true),

    ('Developer', 'developer', 'department', dev_id,
      ARRAY[
        'projects:view','analytics:view_own'
      ], true),

    -- HR department
    ('HR Manager', 'hr-manager', 'department', hr_id,
      ARRAY[
        'employees:view','employees:create','employees:edit','employees:manage',
        'hr:view','hr:manage','analytics:view_team','analytics:view_own'
      ], true),

    ('HR Employee', 'hr-employee', 'department', hr_id,
      ARRAY[
        'employees:view','hr:view','analytics:view_own'
      ], true),

    -- Finance department
    ('Finance Manager', 'finance-manager', 'department', finance_id,
      ARRAY[
        'finance:view','finance:manage',
        'analytics:view_team','analytics:view_own'
      ], true),

    ('Finance Employee', 'finance-employee', 'department', finance_id,
      ARRAY[
        'finance:view','analytics:view_own'
      ], true),

    -- Cross-org operations
    ('Operations', 'operations', 'global', NULL,
      ARRAY[
        'leads:view','projects:view','employees:view',
        'analytics:view_team','analytics:view_all'
      ], true)

  ON CONFLICT (slug) DO UPDATE
    SET permissions = EXCLUDED.permissions,
        department_id = EXCLUDED.department_id,
        updated_at = now();
END $$;

-- ----------------------------------------------------------------
-- 7. BACKFILL: Auto-assign system roles to existing users
--    based on their current role + department
-- ----------------------------------------------------------------
DO $$
DECLARE
  u RECORD;
  target_role_id UUID;
  dept_slug TEXT;
BEGIN
  FOR u IN
    SELECT id, role, department_id FROM users WHERE is_active = true
  LOOP
    dept_slug := NULL;

    -- Get user's department slug if they have one
    IF u.department_id IS NOT NULL THEN
      SELECT slug INTO dept_slug FROM departments WHERE id = u.department_id;
    END IF;

    target_role_id := NULL;

    IF u.role = 'admin' THEN
      SELECT id INTO target_role_id FROM roles WHERE slug = 'admin';

    ELSIF u.role = 'manager' THEN
      CASE dept_slug
        WHEN 'sales'              THEN SELECT id INTO target_role_id FROM roles WHERE slug = 'sales-manager';
        WHEN 'project-management' THEN SELECT id INTO target_role_id FROM roles WHERE slug = 'project-manager';
        WHEN 'hr'                 THEN SELECT id INTO target_role_id FROM roles WHERE slug = 'hr-manager';
        WHEN 'finance'            THEN SELECT id INTO target_role_id FROM roles WHERE slug = 'finance-manager';
        ELSE                           SELECT id INTO target_role_id FROM roles WHERE slug = 'sales-manager';
      END CASE;

    ELSIF u.role = 'employee' THEN
      CASE dept_slug
        WHEN 'sales'              THEN SELECT id INTO target_role_id FROM roles WHERE slug = 'sales-executive';
        WHEN 'project-management' THEN SELECT id INTO target_role_id FROM roles WHERE slug = 'developer';
        WHEN 'hr'                 THEN SELECT id INTO target_role_id FROM roles WHERE slug = 'hr-employee';
        WHEN 'finance'            THEN SELECT id INTO target_role_id FROM roles WHERE slug = 'finance-employee';
        ELSE                           SELECT id INTO target_role_id FROM roles WHERE slug = 'sales-executive';
      END CASE;
    END IF;

    IF target_role_id IS NOT NULL THEN
      INSERT INTO user_roles (user_id, role_id)
      VALUES (u.id, target_role_id)
      ON CONFLICT (user_id, role_id) DO NOTHING;
    END IF;
  END LOOP;
END $$;

-- ----------------------------------------------------------------
-- 8. RPCs for role assignment (callable from frontend or backend)
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION assign_role_to_user(target_user_id UUID, p_role_id UUID)
RETURNS void AS $$
BEGIN
  IF NOT current_user_has_permission('crm:admin') THEN
    RAISE EXCEPTION 'Insufficient permissions: crm:admin required';
  END IF;
  INSERT INTO user_roles (user_id, role_id, assigned_by)
    VALUES (target_user_id, p_role_id, auth.uid())
  ON CONFLICT (user_id, role_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION remove_role_from_user(target_user_id UUID, p_role_id UUID)
RETURNS void AS $$
BEGIN
  IF NOT current_user_has_permission('crm:admin') THEN
    RAISE EXCEPTION 'Insufficient permissions: crm:admin required';
  END IF;
  DELETE FROM user_roles WHERE user_id = target_user_id AND role_id = p_role_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
