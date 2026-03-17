"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { Loader2, CheckCircle2, Clock, Circle, Calendar } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { format, addDays } from "date-fns";
import type { Project, Task } from "@/types";
import { projectsApi } from "@/lib/projects-api";
import { tasksApi } from "@/lib/api";
import { useHeaderRefresh } from "@/hooks/use-header-refresh";
import { nowIST } from "@/lib/date-utils";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1";

const DONUT_COLORS = {
  completed: "#22c55e",
  in_progress: "#a855f7",
  todo: "#94a3b8",
  review: "#3b82f6",
};

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
        { name: "Completed", value: tp.completed, color: DONUT_COLORS.completed },
        { name: "In Progress", value: tp.inProgress, color: DONUT_COLORS.in_progress },
        { name: "To Do", value: tp.todo, color: DONUT_COLORS.todo },
      ].filter((d) => d.value > 0)
    : [];

  const completionRate =
    tp && tp.total > 0 ? Math.round((tp.completed / tp.total) * 100) : 0;

  // Team contribution: tasks per assignee
  const assigneeMap: Record<
    string,
    { name: string; avatar?: string; total: number; completed: number }
  > = {};
  for (const task of tasks) {
    const assigneeId = (task as any).assignedTo || (task as any).assigned_to;
    if (!assigneeId) continue;
    const name =
      (task as any).assignee?.fullName ||
      (task as any).assignee?.full_name ||
      "Unknown";
    const avatar =
      (task as any).assignee?.avatarUrl ||
      (task as any).assignee?.avatar_url ||
      undefined;
    if (!assigneeMap[assigneeId]) {
      assigneeMap[assigneeId] = { name, avatar, total: 0, completed: 0 };
    }
    assigneeMap[assigneeId].total++;
    if ((task as any).status === "completed") {
      assigneeMap[assigneeId].completed++;
    }
  }
  const teamContribution = Object.entries(assigneeMap)
    .map(([id, data]) => ({ id, ...data }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  // Upcoming deadlines: tasks with due_date in next 14 days
  const now = nowIST();
  const cutoff = addDays(now, 14);
  const upcomingDeadlines = tasks
    .filter((t: any) => {
      if (!t.due_date || t.status === "completed") return false;
      const d = new Date(t.due_date);
      return d >= now && d <= cutoff;
    })
    .sort((a: any, b: any) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
    .slice(0, 8);

  return (
    <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto">
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
            icon: CheckCircle2,
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

      {/* ── Donut + Team Contribution ── */}
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
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={donutData}
                        cx="50%"
                        cy="50%"
                        innerRadius="46%"
                        outerRadius="74%"
                        dataKey="value"
                        paddingAngle={2}
                        startAngle={90}
                        endAngle={-270}
                      >
                        {donutData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          borderRadius: "8px",
                          fontSize: 12,
                          border: "1px solid hsl(var(--border))",
                          background: "hsl(var(--card))",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
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
                          <span className="font-medium truncate">
                            {member.name}
                          </span>
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
                      <p className="text-sm font-medium truncate">
                        {task.title}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {task.assignee?.fullName || task.assignee?.full_name || "Unassigned"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge
                      variant="outline"
                      className={`text-[10px] px-1 py-0 h-4 ${
                        PRIORITY_COLORS[task.priority] || ""
                      }`}
                    >
                      {task.priority}
                    </Badge>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(task.due_date), "MMM d")}
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
