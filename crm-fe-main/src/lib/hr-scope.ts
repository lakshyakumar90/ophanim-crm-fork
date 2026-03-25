import type { User } from "@/types";

export type HRScopeProfile = "admin_director" | "manager" | "employee" | "unknown";

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function hasRoleName(user: User | null | undefined, roleName: string): boolean {
  const roleNames = user?.roleNames || [];
  const target = normalize(roleName);
  return roleNames.some((name) => normalize(name) === target);
}

function hasAnyPermissionPrefix(
  user: User | null | undefined,
  prefix: string,
): boolean {
  const perms = user?.permissions || [];
  return perms.some((p) => p.startsWith(prefix));
}

export function isAdminOrDirector(user: User | null | undefined): boolean {
  if (!user) return false;
  if (user.role === "admin") return true;
  if ((user.permissions || []).includes("crm:admin")) return true;
  return hasRoleName(user, "hr director");
}

export function isHRManagerProfile(user: User | null | undefined): boolean {
  if (!user) return false;
  if (isAdminOrDirector(user)) return false;
  if (hasRoleName(user, "hr manager")) return true;
  return user.role === "manager";
}

export function getHRScopeProfile(user: User | null | undefined): HRScopeProfile {
  if (!user) return "unknown";
  if (isAdminOrDirector(user)) return "admin_director";
  if (isHRManagerProfile(user)) return "manager";
  if (user.role === "employee") return "employee";
  if (hasAnyPermissionPrefix(user, "hr:")) return "employee";
  return "unknown";
}

export function canAccessHRDashboard(user: User | null | undefined): boolean {
  if (!user) return false;
  if (isAdminOrDirector(user)) return true;
  if (user.departmentSlug === "hr") return true;
  const permissions = user.permissions || [];
  return (
    permissions.includes("hr:dashboard_view") ||
    permissions.includes("hr:view") ||
    permissions.includes("hr:manage") ||
    permissions.includes("hr:analytics_view")
  );
}
