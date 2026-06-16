"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CheckCircle2,
  AlertCircle,
  PlayCircle,
  Clock,
  Layout,
  Plus,
  Calendar,
  MoreVertical,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { toast } from "sonner";
import { CreatePersonalTaskSheet } from "@/components/projects/CreatePersonalTaskSheet";

// Mock types for now - these would match backend types
interface Task {
  id: string;
  title: string;
  description: string;
  priority: "low" | "medium" | "high";
  status: "todo" | "in_progress" | "review" | "done";
  dueDate: string;
  projectId: string;
  projectName: string;
}

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1";

const PRIORITY_COLORS = {
  low: "bg-slate-100 text-slate-700 border-slate-200",
  medium: "bg-yellow-100 text-yellow-700 border-yellow-200",
  high: "bg-red-100 text-red-700 border-red-200",
};

const STATUS_CONFIG = {
  todo: {
    label: "To Do",
    color: "bg-slate-100 text-slate-700 border-slate-200",
    icon: Layout,
  },
  in_progress: {
    label: "In Progress",
    color: "bg-blue-100 text-blue-700 border-blue-200",
    icon: PlayCircle,
  },
  review: {
    label: "Review",
    color: "bg-purple-100 text-purple-700 border-purple-200",
    icon: AlertCircle,
  },
  done: {
    label: "Done",
    color: "bg-green-100 text-green-700 border-green-200",
    icon: CheckCircle2,
  },
};

export default function MyTasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [isNewTaskOpen, setIsNewTaskOpen] = useState(false);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("crm_access_token");
      // This endpoint needs to be implemented/verified in backend or use existing tasks endpoint with filters
      const res = await fetch(`${API_URL}/projects/tasks/my-tasks`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setTasks(data.data);
      } else {
        // Fallback or handle error
        console.log("Failed to fetch tasks");
      }
    } catch (error) {
      console.error("Failed to fetch tasks:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    try {
      const token = localStorage.getItem("crm_access_token");
      const res = await fetch(`${API_URL}/tasks/${taskId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        setTasks(
          tasks.map((t) =>
            t.id === taskId ? { ...t, status: newStatus as any } : t,
          ),
        );
        toast.success("Status updated");
      } else {
        toast.error("Failed to update status");
      }
    } catch (error) {
      console.error("Failed to update status:", error);
      toast.error("Failed to update status");
    }
  };

  return (
    <div className="flex flex-col gap-6 p-4 lg:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Tasks</h1>
          <p className="text-muted-foreground">
            Manage your personal tasks and assigned work.
          </p>
        </div>
        <Button onClick={() => setIsNewTaskOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Personal Task
        </Button>
        <CreatePersonalTaskSheet
          open={isNewTaskOpen}
          onOpenChange={setIsNewTaskOpen}
          onCreated={fetchTasks}
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Task Columns or List - keeping it simple list for now due to time */}
        {loading ? (
          <div className="col-span-full">
            <Skeleton className="h-12 w-full mb-2" />
            <Skeleton className="h-12 w-full mb-2" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : tasks.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center h-64 border rounded-lg bg-slate-50">
            <CheckCircle2 className="h-10 w-10 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No tasks found</h3>
            <p className="text-muted-foreground text-center max-w-sm mt-1">
              You don&apos;t have any active tasks assigned to you.
            </p>
          </div>
        ) : (
          tasks.map((task) => (
            <Card key={task.id} className="flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  {task.projectName && (
                    <Badge variant="secondary" className="mb-2">
                      {task.projectName}
                    </Badge>
                  )}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="-mr-2 -mt-2"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => handleStatusChange(task.id, "done")}
                      >
                        Mark as Done
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <CardTitle className="text-base line-clamp-1">
                  {task.title}
                </CardTitle>
                <CardDescription className="line-clamp-2 min-h-[2.5rem]">
                  {task.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="mt-auto pt-0 pb-3">
                <div className="flex items-center justify-between text-sm">
                  <Badge
                    variant="outline"
                    className={PRIORITY_COLORS[task.priority]}
                  >
                    {task.priority}
                  </Badge>
                  {task.dueDate && (
                    <span className="text-muted-foreground text-xs flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(task.dueDate), "MMM d")}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
