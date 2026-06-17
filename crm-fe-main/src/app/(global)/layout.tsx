"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useIsAdmin, useAuth } from "@/providers/auth-provider";
import { AppShell } from "@/components/layout/app-shell";
import { StartupAlertsDialog } from "@/components/notifications/startup-alerts-dialog";

export default function GlobalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isLoading, user } = useAuth();
  const isAdmin = useIsAdmin();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && user && !isAdmin) {
      if (user.departmentSlug) {
        router.replace(`/${user.departmentSlug}`);
      } else {
        // Fallback or error state
        router.replace("/");
      }
    }
  }, [isLoading, user, isAdmin, router]);

  if (isLoading) {
    return null;
  }

  // If unauthorized, don't render content (effect will redirect)
  if (!isAdmin) {
    return null;
  }

  return (
    <AppShell>
      <StartupAlertsDialog />
      <div className="p-3 lg:p-4 h-full">{children}</div>
    </AppShell>
  );
}
