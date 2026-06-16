import { LayoutDashboard, Target, CheckSquare, UsersRound, PieChart, Copy, FileText } from "lucide-react";
import type { NavItem } from "./types";

export const salesItems: NavItem[] = [
  { title: "Dashboard", href: "/sales", icon: LayoutDashboard, anyPermission: ["leads:view", "quotes:view"] },
  { title: "Leads", href: "/sales/leads", icon: Target, anyPermission: ["leads:view"] },
  { title: "Quotes", href: "/sales/quotes", icon: FileText, anyPermission: ["quotes:view"] },
  { title: "Tasks", href: "/sales/tasks", icon: CheckSquare, anyPermission: ["tasks:view"] },
  { title: "Teams", href: "/sales/teams", icon: UsersRound, anyPermission: ["leads:view", "analytics:view_team"] },
  {
    title: "Analytics",
    href: "/sales/analytics",
    icon: PieChart,
    anyPermission: ["analytics:view_own", "analytics:view_team"],
  },
  {
    title: "Duplicate Leads",
    href: "/sales/duplicate-leads",
    icon: Copy,
    anyPermission: ["leads:view"],
  },
];
