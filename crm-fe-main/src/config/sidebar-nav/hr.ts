"use client";

import { LayoutDashboard, Users, Clock, ClipboardList, FileText, Receipt, Target, CalendarClock, BarChart3 } from "lucide-react";
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
    title: "Documents",
    href: "/hr/documents",
    icon: FileText,
    roles: ["admin", "manager"],
  },
  {
    title: "Payroll",
    href: "/hr/payroll",
    icon: Receipt,
    roles: ["admin", "manager"],
  },
  {
    title: "Performance",
    href: "/hr/performance",
    icon: Target,
    roles: ["admin", "manager"],
    anyPermission: ["performance:view", "performance:manage", "performance:review"],
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
    roles: ["admin", "manager", "employee"],
  },
];
