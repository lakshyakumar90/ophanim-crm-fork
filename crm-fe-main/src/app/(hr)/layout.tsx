"use client";

import { useAuth, useIsAdmin } from "@/providers/auth-provider";
import { AppShell } from "@/components/layout/app-shell";
import { StartupAlertsDialog } from "@/components/notifications/startup-alerts-dialog";
import { canAccessHRDashboard } from "@/lib/hr-scope";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useMemo } from "react";

function hasPayrollAccess(user: { permissions?: string[]; role?: string } | null): boolean {
  if (!user) return false;
  const p = user.permissions ?? [];
  if (p.includes("crm:admin")) return true;
  if (p.some((x) => x.startsWith("payroll:"))) return true;
  if (user.role === "admin") return true;
  return false;
}

function hasPerformanceHrAccess(user: {
  permissions?: string[];
  role?: string;
} | null): boolean {
  if (!user) return false;
  const p = user.permissions ?? [];
  if (p.includes("crm:admin")) return true;
  if (
    p.includes("performance:view") ||
    p.includes("performance:manage") ||
    p.includes("performance:review")
  )
    return true;
  if (user.role === "admin" || user.role === "manager") return true;
  return false;
}

function hasBenefitsSelfService(user: { permissions?: string[] } | null): boolean {
  if (!user) return false;
  const p = user.permissions ?? [];
  return p.includes("benefits:view") || p.includes("benefits:manage") || p.includes("crm:admin");
}

function hasAnyPermissionPrefix(
  user: { permissions?: string[] } | null,
  prefixes: string[],
): boolean {
  if (!user) return false;
  const perms = user.permissions ?? [];
  if (perms.includes("crm:admin")) return true;
  return prefixes.some((prefix) => perms.some((p) => p.startsWith(prefix)));
}

const HR_MODULE_PREFIXES = [
  "assets:",
  "skills:",
  "benefits:",
  "hr:leave_",
  "hr:attendance_",
  "hr:employees_",
];

export default function HRLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const isAdmin = useIsAdmin();
  const router = useRouter();
  const pathname = usePathname();

  const isMyPayslipsPath =
    pathname === "/hr/payroll/my-payslips" ||
    (pathname?.startsWith("/hr/payroll/my-payslips/") ?? false);
  const payrollRoute = pathname?.startsWith("/hr/payroll") ?? false;
  const isPerformanceHrPath = pathname?.startsWith("/hr/performance") ?? false;
  const isBenefitsPath = pathname?.startsWith("/hr/benefits") ?? false;
  const isShiftsSelfPath = pathname === "/hr/shifts";
  const isOrgChartPath = pathname?.startsWith("/hr/org-chart") ?? false;
  const isHrRoot = pathname === "/hr";

  const isHRAccessible = useMemo(() => {
    if (!user) return false;
    if (isHrRoot) return true;
    if (isMyPayslipsPath) return true;
    if (isAdmin || canAccessHRDashboard(user)) return true;
    if (payrollRoute && hasPayrollAccess(user)) return true;
    if (isPerformanceHrPath && hasPerformanceHrAccess(user)) return true;
    if (isBenefitsPath && hasBenefitsSelfService(user)) return true;
    if (isShiftsSelfPath) return true;
    if (hasAnyPermissionPrefix(user, HR_MODULE_PREFIXES)) return true;
    if (isOrgChartPath) {
      const perms = user.permissions ?? [];
      return (
        perms.includes("hr:employees_view") ||
        perms.includes("hr:view") ||
        perms.includes("hr:manage") ||
        perms.some((p) => p.startsWith("hr:employees_"))
      );
    }
    return false;
  }, [
    user,
    isAdmin,
    payrollRoute,
    isPerformanceHrPath,
    isBenefitsPath,
    isShiftsSelfPath,
    isOrgChartPath,
    isMyPayslipsPath,
    isHrRoot,
  ]);

  useEffect(() => {
    if (!isLoading && !isHRAccessible) {
      router.push("/forbidden");
    }
  }, [isLoading, isHRAccessible, router]);

  if (isLoading) {
    return (
      <AppShell>
        <div className="flex h-full items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
        </div>
      </AppShell>
    );
  }

  if (!isHRAccessible) {
    return null;
  }

  return (
    <AppShell>
      <StartupAlertsDialog />
      <div className="h-full p-3 lg:p-4">{children}</div>
    </AppShell>
  );
}
