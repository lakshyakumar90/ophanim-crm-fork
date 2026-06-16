"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth, useIsAdmin, useIsManager } from "@/providers/auth-provider";
import { useDepartment } from "@/providers/department-context";
import { Target, ChevronDown, ChevronLeft, ChevronRight, Briefcase, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Fragment, useState } from "react";
import type { Department } from "@/types";
import { globalItems } from "@/config/sidebar-nav/global";
import { getDepartmentNavItems } from "@/config/sidebar-nav/shared";
import type { NavItem } from "@/config/sidebar-nav/types";
import { SidebarNavLink } from "@/components/layout/SidebarNavLink";
import { useSidebarBadges } from "@/hooks/layout/useSidebarBadges";

function DepartmentDropdown({
  department,
  isActive,
  currentPath,
}: {
  department: Department;
  isActive: boolean;
  currentPath: string;
}) {
  const [isOpen, setIsOpen] = useState(() => {
    if (typeof window === "undefined") {
      return isActive;
    }
    const storageKey = `sidebar:department:${department.slug}:open`;
    const stored = window.localStorage.getItem(storageKey);
    return stored !== null ? stored === "1" : isActive;
  });
  const { user } = useAuth();
  const isAdmin = useIsAdmin();
  const isManager = useIsManager();

  const filterNav = (items: NavItem[]) =>
    items.filter((item) => {
      const p = user?.permissions ?? [];
      const permGate = item.anyPermission ?? [];
      const hasAdmin = user?.role === "admin" || p.includes("crm:admin");

      if (hasAdmin) return true;

      const permOk =
        permGate.length > 0 && permGate.some((x) => p.includes(x));

      let roleOk = true;
      if (item.roles?.length) {
        roleOk = false;
        if (item.roles.includes("admin") && isAdmin) roleOk = true;
        if (item.roles.includes("manager") && isManager) roleOk = true;
        if (item.roles.includes("employee") && user?.role === "employee")
          roleOk = true;
      } else if (!item.roles) {
        roleOk = permGate.length === 0;
      }

      if (permGate.length && item.roles?.length) {
        return permOk || roleOk;
      }
      if (permGate.length) {
        return permOk;
      }
      return roleOk;
    });

  const departmentItems = filterNav(getDepartmentNavItems(department.slug));

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    const storageKey = `sidebar:department:${department.slug}:open`;
    window.localStorage.setItem(storageKey, open ? "1" : "0");
  };

  return (
    <Collapsible
      open={isOpen || isActive}
      onOpenChange={handleOpenChange}
      className="space-y-1"
    >
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "w-full justify-between pl-9 pr-2 py-1.5 h-auto font-normal text-muted-foreground hover:text-foreground hover:bg-muted/50",
            isActive && "bg-muted/50 text-foreground font-medium",
          )}
        >
          <span>{department.name}</span>
          <ChevronDown
            className={cn(
              "h-3 w-3 transition-transform duration-200",
              isOpen ? "rotate-180" : "",
            )}
          />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-1 pl-2">
        {departmentItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 px-3 py-1.5 rounded-md transition-all duration-200 group text-sm",
              currentPath === item.href ||
                (currentPath.startsWith(item.href) &&
                  item.href !== `/${department.slug}`)
                ? "bg-primary/10 text-primary font-medium"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
            )}
          >
            <item.icon
              className={cn(
                "w-4 h-4 shrink-0 transition-colors",
                currentPath === item.href ||
                  (currentPath.startsWith(item.href) &&
                    item.href !== `/${department.slug}`)
                  ? "text-primary"
                  : "text-muted-foreground group-hover:text-foreground",
              )}
            />
            <span className="truncate">{item.title}</span>
          </Link>
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}

