import type { User } from "@/types";

function hasAnyPermission(user: User | null | undefined, keys: string[]): boolean {
  if (!user) return false;
  const perms = user.permissions ?? [];
  if (perms.includes("crm:admin")) return true;
  return keys.some((k) => perms.includes(k));
}

function hasPermissionPrefix(user: User | null | undefined, prefix: string): boolean {
  if (!user) return false;
  const perms = user.permissions ?? [];
  if (perms.includes("crm:admin")) return true;
  return perms.some((p) => p.startsWith(prefix));
}

export function canAccessSalesDashboard(user: User | null | undefined): boolean {
  if (!user) return false;
  if (user.role === "admin") return true;
  if (user.departmentSlug === "sales") return true;
  return hasAnyPermission(user, [
    "leads:view",
    "leads:create",
    "leads:edit",
    "quotes:view",
  ]);
}

export function canAccessFinance(user: User | null | undefined): boolean {
  if (!user) return false;
  if (user.role === "admin") return true;
  if (user.departmentSlug === "finance") return true;
  return (
    hasPermissionPrefix(user, "finance:") ||
    hasPermissionPrefix(user, "invoices:") ||
    hasPermissionPrefix(user, "payments:") ||
    hasPermissionPrefix(user, "expenses:") ||
    hasPermissionPrefix(user, "budgets:")
  );
}

export function canAccessProjects(user: User | null | undefined): boolean {
  if (!user) return false;
  if (user.role === "admin") return true;
  if (user.departmentSlug === "project-management") return true;
  if (user.isGlobal) return true;
  return hasAnyPermission(user, [
    "projects:view",
    "projects:create",
    "projects:edit",
    "timesheets:view",
    "milestones:view",
  ]);
}
