"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import {
  ArrowLeft,
  Loader2,
  LayoutDashboard,
  CheckSquare,
  Users2,
  BarChart3,
  Activity,
  StickyNote,
  FolderOpen,
  Settings,
  ChevronLeft,
  ChevronRight,
  Bell,
  MessageSquare,
  Flag,
  Kanban,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { projectsApi } from "@/lib/projects-api";
import { useAuth } from "@/providers/auth-provider";
import { canManageProject } from "@/lib/projects-scope";
import type { Project } from "@/types";

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string }
> = {
  planned: { label: "Planned", color: "bg-blue-100 text-blue-700 border-blue-200" },
  in_progress: { label: "In Progress", color: "bg-purple-100 text-purple-700 border-purple-200" },
  on_hold: { label: "On Hold", color: "bg-orange-100 text-orange-700 border-orange-200" },
  completed: { label: "Completed", color: "bg-green-100 text-green-700 border-green-200" },
  cancelled: { label: "Cancelled", color: "bg-red-100 text-red-700 border-red-200" },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  low: { label: "Low", color: "bg-slate-100 text-slate-600 border-slate-200" },
  medium: { label: "Medium", color: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  high: { label: "High", color: "bg-red-100 text-red-700 border-red-200" },
};

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  adminOnly?: boolean;
}

export default function ProjectLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const pathname = usePathname();
  const { user, can } = useAuth();
  const id = params.id as string;
  const isDiscussionRoute = pathname.endsWith("/discussion");

  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    if (!id) return;
    projectsApi
      .get(id)
      .then((p) => setProject(p))
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [id]);

  // A user has project-level manager access if they are:
  // 1. A global admin
  // 2. The assigned manager_id on this specific project
  // 3. Listed as project_manager in project_members for this project
  const isManagerOrAbove = canManageProject(project, user, can);

  const navItems: NavItem[] = [
    { label: "Overview", href: `/projects/${id}/overview`, icon: LayoutDashboard },
    { label: "Tasks", href: `/projects/${id}/tasks`, icon: CheckSquare },
    { label: "Timeline", href: `/projects/${id}/timeline`, icon: Flag },
    { label: "Sprints", href: `/projects/${id}/sprints`, icon: Kanban },
    { label: "Reminders", href: `/projects/${id}/reminders`, icon: Bell },
    { label: "Members", href: `/projects/${id}/members`, icon: Users2 },
    { label: "Analytics", href: `/projects/${id}/analytics`, icon: BarChart3 },
    { label: "Activity", href: `/projects/${id}/activity`, icon: Activity },
    { label: "Notes", href: `/projects/${id}/notes`, icon: StickyNote },
    { label: "Discussion", href: `/projects/${id}/discussion`, icon: MessageSquare },
    { label: "Files", href: `/projects/${id}/files`, icon: FolderOpen },
    { label: "Settings", href: `/projects/${id}/settings`, icon: Settings, adminOnly: true },
  ].filter((item) => !item.adminOnly || isManagerOrAbove);

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* ── Project Top Bar ── */}
      <div className="border-b px-4 py-3 shrink-0">
        <div className="flex items-center gap-3">
          <Link
            href="/projects"
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">All Projects</span>
          </Link>

          <span className="text-muted-foreground/40 text-sm">/</span>

          {isLoading ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              <div className="h-4 w-40 bg-muted animate-pulse rounded" />
            </div>
          ) : project ? (
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-semibold text-sm truncate">
                {project.name}
              </span>
              {project.status && STATUS_CONFIG[project.status] && (
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[11px] px-1.5 py-0 h-5 shrink-0",
                    STATUS_CONFIG[project.status].color,
                  )}
                >
                  {STATUS_CONFIG[project.status].label}
                </Badge>
              )}
              {project.priority && PRIORITY_CONFIG[project.priority] && (
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[11px] px-1.5 py-0 h-5 shrink-0",
                    PRIORITY_CONFIG[project.priority].color,
                  )}
                >
                  {PRIORITY_CONFIG[project.priority].label}
                </Badge>
              )}
            </div>
          ) : (
            <span className="text-sm text-muted-foreground">Project</span>
          )}
        </div>
      </div>

      {/* ── Body: secondary sidebar + page content ── */}
      <div className="flex flex-1 min-h-0">
        {/* Secondary Sidebar */}
        <div
          className={cn(
            "relative flex flex-col shrink-0 border-r transition-all duration-300 ease-in-out",
            sidebarCollapsed ? "w-[52px]" : "w-[170px]",
          )}
        >
          {/* Nav Items */}
          <nav className="flex-1 overflow-y-auto overflow-x-hidden py-2">
            {navItems.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={sidebarCollapsed ? item.label : undefined}
                  className={cn(
                    "flex items-center gap-3 mx-1.5 my-0.5 px-2.5 py-2 rounded-md text-sm font-medium transition-all duration-150 group",
                    sidebarCollapsed ? "justify-center" : "",
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/60",
                  )}
                >
                  <item.icon
                    className={cn(
                      "h-4 w-4 shrink-0 transition-colors",
                      active
                        ? "text-primary"
                        : "text-muted-foreground group-hover:text-foreground",
                    )}
                  />
                  {!sidebarCollapsed && (
                    <span className="truncate">{item.label}</span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Chevron Toggle — centered on the right border */}
          <button
            onClick={() => setSidebarCollapsed((v) => !v)}
            className={cn(
              "absolute top-1/2 -translate-y-1/2 -right-3 z-10",
              "w-6 h-6 rounded-full border border-border bg-background shadow-sm",
              "flex items-center justify-center",
              "text-muted-foreground hover:text-foreground hover:border-primary hover:shadow-md",
              "transition-all duration-200",
            )}
            aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {sidebarCollapsed ? (
              <ChevronRight className="h-3 w-3" />
            ) : (
              <ChevronLeft className="h-3 w-3" />
            )}
          </button>
        </div>

        {/* Page Content */}
        <div
          className={cn(
            "flex-1 min-w-0 min-h-0 flex flex-col",
            isDiscussionRoute ? "overflow-hidden" : "overflow-y-auto",
            !isDiscussionRoute && "px-4 py-4 lg:px-6",
          )}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
