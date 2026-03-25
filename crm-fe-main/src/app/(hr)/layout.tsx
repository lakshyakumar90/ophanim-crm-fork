"use client";

import { useAuth, useIsAdmin } from "@/providers/auth-provider";
import { AppShell } from "@/components/layout/app-shell";
import { StartupAlertsDialog } from "@/components/notifications/startup-alerts-dialog";
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

function hasOnboardingModuleAccess(user: { permissions?: string[]; role?: string; departmentSlug?: string | null } | null): boolean {
  if (!user) return false;
  if (user.role === "admin") return true;
  if (user.departmentSlug === "hr") return true;
  const p = user.permissions ?? [];
  return (
    p.includes("crm:admin")
  );
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

export default function HRLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const isAdmin = useIsAdmin();
  const router = useRouter();
  const pathname = usePathname();

  const isMyPayslipsPath =
    pathname === "/hr/payroll/my-payslips" ||
    (pathname?.startsWith("/hr/payroll/my-payslips/") ?? false);
  const payrollRoute = pathname?.startsWith("/hr/payroll") ?? false;
  const isOnboardingAdminPath =
    pathname === "/hr/onboarding" ||
    (pathname?.startsWith("/hr/onboarding/") ?? false);
  const isPerformanceHrPath = pathname?.startsWith("/hr/performance") ?? false;

  const isHRAccessible = useMemo(() => {
    if (!user) return false;
    // Self-service pages should be accessible even without payroll:* permissions.
    if (isMyPayslipsPath) return true;
    if (isAdmin || user.departmentSlug === "hr") return true;
    if (payrollRoute && hasPayrollAccess(user)) return true;
    if (isOnboardingAdminPath && hasOnboardingModuleAccess(user)) return true;
    if (isPerformanceHrPath && hasPerformanceHrAccess(user)) return true;
    return false;
  }, [user, isAdmin, payrollRoute, isOnboardingAdminPath, isPerformanceHrPath]);

  useEffect(() => {
    if (!isLoading && !isHRAccessible) {
      router.push("/forbidden");
    }
  }, [isLoading, isHRAccessible, router]);

  if (isLoading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
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
      <div className="flex h-full min-h-0 flex-col">{children}</div>
    </AppShell>
  );
}
