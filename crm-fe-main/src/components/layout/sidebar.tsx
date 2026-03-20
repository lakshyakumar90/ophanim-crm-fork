"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import useSWR, { mutate as globalMutate } from "swr";
import { cn } from "@/lib/utils";
import { useAuth, useIsAdmin, useIsManager } from "@/providers/auth-provider";
import { useDepartment } from "@/providers/department-context";
import { notificationsApi, leadsApi } from "@/lib/api";
import { usePollingCoordinator } from "@/lib/polling-coordinator";
import {
  LayoutDashboard,
  Users,
  Target,
  CheckSquare,
  Clock,
  UsersRound,
  Bell,
  Settings,
  LogOut,
  Activity,
  Mail,
  PieChart,
  Building,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Briefcase,
  Wallet,
  Receipt,
  FileText,
  CircleDollarSign,
  ClipboardCheck,
  CalendarClock,
  CalendarDays,
  BarChart3,
  FolderKanban,
  ListTodo,
  Users2,
  UserCircle,
  ClipboardList,
  Copy,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Fragment, useEffect, useState } from "react";
import type { Department } from "@/types";
import { Badge } from "@/components/ui/badge";

interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
  roles?: ("admin" | "manager" | "employee")[];
  showBadge?: boolean; // For notification count
  showReminderBadge?: boolean; // For reminder count
}

function NavLink({
  item,
  isActive,
  collapsed,
  badgeCount,
  badgeColor = "red", // "red" for notifications, "amber" for reminders
}: {
  item: NavItem;
  isActive: boolean;
  collapsed?: boolean;
  badgeCount?: number;
  badgeColor?: "red" | "amber";
}) {
  const badgeBgClass = badgeColor === "amber" ? "bg-amber-500" : "bg-red-500";

  return (
    <Link
      href={item.href}
      title={collapsed ? item.title : undefined}
      className={cn(
        "flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-200 group",
        isActive
          ? "bg-primary/10 text-primary font-medium"
          : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
        collapsed ? "justify-center px-2" : "",
      )}
    >
      <div className="relative">
        <item.icon
          className={cn(
            "w-4 h-4 shrink-0 transition-colors",
            isActive
              ? "text-primary"
              : "text-muted-foreground group-hover:text-foreground",
          )}
        />
        {collapsed && badgeCount && badgeCount > 0 && (
          <span
            className={cn(
              "absolute -top-1.5 -right-1.5 min-w-[14px] h-[14px] flex items-center justify-center px-0.5 text-[9px] font-medium text-white rounded-full",
              badgeBgClass,
            )}
          >
            {badgeCount > 9 ? "9+" : badgeCount}
          </span>
        )}
      </div>
      {!collapsed && (
        <>
          <span className="truncate flex-1">{item.title}</span>
          {badgeCount && badgeCount > 0 && (
            <Badge
              className={cn(
                "h-5 min-w-[20px] flex items-center justify-center px-1.5 text-[10px] text-white",
                badgeBgClass,
                `hover:${badgeBgClass}`,
              )}
            >
              {badgeCount > 9 ? "9+" : badgeCount}
            </Badge>
          )}
        </>
      )}
    </Link>
  );
}

const getDepartmentNavItems = (slug: string): NavItem[] => {
  switch (slug) {
    case "finance":
      return financeItems;
    case "hr":
      return hrItems;
    case "project-management":
      return deliveryItems;
    default:
      return [
        { title: "Dashboard", href: `/sales`, icon: LayoutDashboard },
        { title: "Leads", href: `/sales/leads`, icon: Target },
        { title: "Tasks", href: `/sales/tasks`, icon: CheckSquare },
        { title: "Teams", href: `/sales/teams`, icon: UsersRound },
        {
          title: "Analytics",
          href: `/sales/analytics`,
          icon: PieChart,
          roles: ["admin", "manager", "employee"],
        },
        {
          title: "Duplicate Leads",
          href: "/sales/duplicate-leads",
          icon: Copy,
          roles: ["admin", "manager", "employee"],
        },
      ];
  }
};

