"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/auth-provider";
import { useThemeSync } from "@/providers/theme-sync";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { Header } from "@/components/layout/header";
import { Skeleton } from "@/components/ui/skeleton";
import { useDepartment } from "@/providers/department-context";
import { HeaderRefreshProvider } from "@/providers/header-refresh-provider";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { isLoading, isAuthenticated } = useAuth();
  const { isLoading: isDeptLoading } = useDepartment();
  const router = useRouter();

  useThemeSync();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading || !isAuthenticated || isDeptLoading) {
    return (
      <div className="flex h-screen">
        <div className="w-64 space-y-4 bg-muted p-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>
        <div className="flex flex-1 flex-col">
          <div className="flex h-16 items-center border-b px-4">
            <Skeleton className="h-8 w-64" />
          </div>
          <div className="flex-1 p-6">
            <Skeleton className="mb-4 h-32 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <HeaderRefreshProvider>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset className="flex h-screen flex-col overflow-hidden">
          <Header />
          <main className="min-h-0 flex-1 overflow-y-auto">{children}</main>
        </SidebarInset>
      </SidebarProvider>
    </HeaderRefreshProvider>
  );
}
