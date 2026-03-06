"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from "react";
import { useAuth } from "@/providers/auth-provider";
import { usePathname, useRouter } from "next/navigation";
import { Department } from "@/types";
import { departmentsApi } from "@/lib/api";

interface DepartmentContextType {
  currentDepartment: Department | null;
  isGlobalContext: boolean;
  departments: Department[];
  isLoading: boolean;
  switchDepartment: (slug: string | null) => void;
  refreshDepartments: () => Promise<void>;
}

const DepartmentContext = createContext<DepartmentContextType | undefined>(
  undefined,
);

export function DepartmentProvider({ children }: { children: ReactNode }) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [currentDepartment, setCurrentDepartment] = useState<Department | null>(
    null,
  );
  const [isGlobalContext, setIsGlobalContext] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  // Fetch all departments
  const fetchDepartments = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      const data = await departmentsApi.list();
      setDepartments(data);
    } catch (error) {
      console.error("Failed to fetch departments", error);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  // Initial fetch
  useEffect(() => {
    if (!isAuthLoading && isAuthenticated) {
      fetchDepartments();
    } else if (!isAuthLoading && !isAuthenticated) {
      setIsLoading(false);
    }
  }, [fetchDepartments, isAuthLoading, isAuthenticated]);

  // Determine context based on URL
  useEffect(() => {
    if (!pathname) return;

    // Check if we are in global context
    if (pathname.startsWith("/global")) {
      setIsGlobalContext(true);
      setCurrentDepartment(null);
      return;
    }

    // Check if we are in a sales context (currently hardcoded as the only dept)
    // In future, this would check against all department slugs
    // But for now, we know we only have 'sales' or other department slugs

    // We can also extract the first segment
    const segment = pathname.split("/")[1];

    // Special case for project management which uses /projects route
    const targetSlug = segment === "projects" ? "project-management" : segment;

    // Find department matching this segment
    const dept = departments.find((d) => d.slug === targetSlug);

    if (dept) {
      setCurrentDepartment(dept);
      setIsGlobalContext(false);
    } else if (departments.length > 0 && !pathname.startsWith("/login")) {
      // Shared/non-department routes (e.g. /attendance, /notifications, /)
      // must not keep stale department from previous navigation.
      setCurrentDepartment(null);
      setIsGlobalContext(false);
    }
  }, [pathname, departments]);

  const switchDepartment = (slug: string | null) => {
    if (slug === null) {
      router.push("/global");
    } else {
      router.push(`/${slug}`);
    }
  };

  return (
    <DepartmentContext.Provider
      value={{
        currentDepartment,
        isGlobalContext,
        departments,
        isLoading,
        switchDepartment,
        refreshDepartments: fetchDepartments,
      }}
    >
      {children}
    </DepartmentContext.Provider>
  );
}

export function useDepartment() {
  const context = useContext(DepartmentContext);
  if (context === undefined) {
    throw new Error("useDepartment must be used within a DepartmentProvider");
  }
  return context;
}