function GlobalSidebar({
  collapsed,
  setCollapsed,
  mobile = false,
}: {
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
  mobile?: boolean;
}) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const isAdmin = useIsAdmin();
  const isManager = useIsManager();
  const { departments } = useDepartment();
  const [isDepartmentsOpen, setIsDepartmentsOpen] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }
    const stored = window.localStorage.getItem("sidebar:departments:open");
    return stored !== null ? stored === "1" : false;
  });
  const {
    unreadCount,
    remindersCount,
    myReviewReminderCount,
    peerFeedbackReminderCount,
  } = useSidebarBadges();

  // Check if user is a project-only user (PM/employee without department assignment)
  const isProjectOnlyUser =
    !user?.departmentSlug &&
    !isAdmin &&
    (isManager || user?.role === "employee");

  const filterNav = (items: NavItem[]) =>
    items.filter((item) => {
      if (
        item.href === "/hr/onboarding" &&
        !isAdmin &&
        user?.departmentSlug !== "hr"
      ) {
        return false;
      }

      if (!item.roles) return true;
      if (item.roles.includes("admin") && isAdmin) return true;
      if (item.roles.includes("manager") && isManager) return true;
      if (item.roles.includes("employee") && user?.role === "employee")
        return true;
      return false;
    });

  const filteredGlobal = filterNav(globalItems);

  const isDepartmentRoute = pathname.startsWith("/projects")
    ? departments.some((dept) => dept.slug === "project-management")
    : departments.some((dept) => pathname.startsWith(`/${dept.slug}`));
  const departmentsOpen = isDepartmentsOpen || isDepartmentRoute;
  const handleDepartmentsOpenChange = (open: boolean) => {
    setIsDepartmentsOpen(open);
    window.localStorage.setItem("sidebar:departments:open", open ? "1" : "0");
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const showDepartmentsSection =
    !collapsed &&
    (isAdmin ||
      isManager ||
      user?.departmentSlug ||
      isProjectOnlyUser ||
      (user?.departmentIds?.length ?? 0) > 0);

  const departmentsSection = showDepartmentsSection ? (
    <Collapsible
      open={departmentsOpen}
      onOpenChange={handleDepartmentsOpenChange}
      className="space-y-1 pt-2"
    >
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-between px-3 py-2 h-auto font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50"
        >
          <div className="flex items-center gap-3">
            <Briefcase className="w-4 h-4" />
            <span>Departments</span>
          </div>
              <ChevronDown
                className={cn(
                  "h-3 w-3 transition-transform duration-200",
                  departmentsOpen ? "rotate-180" : "",
                )}
              />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-1 px-2">
        {departments
          .filter((dept) => {
            if (isAdmin) return true;
            if (isProjectOnlyUser && dept.slug === "project-management") {
              return true;
            }
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
          })
          .map((dept) => (
            <DepartmentDropdown
              key={dept.id}
              department={dept}
              isActive={pathname.startsWith(
                dept.slug === "project-management"
                  ? "/projects"
                  : `/${dept.slug}`,
              )}
              currentPath={pathname}
            />
          ))}
      </CollapsibleContent>
    </Collapsible>
  ) : null;

  return (
    <div
      className={cn(
        "relative flex flex-col h-full bg-background border-r border-border transition-all duration-300",
        collapsed ? "w-20" : mobile ? "w-full" : "w-52",
      )}
    >
      <div className="h-16 flex items-center px-4 border-b border-border justify-between overflow-hidden">
        <Link
          href="/"
          className={cn(
            "flex items-center gap-2 transition-all duration-300",
            collapsed ? "justify-center w-full" : "",
          )}
        >
          <div className="w-7 h-7 shrink-0 rounded-md bg-primary flex items-center justify-center">
            <Target className="w-4 h-4 text-primary-foreground" />
          </div>
          <span
            className={cn(
              "font-bold text-base text-foreground transition-all duration-300 whitespace-nowrap",
              collapsed ? "w-0 opacity-0 hidden" : "w-auto opacity-100",
            )}
          >
            CRM
          </span>
        </Link>
      </div>

      {/* Chevron Toggle — centered on the right border */}
      {!mobile && (
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "absolute top-1/2 -translate-y-1/2 -right-3 z-10",
            "w-6 h-6 rounded-full border border-border bg-background shadow-sm",
            "flex items-center justify-center",
            "text-muted-foreground hover:text-foreground hover:border-primary hover:shadow-md",
            "transition-all duration-200",
          )}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <ChevronRight className="h-3 w-3" />
          ) : (
            <ChevronLeft className="h-3 w-3" />
          )}
        </button>
      )}

      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1 overflow-x-hidden">
        {filteredGlobal.map((item) => (
          <Fragment key={item.href}>
            <SidebarNavLink
              item={item}
              collapsed={collapsed}
              isActive={
                pathname === item.href ||
                (item.href !== "/" && pathname.startsWith(item.href))
              }
              badgeCount={
                item.showBadge
                  ? unreadCount
                  : item.showReminderBadge
                    ? remindersCount
                    : item.showMyReviewBadge
                      ? myReviewReminderCount
                      : item.showPeerFeedbackBadge
                        ? peerFeedbackReminderCount
                    : undefined
              }
              badgeColor={item.showReminderBadge ? "amber" : "red"}
            />
            {item.title === "Attendance" && departmentsSection}
          </Fragment>
        ))}
        {!filteredGlobal.some((item) => item.title === "Attendance") &&
          departmentsSection}
      </nav>

      {/* User Footer */}
      <div className="p-3 border-t border-border">
        {!collapsed ? (
          <>
            <div className="flex items-center gap-3 mb-3 px-1">
              <Avatar className="w-8 h-8">
                <AvatarImage src={user?.avatarUrl || undefined} />
                <AvatarFallback className="text-xs">
                  {user?.fullName ? getInitials(user.fullName) : "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate text-foreground">
                  {user?.fullName}
                </p>
                <p className="text-[10px] text-muted-foreground capitalize truncate">
                  {user?.role}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-xs text-muted-foreground hover:text-destructive"
              onClick={logout}
            >
              <LogOut className="w-3 h-3 mr-2" />
              Logout
            </Button>
          </>
        ) : (
          <div className="flex flex-col items-center gap-2" title={user?.fullName || "User"}>
            <Avatar className="w-8 h-8">
              <AvatarImage src={user?.avatarUrl || undefined} />
              <AvatarFallback className="text-xs">
                {user?.fullName ? getInitials(user.fullName) : "U"}
              </AvatarFallback>
            </Avatar>
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-destructive"
              onClick={logout}
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export function Sidebar({ mobile = false }: { mobile?: boolean }) {
  const [globalCollapsed, setGlobalCollapsed] = useState(false);
  const collapsed = mobile ? false : globalCollapsed;

  return (
    <aside
      className={cn(
        "relative flex shadow-sm transition-all duration-300",
        mobile ? "h-full w-full" : "h-screen",
      )}
    >
      <GlobalSidebar
        collapsed={collapsed}
        setCollapsed={setGlobalCollapsed}
        mobile={mobile}
      />
    </aside>
  );
}
