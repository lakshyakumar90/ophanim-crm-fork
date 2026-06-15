import { LayoutDashboard, Target, CheckSquare, UsersRound, PieChart, Copy } from "lucide-react";
import type { NavItem } from "./types";

export const salesItems: NavItem[] = [
  { title: "Dashboard", href: "/sales", icon: LayoutDashboard },
  { title: "Leads", href: "/sales/leads", icon: Target },
  { title: "Tasks", href: "/sales/tasks", icon: CheckSquare },
  { title: "Teams", href: "/sales/teams", icon: UsersRound },
  {
    title: "Analytics",
    href: "/sales/analytics",
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
