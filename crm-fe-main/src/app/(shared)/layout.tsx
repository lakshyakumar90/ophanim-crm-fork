"use client";

import { AppShell } from "@/components/layout/app-shell";

export default function SharedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}
