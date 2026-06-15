"use client";

import { FolderKanban, CheckSquare, ListTodo, Users2, PieChart, FileText, CalendarClock, Activity } from "lucide-react";
import type { NavItem } from "./types";

export const deliveryItems: NavItem[] = [
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
