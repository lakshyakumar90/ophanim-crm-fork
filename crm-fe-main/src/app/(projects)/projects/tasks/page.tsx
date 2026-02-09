"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import { tasksApi } from "@/lib/api";
import { useAuth, useIsAdmin, useIsManager } from "@/providers/auth-provider";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CheckSquare,
  Clock,
  AlertCircle,
  Search,
  RefreshCw,
  FolderKanban,
  ArrowUpCircle,
  ArrowRightCircle,
  ArrowDownCircle,
  Loader2,
  Plus,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { formatDistanceToNowIST, formatIST } from "@/lib/date-utils";
import type { Task } from "@/types";

const priorityConfig = {
  high: {
    label: "High",
    icon: ArrowUpCircle,
    color: "text-red-600 bg-red-100 border-red-200",
  },
  medium: {
    label: "Medium",
    icon: ArrowRightCircle,
    color: "text-orange-600 bg-orange-100 border-orange-200",
  },
  low: {
    label: "Low",
    icon: ArrowDownCircle,
    color: "text-green-600 bg-green-100 border-green-200",
  },
};

const statusConfig: Record<string, { label: string; color: string }> = {
  todo: { label: "To Do", color: "bg-slate-100 text-slate-700" },
  in_progress: { label: "In Progress", color: "bg-blue-100 text-blue-700" },
  completed: { label: "Completed", color: "bg-green-100 text-green-700" },
  cancelled: { label: "Cancelled", color: "bg-red-100 text-red-700" },
};

export default function ProjectTasksPage() {
  const router = useRouter();
  const { user } = useAuth();
  const isAdmin = useIsAdmin();
  const isManager = useIsManager();

  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [tasks, setTasks] = useState<Task[]>([]);

  const fetchTasks = async () => {
    setIsLoading(true);
    try {
      const tasksResult = await tasksApi.list({ limit: 200 });
      const tasksList = tasksResult?.data || tasksResult || [];
      setTasks(Array.isArray(tasksList) ? tasksList : []);
    } catch (error) {
      console.error("Failed to fetch tasks", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  // Filter tasks that are project-related (have a projectId)
  const projectTasks = tasks.filter(
    (t) => t.projectId !== null && t.projectId !== undefined,
  );

  // Apply filters
  const filteredTasks = projectTasks.filter((task) => {
    const matchesSearch =
      !search ||
      task.title.toLowerCase().includes(search.toLowerCase()) ||
      task.description?.toLowerCase().includes(search.toLowerCase());
    const matchesPriority =
      priorityFilter === "all" || task.priority === priorityFilter;
    const matchesStatus =
      statusFilter === "all" || task.status === statusFilter;
    return matchesSearch && matchesPriority && matchesStatus;
  });

  // Sort by priority first (high > medium > low), then by due date
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    const priorityOrder: Record<string, number> = {
      high: 0,
      medium: 1,
      low: 2,
    };
    const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (priorityDiff !== 0) return priorityDiff;

    // Then by due date (earliest first, null last)
    if (a.dueDate && b.dueDate) {
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    }
    if (a.dueDate) return -1;
    if (b.dueDate) return 1;
    return 0;
  });

  // Stats
  const stats = {
    total: projectTasks.length,
    pending: projectTasks.filter(
      (t) => t.status === "todo" || t.status === "in_progress",
    ).length,
    highPriority: projectTasks.filter(
      (t) => t.priority === "high" && t.status !== "completed",
    ).length,
    overdue: projectTasks.filter((t) => {
      if (!t.dueDate || t.status === "completed") return false;
      return new Date(t.dueDate) < new Date();
    }).length,
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-full bg-background">
        <div className="p-6 border-b">
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="p-6">
          <div className="flex items-center justify-center h-40">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex flex-col gap-4 p-6 bg-background/50 backdrop-blur-sm border-b sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Project Tasks</h1>
            <p className="text-muted-foreground">
              {isAdmin
                ? "All project tasks across the organization"
                : isManager
                  ? "Tasks for your projects"
                  : "Your assigned project tasks (sorted by priority)"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={() => router.push("/projects/tasks/new")}>
              <Plus className="w-4 h-4 mr-2" />
              Create Task
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={fetchTasks}
              disabled={isLoading}
            >
              <RefreshCw
                className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`}
              />
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tasks..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priority</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="todo">To Do</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-6 overflow-y-auto space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-lg bg-blue-100 text-blue-700">
                <CheckSquare className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total Tasks</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-lg bg-orange-100 text-orange-700">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.pending}</p>
                <p className="text-xs text-muted-foreground">Pending</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-lg bg-red-100 text-red-700">
                <ArrowUpCircle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.highPriority}</p>
                <p className="text-xs text-muted-foreground">High Priority</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-lg bg-rose-100 text-rose-700">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.overdue}</p>
                <p className="text-xs text-muted-foreground">Overdue</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Task List */}
        {sortedTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center border-2 border-dashed rounded-lg border-muted-foreground/25">
            <div className="bg-muted/50 p-4 rounded-full mb-3">
              <CheckSquare className="w-6 h-6 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold">No tasks found</h3>
            <p className="text-muted-foreground max-w-sm mt-1">
              {search || priorityFilter !== "all" || statusFilter !== "all"
                ? "Try adjusting your filters"
                : "No project tasks assigned yet"}
            </p>
          </div>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FolderKanban className="h-5 w-5" />
                Tasks ({sortedTasks.length})
              </CardTitle>
              <CardDescription>
                Sorted by priority (High → Medium → Low) and due date
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {sortedTasks.map((task) => {
                  const priority =
                    priorityConfig[
                      task.priority as keyof typeof priorityConfig
                    ] || priorityConfig.medium;
                  const status = statusConfig[task.status] || statusConfig.todo;
                  const PriorityIcon = priority.icon;
                  const isOverdue =
                    task.dueDate &&
                    task.status !== "completed" &&
                    new Date(task.dueDate) < new Date();

                  return (
                    <div
                      key={task.id}
                      className={`flex items-center gap-4 p-4 rounded-lg border transition-colors hover:bg-muted/50 ${
                        isOverdue
                          ? "border-red-200 bg-red-50/50 dark:bg-red-950/20"
                          : ""
                      }`}
                    >
                      {/* Priority Icon */}
                      <div className={`p-2 rounded-lg ${priority.color}`}>
                        <PriorityIcon className="w-4 h-4" />
                      </div>

                      {/* Task Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <p className="font-medium truncate">{task.title}</p>
                          <Badge variant="outline" className={status.color}>
                            {status.label}
                          </Badge>
                        </div>
                        {task.description && (
                          <p className="text-sm text-muted-foreground truncate">
                            {task.description}
                          </p>
                        )}
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          {task.dueDate && (
                            <span
                              className={
                                isOverdue ? "text-red-600 font-medium" : ""
                              }
                            >
                              {isOverdue ? "Overdue: " : "Due: "}
                              {formatIST(task.dueDate, "MMM d, yyyy")}
                            </span>
                          )}
                          <span>
                            Created{" "}
                            {formatDistanceToNowIST(task.createdAt, {
                              addSuffix: true,
                            })}
                          </span>
                        </div>
                      </div>

                      {/* Priority Badge */}
                      <Badge variant="outline" className={priority.color}>
                        {priority.label}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
