"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import {
  Loader2,
  Bell,
  BellOff,
  Calendar,
  AlertCircle,
  CheckSquare,
  ArrowUpCircle,
  ArrowRightCircle,
  ArrowDownCircle,
  Plus,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { tasksApi } from "@/lib/api";
import { formatIST } from "@/lib/date-utils";
import { CreateTaskSheet } from "@/components/projects/CreateTaskSheet";
import type { Task } from "@/types";

const priorityConfig = {
  high: { label: "High", icon: ArrowUpCircle, color: "text-red-600 bg-red-100 border-red-200" },
  medium: { label: "Medium", icon: ArrowRightCircle, color: "text-orange-600 bg-orange-100 border-orange-200" },
  low: { label: "Low", icon: ArrowDownCircle, color: "text-green-600 bg-green-100 border-green-200" },
};

const REMINDER_LABELS: Record<number, string> = {
  15: "15 mins before",
  30: "30 mins before",
  60: "1 hour before",
  120: "2 hours before",
  1440: "1 day before",
  2880: "2 days before",
  10080: "1 week before",
};

function getReminderLabel(minutes: number): string {
  return REMINDER_LABELS[minutes] ?? `${minutes} min before`;
}

export default function ProjectRemindersPage() {
  const params = useParams();
  const id = params.id as string;

  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [createTaskOpen, setCreateTaskOpen] = useState(false);

  const fetchTasks = useCallback(
    async (quiet = false) => {
      if (!quiet) setIsLoading(true);
      try {
        const result = await tasksApi.list({ projectId: id, limit: 500 });
        const taskList = Array.isArray(result) ? result : (result as any)?.data || [];
        setTasks(taskList);
      } catch (error) {
        console.error("Failed to fetch tasks", error);
      } finally {
        setIsLoading(false);
      }
    },
    [id],
  );

  useEffect(() => {
    if (id) fetchTasks();
  }, [fetchTasks]);

  const tasksWithReminders = tasks
    .filter(
      (t) =>
        t.reminderBeforeMinutes != null &&
        t.status !== "completed" &&
        t.status !== "cancelled",
    )
    .sort((a, b) => {
      if (a.dueDate && b.dueDate)
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      if (a.dueDate) return -1;
      if (b.dueDate) return 1;
      return 0;
    });

  const tasksWithoutReminders = tasks.filter(
    (t) =>
      t.reminderBeforeMinutes == null &&
      t.status !== "completed" &&
      t.status !== "cancelled",
  );

  if (isLoading) {
    return (
      <div className="flex h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Reminders
          </h2>
          <p className="text-sm text-muted-foreground">
            Active tasks with reminder notifications set.
          </p>
        </div>
        <Button size="sm" className="gap-1" onClick={() => setCreateTaskOpen(true)}>
          <Plus className="h-4 w-4" />
          Create Task
        </Button>
        <CreateTaskSheet
          open={createTaskOpen}
          onOpenChange={setCreateTaskOpen}
          projectId={id}
          onCreated={() => fetchTasks(true)}
        />
      </div>

      {/* With reminders */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" />
            Tasks with Reminders
            <Badge variant="secondary" className="ml-1">
              {tasksWithReminders.length}
            </Badge>
          </CardTitle>
          <CardDescription>
            These tasks will trigger a notification before their due date.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {tasksWithReminders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
              <BellOff className="h-10 w-10 mb-2 opacity-20" />
              <p>No tasks with reminders.</p>
              <p className="text-xs mt-1">
                Create a task and set a reminder to see it here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {tasksWithReminders.map((task) => {
                const priority =
                  priorityConfig[task.priority as keyof typeof priorityConfig] ||
                  priorityConfig.medium;
                const PriorityIcon = priority.icon;
                const isOverdue =
                  task.dueDate && new Date(task.dueDate) < new Date();

                return (
                  <div
                    key={task.id}
                    className={`flex items-start gap-4 p-4 rounded-lg border transition-colors ${
                      isOverdue
                        ? "border-red-200 bg-red-50/50"
                        : "hover:bg-muted/40"
                    }`}
                  >
                    <div className={`p-2 rounded-lg shrink-0 ${priority.color}`}>
                      <PriorityIcon className="w-4 h-4" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <p className="font-medium truncate">{task.title}</p>
                        {isOverdue && (
                          <Badge variant="outline" className="text-red-600 border-red-200 bg-red-50 text-[10px]">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Overdue
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                        {task.dueDate && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Due {formatIST(task.dueDate, "MMM d, yyyy")}
                          </span>
                        )}
                        <span className="flex items-center gap-1 text-primary font-medium">
                          <Bell className="h-3 w-3" />
                          {getReminderLabel(task.reminderBeforeMinutes!)}
                        </span>
                        {(task as any).assignee && (
                          <span className="flex items-center gap-1">
                            <Avatar className="h-4 w-4">
                              <AvatarImage
                                src={(task as any).assignee?.avatarUrl || undefined}
                              />
                              <AvatarFallback className="text-[8px]">
                                {(task as any).assignee?.fullName?.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            {(task as any).assignee?.fullName}
                          </span>
                        )}
                      </div>
                    </div>

                    <Badge variant="outline" className={priority.color}>
                      {priority.label}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Without reminders */}
      {tasksWithoutReminders.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <BellOff className="h-4 w-4 text-muted-foreground" />
              No Reminder Set
              <Badge variant="outline" className="ml-1">
                {tasksWithoutReminders.length}
              </Badge>
            </CardTitle>
            <CardDescription>
              Active tasks that don&apos;t have a reminder configured.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {tasksWithoutReminders.map((task) => {
                const priority =
                  priorityConfig[task.priority as keyof typeof priorityConfig] ||
                  priorityConfig.medium;
                return (
                  <div
                    key={task.id}
                    className="flex items-center gap-3 p-3 rounded-md border hover:bg-muted/40 transition-colors"
                  >
                    <CheckSquare className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="flex-1 text-sm truncate">{task.title}</span>
                    {task.dueDate && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1 shrink-0">
                        <Calendar className="h-3 w-3" />
                        {formatIST(task.dueDate, "MMM d")}
                      </span>
                    )}
                    <Badge variant="outline" className={`text-[10px] ${priority.color}`}>
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
  );
}
