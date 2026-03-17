"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Loader2,
  Building,
  Calendar,
  Clock,
  Users,
  CheckCircle2,
  Circle,
  ArrowRight,
  Link2,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ProjectNotes } from "@/components/projects/project-notes";
import { format } from "date-fns";
import type { Project } from "@/types";
import { projectsApi } from "@/lib/projects-api";
import { leadsApi } from "@/lib/api";
import { useAuth } from "@/providers/auth-provider";
import { useHeaderRefresh } from "@/hooks/use-header-refresh";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1";

const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-slate-100 text-slate-700 border-slate-200",
  medium: "bg-yellow-100 text-yellow-700 border-yellow-200",
  high: "bg-red-100 text-red-700 border-red-200",
};

interface DashboardStats {
  taskProgress: {
    total: number;
    completed: number;
    inProgress: number;
    todo: number;
  };
  upcomingTasks: {
    id: string;
    title: string;
    status: string;
    priority: string;
    due_date: string;
  }[];
}

export default function ProjectOverviewPage() {
  const params = useParams();
  const id = params.id as string;
  const { user } = useAuth();
  const isManagerOrAbove = user?.role === "admin" || user?.role === "manager";

  const [project, setProject] = useState<Project | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [linkedLead, setLinkedLead] = useState<{
    id: string;
    leadName: string;
    businessName: string | null;
  } | null>(null);

  const fetchData = async (quiet = false) => {
    if (!quiet) setIsLoading(true);
    try {
      const token = localStorage.getItem("crm_access_token");
      const [projectData, statsRes] = await Promise.all([
        projectsApi.get(id),
        fetch(`${API_URL}/projects/${id}/dashboard-stats`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);
      if (projectData) {
        setProject(projectData);
        if (isManagerOrAbove && projectData.leadId) {
          leadsApi.get(projectData.leadId).then((lead: any) => {
            if (lead) setLinkedLead({ id: lead.id, leadName: lead.leadName, businessName: lead.businessName });
          }).catch(() => {});
        }
      }
      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch project data", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchData();
  }, [id]);

  useHeaderRefresh({ onRefresh: () => fetchData(true), isRefreshing: isLoading });

  if (isLoading) {
    return (
      <div className="flex h-[50vh] flex-col items-center justify-center gap-2">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading overview...</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex h-[50vh] flex-col items-center justify-center gap-4">
        <div className="rounded-full bg-slate-100 p-4">
          <Building className="h-8 w-8 text-muted-foreground" />
        </div>
        <div className="text-center">
          <h2 className="text-lg font-semibold">Project Not Found</h2>
          <p className="text-sm text-muted-foreground">
            This project doesn&apos;t exist or you don&apos;t have access.
          </p>
        </div>
      </div>
    );
  }

  const completionRate = stats?.taskProgress.total
    ? Math.round(
        (stats.taskProgress.completed / stats.taskProgress.total) * 100,
      )
    : 0;

  return (
    <div className="flex flex-col gap-6 p-4 lg:p-6 max-w-7xl mx-auto">
      {/* ── KPI Grid ── */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Project Info Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Project Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600 shrink-0">
                <Building className="h-5 w-5" />
              </div>
              <div className="space-y-0.5 min-w-0">
                <p className="text-sm font-medium leading-none">Client</p>
                <p className="text-sm text-muted-foreground truncate">
                  {project.clientName || "Internal Project"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 shrink-0">
                <Calendar className="h-5 w-5" />
              </div>
              <div className="space-y-0.5">
                <p className="text-sm font-medium leading-none">Start Date</p>
                <p className="text-sm text-muted-foreground">
                  {project.startDate
                    ? format(new Date(project.startDate), "MMM d, yyyy")
                    : "Not set"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-50 text-rose-600 shrink-0">
                <Clock className="h-5 w-5" />
              </div>
              <div className="space-y-0.5">
                <p className="text-sm font-medium leading-none">Deadline</p>
                <p className="text-sm text-muted-foreground">
                  {project.endDate
                    ? format(new Date(project.endDate), "MMM d, yyyy")
                    : "No deadline"}
                </p>
              </div>
            </div>
            {isManagerOrAbove && linkedLead && (
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-50 text-green-600 shrink-0">
                  <Link2 className="h-5 w-5" />
                </div>
                <div className="space-y-0.5 min-w-0">
                  <p className="text-sm font-medium leading-none">Linked Lead</p>
                  <Link
                    href={`/sales/leads/${linkedLead.id}`}
                    className="text-sm text-primary hover:underline truncate block"
                  >
                    {linkedLead.leadName}
                    {linkedLead.businessName && (
                      <span className="text-muted-foreground ml-1">
                        ({linkedLead.businessName})
                      </span>
                    )}
                  </Link>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Team Snapshot */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-0">
            <CardTitle className="text-base">Team Snapshot</CardTitle>
            <Button variant="ghost" size="sm" asChild className="h-7 text-xs gap-1">
              <Link href={`/projects/${id}/resources`}>
                Manage <ArrowRight className="h-3 w-3" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-9 w-9 shrink-0">
                <AvatarImage src={project.manager?.avatarUrl || undefined} />
                <AvatarFallback>
                  {project.manager?.fullName?.charAt(0) || "M"}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-0.5 min-w-0">
                <p className="text-sm font-medium leading-none">Manager</p>
                <p className="text-sm text-muted-foreground truncate">
                  {project.manager?.fullName || "Unassigned"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600 shrink-0">
                <Users className="h-5 w-5" />
              </div>
              <div className="space-y-0.5">
                <p className="text-sm font-medium leading-none">Members</p>
                <p className="text-sm text-muted-foreground">
                  {project.members?.length || 0} active members
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Progress Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Task Progress</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Completion</span>
                <span className="font-medium">{completionRate}%</span>
              </div>
              <Progress value={completionRate} className="h-2" />
            </div>
            <div className="grid grid-cols-3 gap-2 pt-2">
              <div className="flex flex-col items-center bg-slate-50 p-2 rounded-md">
                <span className="text-lg font-bold text-slate-700">
                  {stats?.taskProgress.todo || 0}
                </span>
                <span className="text-[10px] uppercase text-muted-foreground font-medium">
                  To Do
                </span>
              </div>
              <div className="flex flex-col items-center bg-purple-50 p-2 rounded-md">
                <span className="text-lg font-bold text-purple-700">
                  {stats?.taskProgress.inProgress || 0}
                </span>
                <span className="text-[10px] uppercase text-muted-foreground font-medium">
                  In Progress
                </span>
              </div>
              <div className="flex flex-col items-center bg-green-50 p-2 rounded-md">
                <span className="text-lg font-bold text-green-700">
                  {stats?.taskProgress.completed || 0}
                </span>
                <span className="text-[10px] uppercase text-muted-foreground font-medium">
                  Done
                </span>
              </div>
            </div>
            <Button variant="ghost" size="sm" className="w-full text-xs gap-1" asChild>
              <Link href={`/projects/${id}/tasks`}>
                View all tasks <ArrowRight className="h-3 w-3" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* ── Recent Discussions + Upcoming Tasks ── */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base">Recent Discussions</CardTitle>
              <CardDescription>Latest notes from the team</CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="h-7 text-xs gap-1 shrink-0"
            >
              <Link href={`/projects/${id}/discussion`}>
                All discussions <ArrowRight className="h-3 w-3" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="flex-1">
            <div className="max-h-[280px] overflow-y-auto pr-1">
              <ProjectNotes projectId={id} />
            </div>
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base">Upcoming Tasks</CardTitle>
              <CardDescription>Tasks due soon</CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="h-7 text-xs gap-1 shrink-0"
            >
              <Link href={`/projects/${id}/tasks`}>
                All tasks <ArrowRight className="h-3 w-3" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="flex-1">
            {stats?.upcomingTasks && stats.upcomingTasks.length > 0 ? (
              <div className="space-y-3">
                {stats.upcomingTasks.slice(0, 6).map((task) => (
                  <div
                    key={task.id}
                    className="flex items-start gap-3 pb-3 border-b last:border-0 last:pb-0"
                  >
                    <div
                      className={`mt-0.5 p-1 rounded-full border shrink-0 ${
                        task.status === "in_progress"
                          ? "bg-purple-100 border-purple-200 text-purple-600"
                          : "bg-slate-100 border-slate-200 text-slate-500"
                      }`}
                    >
                      {task.status === "in_progress" ? (
                        <Clock className="h-3 w-3" />
                      ) : (
                        <Circle className="h-3 w-3" />
                      )}
                    </div>
                    <div className="flex-1 space-y-1 min-w-0">
                      <p className="text-sm font-medium leading-none truncate">
                        {task.title}
                      </p>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={`text-[10px] px-1 py-0 h-4 ${
                            PRIORITY_COLORS[task.priority] || ""
                          }`}
                        >
                          {task.priority}
                        </Badge>
                        {task.due_date && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(task.due_date), "MMM d")}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-36 text-center text-muted-foreground">
                <CheckCircle2 className="h-8 w-8 mb-2 opacity-20" />
                <p className="text-sm">No upcoming tasks</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
