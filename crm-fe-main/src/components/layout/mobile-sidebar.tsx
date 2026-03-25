"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth, useIsAdmin, useIsManager } from "@/providers/auth-provider";
import useSWR from "swr";
import { notificationsApi, leadsApi } from "@/lib/api";
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
  PieChart,
  Wallet,
  FileText,
  Receipt,
  BarChart3,
  FolderKanban,
  ListTodo,
  Users2,
  CalendarClock,
  Briefcase,
  ClipboardList,
  UserCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { fetchPerformanceReminderCounts } from "@/lib/performance-api";

interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
  roles?: ("admin" | "manager" | "employee")[];
  anyPermission?: string[];
}

const navItems: NavItem[] = [
  { title: "Dashboard", href: "/", icon: LayoutDashboard },
  { title: "Leads", href: "/leads", icon: Target },
  { title: "Tasks", href: "/tasks", icon: CheckSquare },
  { title: "Attendance", href: "/attendance", icon: Clock },
  { title: "Teams", href: "/teams", icon: UsersRound },
  { title: "Users", href: "/users", icon: Users, roles: ["admin"] },
  { title: "Activity", href: "/activity", icon: Activity, roles: ["admin"] },
  { title: "Analytics", href: "/analytics", icon: PieChart, roles: ["admin"] },
  { title: "Notifications", href: "/notifications", icon: Bell },
  { title: "Reminders", href: "/reminders", icon: CalendarClock },
  { title: "Settings", href: "/settings", icon: Settings },
  // Delivery Items
  {
    title: "Delivery / Projects",
    href: "/projects",
    icon: FolderKanban,
    roles: ["admin", "manager", "employee"],
  },
  {
    title: "Project Tasks",
    href: "/projects/tasks",
    icon: ListTodo,
    roles: ["admin", "manager", "employee"],
  },
  {
    title: "Project Activity",
    href: "/projects/activity",
    icon: Activity,
    roles: ["admin", "manager"],
  },
  // Finance Items
  {
    title: "Finance",
    href: "/finance",
    icon: Wallet,
    roles: ["admin", "manager"],
  },
  {
    title: "Invoices",
    href: "/finance/invoices",
    icon: FileText,
    roles: ["admin", "manager", "employee"],
  },
  {
    title: "Expenses",
    href: "/finance/expenses",
    icon: Receipt,
    roles: ["admin", "manager", "employee"],
  },
  {
    title: "Finance Analytics",
    href: "/finance/analytics",
    icon: BarChart3,
    roles: ["admin", "manager"],
  },
  // HR Items
  {
    title: "HR Overview",
    href: "/hr",
    icon: LayoutDashboard,
    roles: ["admin", "manager"],
  },
  {
    title: "HR Employees",
    href: "/hr/employees",
    icon: Users,
    roles: ["admin", "manager"],
  },
  {
    title: "HR Leaves",
    href: "/hr/leaves",
    icon: ClipboardList,
    roles: ["admin", "manager"],
  },
  {
    title: "HR Recruitment",
    href: "/hr/recruitment",
    icon: Briefcase,
    roles: ["admin", "manager"],
  },
  {
    title: "HR Payroll",
    href: "/hr/payroll",
    icon: Receipt,
    roles: ["admin", "manager"],
  },
  {
    title: "My payslips",
    href: "/hr/payroll/my-payslips",
    icon: Wallet,
    roles: ["admin", "manager", "employee"],
  },
  {
    title: "My review",
    href: "/performance/my-review",
    icon: ClipboardList,
    roles: ["admin", "manager", "employee"],
  },
  {
    title: "Peer feedback",
    href: "/performance/peer-feedback",
    icon: Users,
    roles: ["admin", "manager", "employee"],
  },
  {
    title: "My documents",
    href: "/documents/my-documents",
    icon: FileText,
    roles: ["admin", "manager", "employee"],
  },
  {
    title: "HR Performance",
    href: "/hr/performance",
    icon: BarChart3,
    roles: ["admin", "manager"],
    anyPermission: ["performance:view", "performance:manage", "performance:review"],
  },
  {
    title: "HR Onboarding",
    href: "/hr/onboarding",
    icon: UserCircle,
    roles: ["admin", "manager"],
  },
];

