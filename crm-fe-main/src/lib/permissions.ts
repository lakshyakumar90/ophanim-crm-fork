// ============================================================
// Permission Key Registry (Frontend)
// Mirrors crm-be-Main/src/lib/permissions.ts exactly.
// Keep both files in sync when adding new permission keys.
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
      "leads:convert": "Convert won leads to projects and invoices",
    } as const,
  },
  tasks: {
    label: "Tasks",
    keys: {
      "tasks:view": "View tasks",
      "tasks:create": "Create tasks",
      "tasks:edit": "Edit tasks",
      "tasks:delete": "Delete tasks",
      "tasks:assign": "Assign and reassign tasks",
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
      "invoices:view": "View invoices",
      "invoices:manage": "Create and edit invoices",
      "invoices:approve": "Approve or reject invoices",
      "payments:view": "View payments",
      "payments:manage": "Record and manage payments",
      "expenses:view": "View expenses",
      "expenses:manage": "Create and edit expenses",
      "expenses:approve": "Approve or reject expenses",
      "budgets:view": "View budgets",
      "budgets:manage": "Manage budgets",
    } as const,
  },
  quotes: {
    label: "Quotes",
    keys: {
      "quotes:view": "View quotes",
      "quotes:manage": "Create and edit quotes",
      "quotes:approve": "Approve quotes",
      "quotes:send": "Send quotes to clients",
    } as const,
  },
  timesheets: {
    label: "Timesheets",
    keys: {
      "timesheets:view": "View time entries",
      "timesheets:manage": "Create and edit time entries",
      "timesheets:approve": "Approve time entries",
    } as const,
  },
  milestones: {
    label: "Milestones",
    keys: {
      "milestones:view": "View project milestones",
      "milestones:manage": "Manage project milestones",
    } as const,
  },
  assets: {
    label: "Assets",
    keys: {
      "assets:view": "View company assets",
      "assets:manage": "Manage company assets",
    } as const,
  },
  skills: {
    label: "Skills",
    keys: {
      "skills:view": "View skills matrix",
      "skills:manage": "Manage skills and certifications",
    } as const,
  },
  benefits: {
    label: "Benefits",
    keys: {
      "benefits:view": "View benefit plans",
      "benefits:manage": "Manage benefit enrollments",
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
  admin: {
    label: "Administration",
    keys: {
      "roles:manage": "Create and edit roles",
      "departments:manage": "Manage departments",
      "crm:admin": "Full CRM admin access (superuser)",
    } as const,
  },
} as const;

export const ALL_PERMISSION_KEYS: string[] = Object.values(PERMISSIONS).flatMap(
  (group) => Object.keys(group.keys),
);

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

// Role types for the role builder
export interface Role {
  id: string;
  name: string;
  slug: string;
  scope: "global" | "department";
  departmentId: string | null;
  departmentIds: string[];
  departmentName?: string | null;
  departmentSlug?: string | null;
  permissions: string[];
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserRoleAssignment {
  id: string;
  userId: string;
  roleId: string;
  roleName: string;
  roleSlug: string;
  roleScope: "global" | "department";
  departmentName: string | null;
  assignedAt: string;
}
