// ============================================================
// Permission Key Registry
// Single source of truth for all permission keys in the CRM.
// When adding new features, add permission keys here FIRST,
// then seed them into the relevant roles, then gate the feature.
// ============================================================

export const PERMISSIONS = {
  leads: {
    label: "Leads",
    keys: {
      "leads:view": "View leads",
      "leads:create": "Create leads",
      "leads:import": "Import leads",
      "leads:export": "Export leads",
      "leads:edit": "Edit leads",
      "leads:delete": "Delete leads",
      "leads:assign": "Assign leads to users",
    } as const,
  },
  projects: {
    label: "Projects",
    keys: {
      "projects:view": "View projects",
      "projects:create": "Create projects",
      "projects:edit": "Edit project details",
      "projects:close": "Close / archive projects",
      "projects:assign_member": "Assign members to projects",
    } as const,
  },
  employees: {
    label: "Employees",
    keys: {
      "employees:view": "View employee profiles",
      "employees:create": "Add new employees",
      "employees:edit": "Edit employee details",
      "employees:manage": "Full employee management (delete, deactivate)",
    } as const,
  },
  analytics: {
    label: "Analytics",
    keys: {
      "analytics:view_own": "View own analytics",
      "analytics:view_team": "View team analytics",
      "analytics:view_all": "View all analytics (org-wide)",
    } as const,
  },
  finance: {
    label: "Finance",
    keys: {
      "finance:view": "View finance records",
      "finance:manage": "Manage finance (create, edit, approve)",
    } as const,
  },
  hr: {
    label: "HR",
    keys: {
      "hr:view": "View HR records",
      "hr:manage": "Manage HR (leaves, attendance, holidays)",
    } as const,
  },
  admin: {
    label: "Administration",
    keys: {
      "roles:manage": "Create and edit roles",
      "departments:manage": "Manage departments",
      "crm:admin": "Full CRM admin access (superuser)",
    } as const,
  },
} as const;

// Flat array of all valid permission key strings
export const ALL_PERMISSION_KEYS: string[] = Object.values(PERMISSIONS).flatMap(
  (group) => Object.keys(group.keys),
);

export type PermissionKey = string;

// Permission groups for use in the role builder UI
export type PermissionGroup = {
  id: string;
  label: string;
  keys: { key: string; label: string }[];
};

export const PERMISSION_GROUPS: PermissionGroup[] = Object.entries(
  PERMISSIONS,
).map(([id, group]) => ({
  id,
  label: group.label,
  keys: Object.entries(group.keys).map(([key, label]) => ({ key, label })),
}));
