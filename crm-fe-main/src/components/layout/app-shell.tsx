"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/auth-provider";
import { useThemeSync } from "@/providers/theme-sync";
import { usePrimaryColorSync } from "@/providers/color-sync";
import { Sidebar, Header } from "@/components/layout";
import { Skeleton } from "@/components/ui/skeleton";
import { useDepartment } from "@/providers/department-context";
import { HeaderRefreshProvider } from "@/providers/header-refresh-provider";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { isLoading, isAuthenticated } = useAuth();
  const { isLoading: isDeptLoading } = useDepartment();
  const router = useRouter();

  // Sync user's theme preference from database
  useThemeSync();
  // Sync user's primary color preference
  usePrimaryColorSync();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading || !isAuthenticated || isDeptLoading) {
    return (
      <div className="flex h-screen">
        <div className="w-64 bg-muted p-4 space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>
        <div className="flex-1 flex flex-col">
          <div className="h-16 border-b px-4 flex items-center">
            <Skeleton className="h-8 w-64" />
          </div>
          <div className="flex-1 p-6">
            <Skeleton className="h-32 w-full mb-4" />
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <HeaderRefreshProvider>
      <div className="flex h-screen bg-background overflow-hidden">
        {/* Desktop sidebar */}
        <div className="hidden lg:block">
          <Sidebar />
        </div>

        {/* Main content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
        </div>
      </div>
    </HeaderRefreshProvider>
  );
}