// Define these item arrays outside the component so they can be used by the helper function
const deliveryItems: NavItem[] = [
  {
    title: "All Projects",
    href: "/projects",
    icon: FolderKanban,
    roles: ["admin", "manager"],
  },
  {
    title: "My Projects",
    href: "/projects/my-projects",
    icon: FolderKanban,
    roles: ["employee"],
  },
  {
    title: "My Tasks",
    href: "/projects/my-tasks",
    icon: CheckSquare,
    roles: ["employee"],
  },
  {
    title: "Tasks",
    href: "/projects/tasks",
    icon: ListTodo,
    roles: ["admin", "manager"],
  },
  {
    title: "Members",
    href: "/projects/members",
    icon: Users2,
    roles: ["admin", "manager", "employee"],
  },
  {
    title: "Analytics",
    href: "/projects/analytics",
    icon: PieChart,
    roles: ["admin", "manager"],
  },
  {
    title: "Notes",
    href: "/projects/notes",
    icon: FileText,
    roles: ["admin", "manager", "employee"],
  },
  {
    title: "Calendar",
    href: "/projects/calendar",
    icon: CalendarClock,
    roles: ["admin", "manager"],
  },
  {
    title: "Activity",
    href: "/projects/activity",
    icon: Activity,
    roles: ["admin", "manager"],
  },
];

const financeItems: NavItem[] = [
  {
    title: "Dashboard",
    href: "/finance",
    icon: Wallet,
    roles: ["admin", "manager", "employee"],
  },
  {
    title: "Invoices",
    href: "/finance/invoices",
    icon: FileText,
    roles: ["admin", "manager", "employee"],
  },
  {
    title: "Payments",
    href: "/finance/payments",
    icon: CircleDollarSign,
    roles: ["admin", "manager"],
  },
  {
    title: "Expenses",
    href: "/finance/expenses",
    icon: Receipt,
    roles: ["admin", "manager", "employee"],
  },
  {
    title: "Approvals",
    href: "/finance/approvals",
    icon: ClipboardCheck,
    roles: ["admin", "manager"],
  },
  {
    title: "Recurring",
    href: "/finance/recurring",
    icon: CalendarClock,
    roles: ["admin", "manager"],
  },
  {
    title: "Emails",
    href: "/finance/emails",
    icon: Mail,
    roles: ["admin", "manager", "employee"],
  },
  {
    title: "Analytics",
    href: "/finance/analytics",
    icon: BarChart3,
    roles: ["admin", "manager"],
  },
];

const hrItems: NavItem[] = [
  {
    title: "Overview",
    href: "/hr",
    icon: LayoutDashboard,
  },
  {
    title: "Employees",
    href: "/hr/employees",
    icon: Users,
  },
  {
    title: "Attendance",
    href: "/hr/attendance",
    icon: Clock,
    roles: ["admin", "manager"],
  },
  {
    title: "Leaves",
    href: "/hr/leaves",
    icon: ClipboardList,
    roles: ["admin", "manager"],
  },
  {
    title: "Holidays",
    href: "/hr/holidays",
    icon: CalendarClock,
    roles: ["admin", "manager"],
  },
  {
    title: "Analytics",
    href: "/hr/analytics",
    icon: BarChart3,
    roles: ["admin", "manager"],
  },
];

