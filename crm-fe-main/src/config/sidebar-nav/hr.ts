"use client";

import {
  LayoutDashboard,
  Users,
  Clock,
  ClipboardList,
  FileText,
  Receipt,
  Target,
  CalendarClock,
  BarChart3,
  Network,
  Laptop,
  Sparkles,
  Gift,
  LogOut,
} from "lucide-react";
import type { NavItem } from "./types";

export const hrItems: NavItem[] = [
  {
    title: "Overview",
    href: "/hr",
    icon: LayoutDashboard,
  },
  {
    title: "Employees",
    href: "/hr/employees",
    icon: Users,
    anyPermission: ["hr:employees_view", "hr:view", "hr:manage"],
  },
  {
    title: "Org Chart",
    href: "/hr/org-chart",
    icon: Network,
    anyPermission: ["hr:employees_view", "hr:view", "hr:manage"],
  },
  {
    title: "Attendance",
    href: "/hr/attendance",
    icon: Clock,
    anyPermission: ["hr:attendance_view", "hr:attendance_manage", "hr:manage"],
  },
  {
    title: "Shifts",
    href: "/hr/shifts",
    icon: CalendarClock,
    anyPermission: ["hr:attendance_view", "hr:attendance_manage", "hr:manage"],
  },
  {
    title: "Leaves",
    href: "/hr/leaves",
    icon: ClipboardList,
    anyPermission: ["hr:leave_view", "hr:leave_manage", "hr:manage"],
  },
  {
    title: "Documents",
    href: "/hr/documents",
    icon: FileText,
    anyPermission: ["hr:documents_view", "hr:documents_manage", "hr:manage"],
  },
  {
    title: "Assets",
    href: "/hr/assets",
    icon: Laptop,
    anyPermission: ["assets:view", "assets:manage", "hr:manage"],
  },
  {
    title: "Skills",
    href: "/hr/skills",
    icon: Sparkles,
    anyPermission: ["skills:view", "skills:manage", "hr:manage"],
  },
  {
    title: "Benefits",
    href: "/hr/benefits",
    icon: Gift,
    anyPermission: ["benefits:view", "benefits:manage"],
  },
  {
    title: "Payroll",
    href: "/hr/payroll",
    icon: Receipt,
    anyPermission: ["payroll:view", "payroll:manage", "hr:manage"],
  },
  {
    title: "Performance",
    href: "/hr/performance",
    icon: Target,
    anyPermission: ["performance:view", "performance:manage", "performance:review"],
  },
  {
    title: "Exit",
    href: "/hr/exit",
    icon: LogOut,
    anyPermission: ["hr:manage"],
  },
  {
    title: "Holidays",
    href: "/hr/holidays",
    icon: CalendarClock,
    anyPermission: ["hr:leave_view", "hr:leave_manage", "hr:manage"],
  },
  {
    title: "Analytics",
    href: "/hr/analytics",
    icon: BarChart3,
    anyPermission: ["hr:analytics_view", "hr:view", "hr:manage"],
  },
];
