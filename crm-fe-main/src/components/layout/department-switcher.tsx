"use client";

import { useDepartment } from "@/providers/department-context";
import { useIsAdmin, useIsManager, useAuth } from "@/providers/auth-provider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  ChevronDown,
  Globe,
  Building2,
  Wallet,
  FolderKanban,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { usePathname } from "next/navigation";

export function DepartmentSwitcher() {
  const { currentDepartment, isGlobalContext, departments, switchDepartment } =
    useDepartment();
  const { user } = useAuth();
  const isAdmin = useIsAdmin();
  const isManager = useIsManager();
  const router = useRouter();
  const pathname = usePathname();
  const isFinance = pathname.startsWith("/finance");
  const isProjects = pathname.startsWith("/projects");
  const accessibleDepartments = departments.filter((dept) => {
    if (isAdmin) return true;
    if (user?.departmentSlug === dept.slug) return true;
    if (user?.departmentIds?.includes(dept.id)) return true;
    if (!user?.departmentSlug && dept.slug === "project-management") return true;
    return false;
  });

  // For non-admin project-only users (PM/employees without department)
  const isProjectOnlyUser =
    !user?.departmentSlug &&
    (user?.role === "manager" || user?.role === "employee");

  // Project-only users only see Projects in the switcher
  if (isProjectOnlyUser && accessibleDepartments.length <= 1) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-muted/50 text-sm font-medium">
        <FolderKanban className="w-4 h-4" />
        Projects
      </div>
    );
  }

  if (!isAdmin && accessibleDepartments.length > 1) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 ml-2 min-w-[140px] justify-between"
          >
            <div className="flex items-center gap-2">
              {isProjects ? (
                <FolderKanban className="w-4 h-4" />
              ) : (
                <Building2 className="w-4 h-4" />
              )}
              <span>
                {isProjects
                  ? "Project Management"
                  : currentDepartment?.name || user?.departmentName || "Department"}
              </span>
            </div>
            <ChevronDown className="w-3 h-3 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[220px]">
          {accessibleDepartments.map((dept) => (
            <DropdownMenuItem
              key={dept.id}
              onClick={() => {
                if (dept.slug === "finance") {
                  router.push("/finance");
                } else if (dept.slug === "project-management") {
                  router.push("/projects");
                } else {
                  switchDepartment(dept.slug);
                }
              }}
            >
              {dept.slug === "finance" ? (
                <Wallet className="w-4 h-4 mr-2" />
              ) : dept.slug === "project-management" ? (
                <FolderKanban className="w-4 h-4 mr-2" />
              ) : (
                <Building2 className="w-4 h-4 mr-2" />
              )}
              {dept.name}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  // Non-admin with department assigned - show their department name
  if (!isAdmin) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-muted/50 text-sm font-medium">
        {isProjects ? (
          <>
            <FolderKanban className="w-4 h-4" />
            Projects
          </>
        ) : isFinance ? (
          <>
            <Wallet className="w-4 h-4" />
            Finance
          </>
        ) : (
          <>
            <Building2 className="w-4 h-4" />
            {currentDepartment?.name || "Department"}
          </>
        )}
      </div>
    );
  }

  // Admin sees full dropdown
  const getCurrentLabel = () => {
    if (isGlobalContext) return "Global Context";
    if (isProjects) return "Project Management";
    if (isFinance) return "Finance";
    return currentDepartment?.name || "Select Dept";
  };

  const getCurrentIcon = () => {
    if (isGlobalContext) return <Globe className="w-4 h-4" />;
    if (isProjects) return <FolderKanban className="w-4 h-4" />;
    if (isFinance) return <Wallet className="w-4 h-4" />;
    return <Building2 className="w-4 h-4" />;
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 ml-2 min-w-[140px] justify-between"
        >
          <div className="flex items-center gap-2">
            {getCurrentIcon()}
            <span>{getCurrentLabel()}</span>
          </div>
          <ChevronDown className="w-3 h-3 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[200px]">
        <DropdownMenuItem onClick={() => switchDepartment(null)}>
          <Globe className="w-4 h-4 mr-2" />
          Global Context
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* Departments */}
        {departments
          .sort((a, b) => {
            const order = ["sales", "finance", "hr", "project-management"];
            const indexA = order.indexOf(a.slug);
            const indexB = order.indexOf(b.slug);
            if (indexA !== -1 && indexB !== -1) return indexA - indexB;
            if (indexA !== -1) return -1;
            if (indexB !== -1) return 1;
            return a.name.localeCompare(b.name);
          })
          .map((dept) => (
            <DropdownMenuItem
              key={dept.id}
              onClick={() => {
                if (dept.slug === "finance") {
                  router.push("/finance");
                } else if (dept.slug === "project-management") {
                  router.push("/projects");
                } else {
                  switchDepartment(dept.slug);
                }
              }}
            >
              {dept.slug === "finance" ? (
                <Wallet className="w-4 h-4 mr-2" />
              ) : dept.slug === "project-management" ? (
                <FolderKanban className="w-4 h-4 mr-2" />
              ) : (
                <Building2 className="w-4 h-4 mr-2" />
              )}
              {dept.name}
            </DropdownMenuItem>
          ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