function DepartmentDropdown({
  department,
  isActive,
  currentPath,
}: {
  department: Department;
  isActive: boolean;
  currentPath: string;
}) {
  const [isOpen, setIsOpen] = useState(isActive);
  const { user } = useAuth();
  const isAdmin = useIsAdmin();
  const isManager = useIsManager();
  const router = useRouter();

  const filterNav = (items: NavItem[]) =>
    items.filter((item) => {
      if (!item.roles) return true;
      if (item.roles.includes("admin") && isAdmin) return true;
      if (item.roles.includes("manager") && isManager) return true;
      if (item.roles.includes("employee") && user?.role === "employee")
        return true;
      return false;
    });

  const departmentItems = filterNav(getDepartmentNavItems(department.slug));

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="space-y-1">
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
}: {
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
}) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const isAdmin = useIsAdmin();
  const isManager = useIsManager();
  const { departments, isGlobalContext, switchDepartment, currentDepartment } =
    useDepartment();
  const [isDepartmentsOpen, setIsDepartmentsOpen] = useState(false);
  const [isFinanceOpen, setIsFinanceOpen] = useState(false);
  const [isDeliveryOpen, setIsDeliveryOpen] = useState(false);
  const [isDepartmentItemsOpen, setIsDepartmentItemsOpen] = useState(false);
  const [isHROpen, setIsHROpen] = useState(false);
  const { isLeader: isPollingLeader, publish } = usePollingCoordinator(
    (payload) => {
      if (typeof payload.unreadCount === "number") {
        void globalMutate(
          "notifications-unread-count",
          { count: payload.unreadCount },
          { revalidate: false },
        );
      }
      if (typeof payload.remindersCount === "number") {
        void globalMutate(
          "sidebar-reminders-count",
          { count: payload.remindersCount },
          { revalidate: false },
        );
      }
    },
  );

  // Check if user is a project-only user (PM/employee without department assignment)
  const isProjectOnlyUser =
    !user?.departmentSlug &&
    !isAdmin &&
    (isManager || user?.role === "employee");

  // Check if user is in Sales or Finance department (should not see Projects section)
  const isRestrictedDeptUser =
    user?.departmentSlug === "sales" ||
    user?.departmentSlug === "finance" ||
    user?.departmentSlug === "hr";

  // Check if user has access to HR section (Admin or HR department)
  const isHRAccessible = isAdmin || user?.departmentSlug === "hr";

  // Global items - for project-only users, show only common items
  const globalItems: NavItem[] = [
    {
      title: "Dashboard",
      href: "/global",
      icon: LayoutDashboard,
      roles: ["admin"],
    },
    { title: "Attendance", href: "/attendance", icon: Clock },
    { title: "Email", href: "/email", icon: Mail },
    { title: "Users", href: "/global/users", icon: Users, roles: ["admin"] },
    {
      title: "Teams",
      href: "/global/teams",
      icon: UsersRound,
      roles: ["admin"],
    },
    {
      title: "Roles",
      href: "/global/roles",
      icon: Shield,
      roles: ["admin"],
    },
    {
      title: "Activity",
      href: "/activity",
      icon: Activity,
    },
    {
      title: "Tasks",
      href: "/tasks",
      icon: CheckSquare,
    },
    {
      title: "Notifications",
      href: "/notifications",
      icon: Bell,
      showBadge: true,
    },
    {
      title: "Reminders",
      href: "/reminders",
      icon: CalendarClock,
      showReminderBadge: true,
    },
    {
      title: "Calendar",
      href: "/calendar",
      icon: CalendarDays,
    },
    { title: "Settings", href: "/settings", icon: Settings },
  ];

  // Finance items (Manager/Admin only)

  const filterNav = (items: NavItem[]) =>
    items.filter((item) => {
      if (!item.roles) return true;
      if (item.roles.includes("admin") && isAdmin) return true;
      if (item.roles.includes("manager") && isManager) return true;
      if (item.roles.includes("employee") && user?.role === "employee")
        return true;
      return false;
    });

  const filteredGlobal = filterNav(globalItems);

  // Fetch unread notification count for badge - use same key as header for shared cache
  const { data: unreadData } = useSWR(
    user ? "notifications-unread-count" : null,
    () => notificationsApi.getUnreadCount(),
    {
      refreshInterval: isPollingLeader ? 120000 : 0,
      refreshWhenHidden: false,
      refreshWhenOffline: false,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    },
  );
  const unreadCount = unreadData?.count || 0;

  // Fetch active reminders count (not-done reminders, including overdue)
  const { data: remindersData } = useSWR(
    user ? "sidebar-reminders-count" : null,
    () => leadsApi.getRemindersCount({ status: "pending" }),
    {
      refreshInterval: isPollingLeader ? 180000 : 0,
      refreshWhenHidden: false,
      refreshWhenOffline: false,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    },
  );
  const remindersCount = remindersData?.count || 0;

  useEffect(() => {
    if (!user || !isPollingLeader) return;
    publish({ unreadCount, remindersCount });
  }, [isPollingLeader, publish, remindersCount, unreadCount, user]);

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
      open={isDepartmentsOpen}
      onOpenChange={setIsDepartmentsOpen}
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
              isDepartmentsOpen ? "rotate-180" : "",
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
        collapsed ? "w-20" : "w-52",
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

      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1 overflow-x-hidden">
        {filteredGlobal.map((item) => (
          <Fragment key={item.href}>
            <NavLink
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

export function Sidebar() {
  const [globalCollapsed, setGlobalCollapsed] = useState(false);

  return (
    <aside className="relative flex h-screen shadow-sm transition-all duration-300">
      <GlobalSidebar
        collapsed={globalCollapsed}
        setCollapsed={setGlobalCollapsed}
      />
    </aside>
  );
}
