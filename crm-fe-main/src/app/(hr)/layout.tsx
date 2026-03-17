"use client";

import { useAuth, useIsAdmin } from "@/providers/auth-provider";
import { AppShell } from "@/components/layout/app-shell";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function HRLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const isAdmin = useIsAdmin();
  const router = useRouter();

  // Check if user has HR access (Admin or HR department)
  const isHRAccessible = isAdmin || user?.departmentSlug === "hr";

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
      <div className="p-4 lg:p-6 h-full">{children}</div>
    </AppShell>
  );
}
