"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Briefcase, ChevronRight } from "lucide-react";
import type { Department } from "@/types";
import { useAuth, useIsAdmin, useIsManager } from "@/providers/auth-provider";
import { useDepartment } from "@/providers/department-context";
import { getDepartmentNavItems } from "@/config/sidebar-nav/shared";
import {
  departmentBasePath,
  filterDepartmentNav,
  isNavItemActive,
} from "@/lib/sidebar-nav-utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

function DepartmentNavGroup({
  department,
  isActive,
}: {
  department: Department;
  isActive: boolean;
}) {
  const pathname = usePathname();
  const { user } = useAuth();
  const isAdmin = useIsAdmin();
  const isManager = useIsManager();
  const [isOpen, setIsOpen] = useState(() => {
    if (typeof window === "undefined") return isActive;
    const storageKey = `sidebar:department:${department.slug}:open`;
    const stored = window.localStorage.getItem(storageKey);
    return stored !== null ? stored === "1" : isActive;
  });

  const departmentItems = filterDepartmentNav(
    getDepartmentNavItems(department.slug),
    user,
    isAdmin,
    isManager,
  );

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    window.localStorage.setItem(
      `sidebar:department:${department.slug}:open`,
      open ? "1" : "0",
    );
  };

  const basePath = departmentBasePath(department.slug);

  return (
    <Collapsible
      open={isOpen || isActive}
      onOpenChange={handleOpenChange}
      className="group/collapsible"
    >
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton
            tooltip={department.name}
            isActive={isActive}
            className="w-full"
          >
            <span className="truncate">{department.name}</span>
            <ChevronRight className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-90" />
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub>
            {departmentItems.map((item) => (
              <SidebarMenuSubItem key={item.href}>
                <SidebarMenuSubButton
                  asChild
                  isActive={
                    pathname === item.href ||
                    (pathname.startsWith(item.href) && item.href !== basePath)
                  }
                >
                  <Link href={item.href}>
                    <item.icon />
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
}

export function NavDepartments() {
  const pathname = usePathname();
  const { user } = useAuth();
  const isAdmin = useIsAdmin();
  const isManager = useIsManager();
  const { departments } = useDepartment();

  const isProjectOnlyUser =
    !user?.departmentSlug &&
    !isAdmin &&
    (isManager || user?.role === "employee");

  const showDepartmentsSection =
    isAdmin ||
    isManager ||
    user?.departmentSlug ||
    isProjectOnlyUser ||
    (user?.departmentIds?.length ?? 0) > 0;

  const [isDepartmentsOpen, setIsDepartmentsOpen] = useState(() => {
    if (typeof window === "undefined") return false;
    const stored = window.localStorage.getItem("sidebar:departments:open");
    return stored !== null ? stored === "1" : false;
  });

  const isDepartmentRoute = pathname.startsWith("/projects")
    ? departments.some((dept) => dept.slug === "project-management")
    : departments.some((dept) => pathname.startsWith(`/${dept.slug}`));

  const departmentsOpen = isDepartmentsOpen || isDepartmentRoute;

  const handleDepartmentsOpenChange = (open: boolean) => {
    setIsDepartmentsOpen(open);
    window.localStorage.setItem("sidebar:departments:open", open ? "1" : "0");
  };

  if (!showDepartmentsSection) return null;

  const visibleDepartments = departments
    .filter((dept) => {
      if (isAdmin) return true;
      if (isProjectOnlyUser && dept.slug === "project-management") return true;
      return (
        dept.slug === user?.departmentSlug ||
        user?.departmentIds?.includes(dept.id)
      );
    })
    .sort((a, b) => {
      if (!isAdmin && a.slug === user?.departmentSlug) return -1;
      if (!isAdmin && b.slug === user?.departmentSlug) return 1;
      const order = ["sales", "finance", "hr", "project-management"];
      const indexA = order.indexOf(a.slug);
      const indexB = order.indexOf(b.slug);
      if (indexA !== -1 && indexB !== -1) return indexA - indexB;
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;
      return a.name.localeCompare(b.name);
    });

  return (
    <SidebarGroup className="pt-2">
      <Collapsible
        open={departmentsOpen}
        onOpenChange={handleDepartmentsOpenChange}
        className="group/departments"
      >
        <SidebarGroupLabel asChild>
          <CollapsibleTrigger
            className={cn(
              "flex w-full items-center gap-2 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            )}
          >
            <Briefcase className="h-4 w-4" />
            <span className="text-xs font-normal">Departments</span>
            <ChevronRight className="ml-auto transition-transform group-data-[state=open]/departments:rotate-90" />
          </CollapsibleTrigger>
        </SidebarGroupLabel>
        <CollapsibleContent>
          <SidebarMenu>
            {visibleDepartments.map((dept) => (
              <DepartmentNavGroup
                key={dept.id}
                department={dept}
                isActive={pathname.startsWith(departmentBasePath(dept.slug))}
              />
            ))}
          </SidebarMenu>
        </CollapsibleContent>
      </Collapsible>
    </SidebarGroup>
  );
}
