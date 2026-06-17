"use client";

import { useEffect, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/providers/auth-provider";
import { AppShell } from "@/components/layout/app-shell";
import { StartupAlertsDialog } from "@/components/notifications/startup-alerts-dialog";
import { canAccessProjects } from "@/lib/projects-scope";
import { cn } from "@/lib/utils";

export default function ProjectsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const isAccessible = useMemo(() => canAccessProjects(user), [user]);
  const isProjectDetail = /^\/projects\/[^/]+/.test(pathname);

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
      <div className={cn("h-full min-h-0", !isProjectDetail && "p-4 lg:p-6")}>{children}</div>
    </AppShell>
  );
}
