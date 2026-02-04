"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/auth-provider";
import { Loader2 } from "lucide-react";

export default function RootPage() {
  const router = useRouter();
  const { user, isLoading, isAuthenticated } = useAuth();

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated || !user) {
      router.replace("/login");
      return;
    }

    // Admin goes to global dashboard
    if (user.role === "admin") {
      router.replace("/global");
      return;
    }

    // Managers without a department go to Projects (they are Project Managers)
    if (user.role === "manager" && !user.departmentSlug) {
      router.replace("/projects");
      return;
    }

    // Employees and Managers with departments go to their department dashboard
    if (user.departmentSlug) {
      router.replace(`/${user.departmentSlug}`);
      return;
    }

    // Employees without a department go to Projects (they work on projects)
    if (user.role === "employee" && !user.departmentSlug) {
      router.replace("/projects");
      return;
    }
  }, [user, isLoading, isAuthenticated, router]);

  return (
    <div className="flex flex-col h-screen w-screen items-center justify-center bg-slate-950 text-white gap-4">
      <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      <p className="text-muted-foreground animate-pulse">
        Loading workspace...
      </p>
    </div>
  );
}
