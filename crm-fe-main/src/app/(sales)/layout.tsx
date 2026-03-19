"use client";

import { AppShell } from "@/components/layout/app-shell";
import { StartupAlertsDialog } from "@/components/notifications/startup-alerts-dialog";

export default function SalesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppShell>
      <StartupAlertsDialog />
      <div className="p-4 lg:p-6 h-full">{children}</div>
    </AppShell>
  );
}
