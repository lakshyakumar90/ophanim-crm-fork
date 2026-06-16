"use client";

import { FolderKanban, CheckSquare, ListTodo, Users2, PieChart, FileText, CalendarClock, Activity, Clock, Flag, Kanban, Gauge } from "lucide-react";
import type { NavItem } from "./types";

export const deliveryItems: NavItem[] = [
  {
    title: "All Projects",
    href: "/projects",
    icon: FolderKanban,
    anyPermission: ["projects:view", "projects:create"],
  },
  {
    title: "My Projects",
    href: "/projects/my-projects",
    icon: FolderKanban,
    anyPermission: ["projects:view"],
  },
  {
    title: "My Tasks",
    href: "/projects/my-tasks",
    icon: CheckSquare,
    anyPermission: ["projects:view", "tasks:view"],
  },
  {
    title: "My Timesheet",
    href: "/projects/my-timesheet",
    icon: Clock,
    anyPermission: ["timesheets:view", "timesheets:manage"],
  },
  {
    title: "Tasks",
    href: "/projects/tasks",
    icon: ListTodo,
    anyPermission: ["projects:view", "projects:edit"],
  },
  {
    title: "Time Approvals",
    href: "/projects/time-approvals",
    icon: Clock,
    anyPermission: ["timesheets:approve", "timesheets:manage"],
  },
  {
    title: "Capacity",
    href: "/projects/capacity",
    icon: Gauge,
    anyPermission: ["projects:assign_member", "projects:edit"],
  },
  {
    title: "Members",
    href: "/projects/members",
    icon: Users2,
    anyPermission: ["projects:view"],
  },
  {
    title: "Analytics",
    href: "/projects/analytics",
    icon: PieChart,
    anyPermission: ["projects:view", "analytics:view_team"],
  },
  {
    title: "Notes",
    href: "/projects/notes",
    icon: FileText,
    anyPermission: ["projects:view"],
  },
  {
    title: "Calendar",
    href: "/projects/calendar",
    icon: CalendarClock,
    anyPermission: ["projects:view", "projects:edit"],
  },
  {
    title: "Activity",
    href: "/projects/activity",
    icon: Activity,
    anyPermission: ["projects:view"],
  },
];

export const projectDetailItems: NavItem[] = [
  {
    title: "Timeline",
    href: "timeline",
    icon: Flag,
    anyPermission: ["milestones:view", "projects:view"],
  },
  {
    title: "Sprints",
    href: "sprints",
    icon: Kanban,
    anyPermission: ["projects:view"],
  },
];