export function MobileSidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const isAdmin = useIsAdmin();
  const isManager = useIsManager();

  // Match desktop sidebar badge sources/keys for consistent UI
  const { data: unreadData } = useSWR(
    user ? "notifications-unread-count" : null,
    () => notificationsApi.getUnreadCount(),
    { revalidateOnFocus: false, refreshInterval: 120000 },
  );
  const unreadCount = unreadData?.count || 0;

  const { data: remindersData } = useSWR(
    user ? "sidebar-reminders-count" : null,
    () => leadsApi.getRemindersCount({ status: "pending" }),
    { revalidateOnFocus: false, refreshInterval: 180000 },
  );
  const remindersCount = remindersData?.count || 0;

  const { data: perfReminderData } = useSWR(
    user ? "performance-reminder-counts" : null,
    () => fetchPerformanceReminderCounts(),
    { revalidateOnFocus: false, refreshInterval: 180000 },
  );
  const myReviewReminderCount = perfReminderData?.myReview || 0;
  const peerFeedbackReminderCount = perfReminderData?.peerFeedback || 0;

  const filteredNav = navItems.filter((item) => {
    if (
      item.href === "/hr/onboarding" &&
      !isAdmin &&
      user?.departmentSlug !== "hr"
    ) {
      return false;
    }

    const p = user?.permissions ?? [];
    const permGate = item.anyPermission ?? [];
    const permOk =
      permGate.length > 0 &&
      (p.includes("crm:admin") || permGate.some((x) => p.includes(x)));

    if (permGate.length && !item.roles?.length) {
      return permOk;
    }

    let roleOk = true;
    if (item.roles?.length) {
      roleOk = false;
      if (item.roles.includes("admin") && isAdmin) roleOk = true;
      if (item.roles.includes("manager") && isManager) roleOk = true;
      if (item.roles.includes("employee") && user?.role === "employee") roleOk = true;
    } else if (!item.roles) {
      roleOk = true;
    }

    if (permGate.length && item.roles?.length) {
      return permOk || roleOk;
    }
    return roleOk;
  });

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="flex flex-col h-full bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
      <SheetHeader className="p-4 border-b border-sidebar-border text-left">
        <SheetTitle className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Target className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-bold text-lg text-sidebar-foreground">CRM</span>
        </SheetTitle>
      </SheetHeader>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {filteredNav.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));

          const badgeCount =
            item.title === "Notifications"
              ? unreadCount
              : item.title === "Reminders"
                ? remindersCount
                : item.title === "My review"
                  ? myReviewReminderCount
                  : item.title === "Peer feedback"
                    ? peerFeedbackReminderCount
                : 0;
          const badgeBg =
            item.title === "Reminders" ? "bg-amber-500" : "bg-red-500";

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                isActive
                  ? "bg-accent text-primary font-medium"
                  : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent",
              )}
            >
              <div className="relative">
                <item.icon
                  className={cn(
                    "w-5 h-5 shrink-0",
                    isActive ? "text-primary" : "text-muted-foreground",
                  )}
                />
                {badgeCount > 0 && (
                  <span
                    className={cn(
                      "absolute -top-1.5 -right-1.5 min-w-4 h-4 px-1 rounded-full text-[10px] font-semibold text-white flex items-center justify-center",
                      badgeBg,
                    )}
                  >
                    {badgeCount > 9 ? "9+" : badgeCount}
                  </span>
                )}
              </div>
              <span className="font-medium">{item.title}</span>
            </Link>
          );
        })}
      </nav>

      <Separator className="bg-sidebar-border" />

      <div className="p-3">
        <div className="flex items-center gap-3 p-2 rounded-lg">
          <Avatar className="w-9 h-9">
            <AvatarImage src={user?.avatarUrl || undefined} />
            <AvatarFallback className="bg-primary text-primary-foreground text-sm">
              {user?.fullName ? getInitials(user.fullName) : "U"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">
              {user?.fullName}
            </p>
            <p className="text-xs text-muted-foreground capitalize">
              {user?.role}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          className="w-full mt-2 text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent"
          onClick={logout}
        >
          <LogOut className="w-4 h-4 mr-2" />
          Logout
        </Button>
      </div>
    </div>
  );
}
