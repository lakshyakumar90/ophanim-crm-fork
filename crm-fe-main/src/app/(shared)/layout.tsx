"use client";

import { AppShell } from "@/components/layout/app-shell";

export default function SharedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppShell>
      <div className="p-4 lg:p-6 h-full">{children}</div>
    </AppShell>
  );
}
