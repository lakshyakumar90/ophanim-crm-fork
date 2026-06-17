"use client";

import { useEffect, useState } from "react";
import {
  BarChart3,
  PieChart,
  TrendingUp,
  Users2,
  RefreshCw,
  FolderKanban,
  Briefcase,
  AlertCircle,
  Activity,
  CheckCircle2,
} from "lucide-react";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { projectsApi, type ProjectStats } from "@/lib/projects-api";
import { useAuth, useIsAdmin, useIsManager } from "@/providers/auth-provider";
import {
  PieChart as RechartsPie,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { ChartCard } from "@/components/charts/chart-card";
import { buildChartConfig, chartAxisProps, chartGridProps } from "@/components/charts/chart-config";
import { ScrollArea } from "@/components/ui/scroll-area";

const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
] as const;

const pmPerformanceConfig = buildChartConfig({
  Completion: { label: "Completion Rate %", colorIndex: 0 },
  Overdue: { label: "Overdue Tasks", colorIndex: 3 },
});

const workloadConfig = buildChartConfig({
  Tasks: { label: "Active Tasks", colorIndex: 1 },
});

export default function ProjectAnalyticsPage() {
  const { user } = useAuth();
  const isAdmin = useIsAdmin();
  const isManager = useIsManager();
  const [stats, setStats] = useState<ProjectStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchStats = async () => {
    setIsLoading(true);
    try {
      const statsData = await projectsApi.getStats();
      if (statsData) {
        setStats(statsData);
      }
    } catch (error) {
      console.error("Failed to fetch stats", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-full bg-background p-6 space-y-6">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center">
        <div className="bg-muted/50 p-4 rounded-full mb-3">
          <BarChart3 className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="text-xl font-semibold">No Analytics Available</h3>
        <p className="text-muted-foreground max-w-sm mt-2">
          Analytics will appear once you have active projects.
        </p>
      </div>
    );
  }

  // Prepare Chart Data
  const statusData = [
    { name: "Active", value: stats.active },
    {
      name: "Completed",
      value: stats.completed,
    },
    { name: "Planned", value: stats.planned },
    { name: "On Hold", value: stats.onHold },
    {
      name: "Cancelled",
      value: stats.cancelled,
    },
  ]
    .filter((d) => d.value > 0)
    .map((entry, index) => ({
      ...entry,
      fill: CHART_COLORS[index % CHART_COLORS.length],
    }));

  const statusConfig = buildChartConfig(
    Object.fromEntries(statusData.map((d) => [d.name, { label: d.name }])),
  );

  const priorityData = [
    { name: "High", value: stats.byPriority.high },
    {
      name: "Medium",
      value: stats.byPriority.medium,
    },
    { name: "Low", value: stats.byPriority.low },
  ];

  const pmData = stats.byManager.map((pm) => ({
    name: pm.managerName.split(" ")[0],
    fullName: pm.managerName,
    Projects: pm.projectCount,
    Completion: pm.taskCompletionRate || 0,
    Overdue: pm.overdueTasks || 0,
  }));

  const workloadData =
    stats.teamWorkload?.map((w) => ({
      name: w.userName.split(" ")[0],
      fullName: w.userName,
      Tasks: w.activeTasks,
    })) || [];

  return (
    <div className="flex flex-col h-full bg-background overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col gap-4 p-6 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b z-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Project Analytics
            </h1>
            <p className="text-muted-foreground">
              Real-time insights on projects, tasks, and team performance
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchStats}
            className="hidden md:flex gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-6 space-y-6">
          {/* Detailed Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            <Card>
              <CardContent className="p-4 flex flex-col gap-2">
                <p className="text-sm font-medium text-muted-foreground">
                  Total Projects
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold">{stats.total}</span>
                  <FolderKanban className="h-4 w-4 text-blue-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex flex-col gap-2">
                <p className="text-sm font-medium text-muted-foreground">
                  Active Now
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold">{stats.active}</span>
                  <Activity className="h-4 w-4 text-green-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex flex-col gap-2">
                <p className="text-sm font-medium text-muted-foreground">
                  Successfully Done
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold">{stats.completed}</span>
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex flex-col gap-2">
                <p className="text-sm font-medium text-muted-foreground">
                  Overdue Tasks
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold text-red-600">
                    {stats.totalOverdueTasks || 0}
                  </span>
                  <AlertCircle className="h-4 w-4 text-red-500" />
                </div>
              </CardContent>
            </Card>
            <Card className="col-span-2 md:col-span-4 lg:col-span-1">
              <CardContent className="p-4 flex flex-col gap-2">
                <p className="text-sm font-medium text-muted-foreground">
                  Managers
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold">
                    {stats.byManager.length}
                  </span>
                  <Users2 className="h-4 w-4 text-purple-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartCard
              title="Project Status"
              description="Distribution of active vs inactive projects"
              height={280}
            >
              <ChartContainer config={statusConfig} className="h-full w-full">
                <RechartsPie>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    nameKey="name"
                    label={({ name, percent }) =>
                      percent !== undefined && percent > 0.05
                        ? `${name} ${(percent * 100).toFixed(0)}%`
                        : ""
                    }
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                  <ChartLegend content={<ChartLegendContent />} />
                </RechartsPie>
              </ChartContainer>
            </ChartCard>

            {(isAdmin || isManager) && (
              <ChartCard
                title="Manager Performance"
                description="Task completion rates & overdue count"
                height={280}
              >
                <ChartContainer config={pmPerformanceConfig} className="h-full w-full">
                  <BarChart data={pmData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid {...chartGridProps} />
                    <XAxis dataKey="name" {...chartAxisProps} />
                    <YAxis yAxisId="left" orientation="left" {...chartAxisProps} width={32} />
                    <YAxis yAxisId="right" orientation="right" {...chartAxisProps} width={32} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <ChartLegend content={<ChartLegendContent />} />
                    <Bar
                      yAxisId="left"
                      dataKey="Completion"
                      fill="var(--color-Completion)"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      yAxisId="right"
                      dataKey="Overdue"
                      fill="var(--color-Overdue)"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ChartContainer>
              </ChartCard>
            )}

            {(isAdmin || isManager) && workloadData.length > 0 && (
              <ChartCard
                title="Top Active Team Workload"
                description="Users with the most active tasks assigned"
                className="lg:col-span-2"
                height={280}
              >
                <ChartContainer config={workloadConfig} className="h-full w-full">
                  <BarChart
                    data={workloadData}
                    layout="vertical"
                    margin={{ top: 0, right: 30, left: 40, bottom: 5 }}
                  >
                    <CartesianGrid {...chartGridProps} horizontal vertical={false} />
                    <XAxis type="number" {...chartAxisProps} />
                    <YAxis dataKey="fullName" type="category" width={100} {...chartAxisProps} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar
                      dataKey="Tasks"
                      fill="var(--color-Tasks)"
                      radius={[0, 4, 4, 0]}
                      barSize={20}
                    />
                  </BarChart>
                </ChartContainer>
              </ChartCard>
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
