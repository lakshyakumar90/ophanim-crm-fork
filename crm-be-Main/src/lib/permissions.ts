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
      "hr:dashboard_view": "View HR overview dashboard and alert feeds",
      "hr:employees_view": "View employee directory and profiles",
      "hr:employees_edit": "Edit employee personal and employment records",
      "hr:compensation_view": "View employee compensation details",
      "hr:compensation_edit": "Edit employee compensation details",
      "hr:leave_view": "View leave requests and balances",
      "hr:leave_manage": "Create and manage leave requests",
      "hr:leave_approve": "Approve or reject leave requests",
      "hr:attendance_view": "View attendance records and summaries",
      "hr:attendance_manage": "Manage attendance corrections and imports",
      "hr:documents_view": "View employee HR documents",
      "hr:documents_manage": "Upload and verify employee HR documents",
      "hr:documents_delete": "Delete employee HR documents",
      "hr:analytics_view": "View HR analytics and reports",
      "hr:analytics_export": "Export HR analytics reports",
    } as const,
  },
  recruitment: {
    label: "Recruitment",
    keys: {
      "recruitment:view": "View recruitment pipeline and job postings",
      "recruitment:manage": "Manage candidates, job postings, interviews, and offers",
    } as const,
  },
  payroll: {
    label: "Payroll",
    keys: {
      "payroll:view": "View payroll runs and salary data",
      "payroll:manage": "Manage payroll runs, salary bands, and increments",
      "payroll:approve": "Approve and disburse payroll runs (Director only)",
    } as const,
  },
  performance: {
    label: "Performance",
    keys: {
      "performance:view": "View performance reviews and cycles",
      "performance:manage": "Manage review cycles, goals, and calibration",
      "performance:review": "Write performance reviews as a manager",
    } as const,
  },
  onboarding: {
    label: "Onboarding",
    keys: {
      "onboarding:view": "View onboarding and offboarding checklists",
      "onboarding:manage": "Manage onboarding/offboarding workflows and templates",
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
