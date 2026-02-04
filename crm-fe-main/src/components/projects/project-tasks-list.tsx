"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { tasksApi } from "@/lib/api";
import { Task } from "@/types";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  RefreshCw,
  Loader2,
  CheckSquare,
  ArrowUpCircle,
  ArrowRightCircle,
  ArrowDownCircle,
  Calendar,
} from "lucide-react";
import { formatIST, formatDistanceToNowIST } from "@/lib/date-utils";

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

export function ProjectTasksList({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTasks = async () => {
    setIsLoading(true);
    try {
      const res = await tasksApi.list({ projectId, limit: 100 });
      if (res.data.success) {
        setTasks(res.data.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch tasks", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) {
      fetchTasks();
    }
  }, [projectId]);

  const sortedTasks = [...tasks].sort((a, b) => {
    // Sort by status (todo/in_progress first)
    if (a.status === "completed" && b.status !== "completed") return 1;
    if (a.status !== "completed" && b.status === "completed") return -1;

    // Then by due date
    if (a.dueDate && b.dueDate) {
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    }
    return 0;
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Project Tasks</CardTitle>
          <CardDescription>Manage tasks for this project</CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() =>
              router.push(`/projects/tasks/new?projectId=${projectId}`)
            }
          >
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
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : sortedTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center text-muted-foreground border-2 border-dashed rounded-lg">
            <CheckSquare className="h-8 w-8 mb-2 opacity-20" />
            <p>No tasks found for this project.</p>
            <Button
              variant="link"
              onClick={() =>
                router.push(`/projects/tasks/new?projectId=${projectId}`)
              }
            >
              Create your first task
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedTasks.map((task) => {
              const priority =
                priorityConfig[task.priority as keyof typeof priorityConfig] ||
                priorityConfig.medium;
              const status = statusConfig[task.status] || statusConfig.todo;
              const PriorityIcon = priority.icon;
              const isOverdue =
                task.dueDate &&
                task.status !== "completed" &&
                new Date(task.dueDate) < new Date();

              return (
                <div
                  key={task.id}
                  className={`flex items-start gap-4 p-4 rounded-lg border transition-colors hover:bg-muted/50 ${isOverdue ? "bg-red-50/50 border-red-200" : ""}`}
                >
                  <div className={`p-2 rounded-lg mt-1 ${priority.color}`}>
                    <PriorityIcon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <p className="font-medium truncate">{task.title}</p>
                      <Badge variant="outline" className={status.color}>
                        {status.label}
                      </Badge>
                    </div>
                    {task.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                        {task.description}
                      </p>
                    )}

                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      {task.dueDate && (
                        <span
                          className={`flex items-center gap-1 ${isOverdue ? "text-red-600 font-medium" : ""}`}
                        >
                          <Calendar className="w-3 h-3" />
                          {formatIST(task.dueDate, "MMM d")}
                        </span>
                      )}
                      {task.assignedTo && (
                        <span className="flex items-center gap-1">
                          Assigned
                        </span>
                      )}
                      <span>
                        {formatDistanceToNowIST(task.createdAt, {
                          addSuffix: true,
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
