"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import {
  Loader2,
  CheckCircle2,
  Clock,
  Circle,
  Calendar,
  AlertTriangle,
  Users2,
  Target,
  TrendingUp,
  Flag,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import {
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { buildChartConfig } from "@/components/charts/chart-config";
import { format, addDays, differenceInDays, isPast } from "date-fns";
import type { Project, Task } from "@/types";
import { projectsApi } from "@/lib/projects-api";
import { tasksApi } from "@/lib/api";
import { useHeaderRefresh } from "@/hooks/layout/useHeaderRefresh";
import { nowIST } from "@/lib/date-utils";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1";

const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
] as const;

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
  upcomingTasks: any[];
}

export default function ProjectAnalyticsPage() {
  const params = useParams();
  const id = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async (quiet = false) => {
    if (!quiet) setIsLoading(true);
    try {
      const token = localStorage.getItem("crm_access_token");
      const [projectData, statsRes, tasksData] = await Promise.all([
        projectsApi.get(id),
        fetch(`${API_URL}/projects/${id}/dashboard-stats`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        tasksApi.list({ projectId: id, limit: 500 }),
      ]);

      if (projectData) setProject(projectData);
      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data.data);
      }
      const taskList = Array.isArray(tasksData)
        ? tasksData
        : (tasksData as any)?.data || [];
      setTasks(taskList);
    } catch (error) {
      console.error("Failed to fetch analytics data", error);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) fetchData();
  }, [fetchData]);

  useHeaderRefresh({ onRefresh: () => fetchData(true), isRefreshing: isLoading });

  if (isLoading) {
    return (
      <div className="flex h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const tp = stats?.taskProgress;
  const donutData = tp
    ? [
        { name: "Completed", value: tp.completed },
        { name: "In Progress", value: tp.inProgress },
        { name: "To Do", value: tp.todo },
      ]
        .filter((d) => d.value > 0)
        .map((entry, index) => ({
          ...entry,
          color: CHART_COLORS[index % CHART_COLORS.length],
        }))
    : [];

  const donutConfig = buildChartConfig(
    Object.fromEntries(donutData.map((d) => [d.name, { label: d.name }])),
  );

  const completionRate =
    tp && tp.total > 0 ? Math.round((tp.completed / tp.total) * 100) : 0;

  // Normalize task fields — API may return camelCase or snake_case
  const normTask = (t: any) => ({
    id: t.id,
    title: t.title,
    status: t.status,
    priority: t.priority,
    dueDate: t.dueDate || t.due_date || null,
    assignedTo: t.assignedTo || t.assigned_to || null,
    assigneeName:
      t.assignee?.fullName || t.assignee?.full_name ||
      t.assigned_user?.full_name || "Unknown",
    assigneeAvatar:
      t.assignee?.avatarUrl || t.assignee?.avatar_url ||
      t.assigned_user?.avatar_url || undefined,
  });

  const normalizedTasks = tasks.map(normTask);

  // Team contribution: tasks per assignee
  const assigneeMap: Record<
    string,
    { name: string; avatar?: string; total: number; completed: number }
  > = {};
  for (const task of normalizedTasks) {
    if (!task.assignedTo) continue;
    if (!assigneeMap[task.assignedTo]) {
      assigneeMap[task.assignedTo] = {
        name: task.assigneeName,
        avatar: task.assigneeAvatar,
        total: 0,
        completed: 0,
      };
    }
    assigneeMap[task.assignedTo].total++;
    if (task.status === "completed") assigneeMap[task.assignedTo].completed++;
  }
  const teamContribution = Object.entries(assigneeMap)
    .map(([id, data]) => ({ id, ...data }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  // Timeline calculations
  const now = nowIST();

  // Upcoming deadlines: tasks with dueDate in next 14 days
  const cutoff = addDays(now, 14);
  const upcomingDeadlines = normalizedTasks
    .filter((t) => {
      if (!t.dueDate || t.status === "completed") return false;
      const d = new Date(t.dueDate);
      return d >= now && d <= cutoff;
    })
    .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
    .slice(0, 8);
  const startDate = project?.startDate ? new Date(project.startDate) : null;
  const endDate = project?.endDate ? new Date(project.endDate) : null;
  const totalDays = startDate && endDate ? differenceInDays(endDate, startDate) : null;
  const elapsedDays = startDate ? Math.max(0, differenceInDays(now, startDate)) : null;
  const remainingDays = endDate ? differenceInDays(endDate, now) : null;
  const timelineProgress =
    totalDays && totalDays > 0 && elapsedDays !== null
      ? Math.min(100, Math.round((elapsedDays / totalDays) * 100))
      : null;
  const isOverdue = endDate ? isPast(endDate) && project?.status !== "completed" : false;

  // Overdue tasks
  const overdueTasks = normalizedTasks.filter((t) => {
    if (!t.dueDate || t.status === "completed") return false;
    return isPast(new Date(t.dueDate));
  });

  // Priority breakdown
  const priorityMap: Record<string, number> = {};
  for (const t of normalizedTasks) {
    const p = t.priority || "none";
    priorityMap[p] = (priorityMap[p] || 0) + 1;
  }

  // Member count from project
  const memberCount = (project?.members?.length || 0) + (project?.manager ? 1 : 0);

  return (
    <div className="flex flex-col gap-6">
      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          {
            label: "Total Tasks",
            value: tp?.total || 0,
            icon: Circle,
            color: "text-slate-600",
            bg: "bg-slate-50",
          },
          {
            label: "Completed",
            value: tp?.completed || 0,
            icon: CheckCircle2,
            color: "text-green-600",
            bg: "bg-green-50",
          },
          {
            label: "In Progress",
            value: tp?.inProgress || 0,
            icon: Clock,
            color: "text-purple-600",
            bg: "bg-purple-50",
          },
          {
            label: "Completion",
            value: `${completionRate}%`,
            icon: TrendingUp,
            color: "text-blue-600",
            bg: "bg-blue-50",
          },
        ].map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-lg ${kpi.bg} ${kpi.color} shrink-0`}
              >
                <kpi.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{kpi.label}</p>
                <p className="text-xl font-bold">{kpi.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Project Overview + Timeline ── */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Project Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              Project Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-muted/40 rounded-lg">
                <p className="text-xs text-muted-foreground">Status</p>
                <p className="text-sm font-semibold capitalize mt-0.5">
                  {project?.status?.replace(/_/g, " ") || "—"}
                </p>
              </div>
              <div className="p-3 bg-muted/40 rounded-lg">
                <p className="text-xs text-muted-foreground">Priority</p>
                <p className="text-sm font-semibold capitalize mt-0.5">
                  {project?.priority || "—"}
                </p>
              </div>
              <div className="p-3 bg-muted/40 rounded-lg">
                <p className="text-xs text-muted-foreground">Team Members</p>
                <p className="text-sm font-semibold mt-0.5 flex items-center gap-1">
                  <Users2 className="h-3.5 w-3.5 text-muted-foreground" />
                  {memberCount}
                </p>
              </div>
              <div className="p-3 bg-muted/40 rounded-lg">
                <p className="text-xs text-muted-foreground">Overdue Tasks</p>
                <p className={`text-sm font-semibold mt-0.5 flex items-center gap-1 ${overdueTasks.length > 0 ? "text-red-600" : "text-green-600"}`}>
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {overdueTasks.length}
                </p>
              </div>
            </div>
            {project?.clientName && (
              <div className="text-xs text-muted-foreground">
                Client: <span className="font-medium text-foreground">{project.clientName}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Timeline */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              Timeline
              {isOverdue && (
                <Badge className="bg-red-100 text-red-700 text-[10px] h-4 px-1.5 ml-auto">
                  Overdue
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {startDate && endDate ? (
              <>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{format(startDate, "MMM d, yyyy")}</span>
                  <span>{format(endDate, "MMM d, yyyy")}</span>
                </div>
                <Progress
                  value={timelineProgress ?? 0}
                  className={`h-2 ${isOverdue ? "[&>div]:bg-red-500" : ""}`}
                />
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <p className="text-lg font-bold">{totalDays}</p>
                    <p className="text-xs text-muted-foreground">Total days</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold">{elapsedDays}</p>
                    <p className="text-xs text-muted-foreground">Elapsed</p>
                  </div>
                  <div>
                    <p className={`text-lg font-bold ${isOverdue ? "text-red-600" : remainingDays !== null && remainingDays <= 7 ? "text-orange-500" : ""}`}>
                      {remainingDays !== null ? (isOverdue ? `${Math.abs(remainingDays)}d late` : `${remainingDays}d`) : "—"}
                    </p>
                    <p className="text-xs text-muted-foreground">Remaining</p>
                  </div>
                </div>
                <div className="text-xs text-center text-muted-foreground">
                  {timelineProgress}% of timeline elapsed · {completionRate}% tasks complete
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground text-sm">
                <Calendar className="h-8 w-8 mb-2 opacity-20" />
                <p>No timeline set for this project</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Task Status Donut + Priority Breakdown ── */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Task Status Donut */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Task Status Breakdown</CardTitle>
            <CardDescription>Distribution by current status</CardDescription>
          </CardHeader>
          <CardContent>
            {donutData.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
                No task data yet
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <div className="flex-1" style={{ height: 160 }}>
                  <ChartContainer config={donutConfig} className="h-full w-full">
                    <PieChart>
                      <Pie
                        data={donutData}
                        cx="50%"
                        cy="50%"
                        innerRadius="46%"
                        outerRadius="74%"
                        dataKey="value"
                        nameKey="name"
                        paddingAngle={2}
                        startAngle={90}
                        endAngle={-270}
                      >
                        {donutData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                    </PieChart>
                  </ChartContainer>
                </div>
                <div className="flex flex-col gap-2">
                  {donutData.map((d) => (
                    <div key={d.name} className="flex items-center gap-2 text-xs">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ background: d.color }}
                      />
                      <span className="text-muted-foreground">{d.name}</span>
                      <span className="font-semibold ml-auto">{d.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Priority Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Flag className="h-4 w-4 text-primary" />
              Priority Breakdown
            </CardTitle>
            <CardDescription>Tasks by priority level</CardDescription>
          </CardHeader>
          <CardContent>
            {Object.keys(priorityMap).length === 0 ? (
              <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
                No task data yet
              </div>
            ) : (
              <div className="space-y-3 pt-2">
                {(["high", "medium", "low"] as const).map((p) => {
                  const count = priorityMap[p] || 0;
                  const pct = tp?.total ? Math.round((count / tp.total) * 100) : 0;
                  const colors = {
                    high: { bar: "bg-red-500", badge: "bg-red-100 text-red-700" },
                    medium: { bar: "bg-yellow-500", badge: "bg-yellow-100 text-yellow-700" },
                    low: { bar: "bg-slate-400", badge: "bg-slate-100 text-slate-600" },
                  };
                  return (
                    <div key={p}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className={`font-medium px-1.5 py-0.5 rounded text-[10px] ${colors[p].badge}`}>
                          {p.charAt(0).toUpperCase() + p.slice(1)}
                        </span>
                        <span className="text-muted-foreground">{count} tasks ({pct}%)</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${colors[p].bar}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Team Contribution + Overdue Tasks ── */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Team Contribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Team Contribution</CardTitle>
            <CardDescription>Tasks per team member</CardDescription>
          </CardHeader>
          <CardContent>
            {teamContribution.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
                No task assignments yet
              </div>
            ) : (
              <div className="space-y-3">
                {teamContribution.map((member) => {
                  const pct =
                    member.total > 0
                      ? Math.round((member.completed / member.total) * 100)
                      : 0;
                  return (
                    <div key={member.id} className="flex items-center gap-3">
                      <Avatar className="h-7 w-7 shrink-0">
                        <AvatarImage src={member.avatar} />
                        <AvatarFallback className="text-[10px]">
                          {member.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="font-medium truncate">{member.name}</span>
                          <span className="text-muted-foreground shrink-0 ml-2">
                            {member.completed}/{member.total} ({pct}%)
                          </span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-green-500 rounded-full transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Overdue Tasks */}
        <Card className={overdueTasks.length > 0 ? "border-red-200 dark:border-red-900/50" : ""}>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className={`h-4 w-4 ${overdueTasks.length > 0 ? "text-red-500" : "text-muted-foreground"}`} />
              Overdue Tasks
              {overdueTasks.length > 0 && (
                <Badge className="bg-red-100 text-red-700 text-[10px] h-4 px-1.5 ml-auto">
                  {overdueTasks.length}
                </Badge>
              )}
            </CardTitle>
            <CardDescription>Tasks past their due date</CardDescription>
          </CardHeader>
          <CardContent>
            {overdueTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground text-sm">
                <CheckCircle2 className="h-8 w-8 mb-2 opacity-20 text-green-500" />
                <p>No overdue tasks</p>
              </div>
            ) : (
              <div className="divide-y">
                {overdueTasks.slice(0, 6).map((task: any) => (
                  <div key={task.id} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <AlertTriangle className="h-3 w-3 text-red-500 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{task.title}</p>
                        <p className="text-xs text-muted-foreground">{task.assigneeName || "Unassigned"}</p>
                      </div>
                    </div>
                    <span className="text-xs text-red-600 shrink-0 ml-2">
                      {task.dueDate ? format(new Date(task.dueDate), "MMM d") : "—"}
                    </span>
                  </div>
                ))}
                {overdueTasks.length > 6 && (
                  <p className="text-xs text-muted-foreground pt-2">+{overdueTasks.length - 6} more overdue</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Upcoming Deadlines ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Upcoming Deadlines</CardTitle>
          <CardDescription>Tasks due in the next 14 days</CardDescription>
        </CardHeader>
        <CardContent>
          {upcomingDeadlines.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground text-sm">
              <CheckCircle2 className="h-8 w-8 mb-2 opacity-20" />
              <p>No upcoming deadlines</p>
            </div>
          ) : (
            <div className="divide-y">
              {upcomingDeadlines.map((task: any) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-1 rounded-full bg-slate-100 text-slate-500 shrink-0">
                      <Circle className="h-3 w-3" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{task.title}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {task.assigneeName || "Unassigned"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge
                      variant="outline"
                      className={`text-[10px] px-1 py-0 h-4 ${PRIORITY_COLORS[task.priority] || ""}`}
                    >
                      {task.priority}
                    </Badge>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {task.dueDate ? format(new Date(task.dueDate), "MMM d") : "—"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
