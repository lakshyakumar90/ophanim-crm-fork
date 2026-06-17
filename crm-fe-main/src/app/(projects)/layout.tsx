"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/auth-provider";
import { AppShell } from "@/components/layout/app-shell";
import { StartupAlertsDialog } from "@/components/notifications/startup-alerts-dialog";
import { canAccessProjects } from "@/lib/projects-scope";

export default function ProjectsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const isAccessible = useMemo(() => canAccessProjects(user), [user]);

  useEffect(() => {
    if (!isLoading && !isAccessible) {
      router.push("/forbidden");
    }
  }, [isLoading, isAccessible, router]);

  if (isLoading) {
    return (
      <AppShell>
        <div className="flex h-full items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
        </div>
      </AppShell>
    );
  }

  if (!isAccessible) return null;

  return (
    <AppShell>
      <StartupAlertsDialog />
      <div className="h-full min-h-0">{children}</div>
    </AppShell>
  );
}
