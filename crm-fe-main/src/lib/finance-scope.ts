import type { User } from "@/types";
import { canAccessFinance as canAccessFinanceBase } from "./department-scope";

export { canAccessFinance } from "./department-scope";

export function canManageInvoices(user: User | null | undefined): boolean {
  if (!user) return false;
  if (user.role === "admin") return true;
  const perms = user.permissions ?? [];
  if (perms.includes("crm:admin")) return true;
  return perms.includes("finance:manage") || perms.includes("invoices:manage");
}

export function canApproveInvoices(user: User | null | undefined): boolean {
  if (!user) return false;
  if (user.role === "admin") return true;
  const perms = user.permissions ?? [];
  if (perms.includes("crm:admin")) return true;
  return perms.includes("finance:manage") || perms.includes("invoices:approve");
}

export function canViewFinanceAnalytics(user: User | null | undefined): boolean {
  if (!user) return false;
  return (
    canAccessFinanceBase(user) &&
    (user.role === "admin" ||
      (user.permissions ?? []).some((p) =>
        ["finance:manage", "budgets:view", "budgets:manage", "analytics:view_team"].includes(p),
      ))
  );
}
