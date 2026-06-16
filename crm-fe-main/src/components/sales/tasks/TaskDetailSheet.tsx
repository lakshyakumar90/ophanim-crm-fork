"use client";

import { useCallback, useEffect, useState } from "react";
import useSWR, { mutate } from "swr";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { tasksApi, usersApi } from "@/lib/api";
import { useAuth, useIsManager, useIsAdmin } from "@/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Calendar,
  CheckCircle,
  Send,
  Pencil,
  Loader2,
  Bell,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import type { Task, TaskComment } from "@/types";
import {
  toLocaleDateStringIST,
  toLocaleStringIST,
  nowIST,
  getTodayIST,
} from "@/lib/date-utils";
import { FormSideSheet } from "@/components/ui/form-side-sheet";

const statusColors = {
  todo: "bg-slate-100 text-slate-700",
  in_progress: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

const priorityColors = {
  high: "bg-red-100 text-red-700",
  medium: "bg-amber-100 text-amber-700",
  low: "bg-green-100 text-green-700",
};

const taskSchema = z.object({
  title: z.string().min(3, "Title is required"),
  description: z.string().optional(),
  assignedTo: z.string().optional(),
  priority: z.enum(["low", "medium", "high"]),
  reminderBeforeMinutes: z.number().optional().nullable(),
});

type TaskFormData = z.infer<typeof taskSchema>;

const REMINDER_OPTIONS = [
  { value: null, label: "No reminder" },
  { value: 15, label: "15 minutes before" },
  { value: 30, label: "30 minutes before" },
  { value: 60, label: "1 hour before" },
  { value: 1440, label: "1 day before" },
];

const HOURS = Array.from({ length: 12 }, (_, i) =>
  (i + 1).toString().padStart(2, "0"),
);
const MINUTES = ["00", "15", "30", "45"];

function TaskEditForm({
  taskId,
  task,
  onSaved,
  onCancel,
}: {
  taskId: string;
  task: Task;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const { user } = useAuth();
  const isManager = useIsManager();
  const isAdmin = useIsAdmin();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dueDate, setDueDate] = useState("");
  const [dueHour, setDueHour] = useState("09");
  const [dueMinute, setDueMinute] = useState("00");
  const [duePeriod, setDuePeriod] = useState<"AM" | "PM">("AM");

  const { data: usersData, isLoading: loadingUsers } = useSWR(
    isManager || isAdmin ? "users-list" : null,
    () => usersApi.list(),
  );
  const users = usersData?.data || [];

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
  });

  useEffect(() => {
    reset({
      title: task.title,
      description: task.description || "",
      assignedTo: task.assignedTo,
      priority: task.priority as "low" | "medium" | "high",
      reminderBeforeMinutes: task.reminderBeforeMinutes,
    });
    if (task.dueDate) {
      const [datePart, timePart] = task.dueDate.split("T");
      setDueDate(datePart);
      if (timePart) {
        const [hStr, mStr] = timePart.substring(0, 5).split(":");
        let h = parseInt(hStr);
        const m = mStr;
        let period: "AM" | "PM" = "AM";
        if (h >= 12) {
          period = "PM";
          if (h > 12) h -= 12;
        }
        if (h === 0) h = 12;
        setDueHour(h.toString().padStart(2, "0"));
        setDueMinute(m);
        setDuePeriod(period);
      }
    }
  }, [task, reset]);

  const buildDueDateISO = (): string | undefined => {
    if (!dueDate) return undefined;
    let hour24 = parseInt(dueHour);
    if (duePeriod === "PM" && hour24 !== 12) hour24 += 12;
    else if (duePeriod === "AM" && hour24 === 12) hour24 = 0;
    return `${dueDate}T${hour24.toString().padStart(2, "0")}:${dueMinute.padStart(2, "0")}:00.000Z`;
  };

  const onSubmit = async (data: TaskFormData) => {
    setIsSubmitting(true);
    try {
      await tasksApi.update(taskId, {
        ...data,
        dueDate: buildDueDateISO(),
        assignedTo: isManager || isAdmin ? data.assignedTo : undefined,
      });
      toast.success("Task updated successfully");
      mutate(`task-${taskId}`);
      onSaved();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: { message?: string } } } };
      toast.error(err.response?.data?.error?.message || "Failed to update task");
    } finally {
      setIsSubmitting(false);
    }
  };

  const today = getTodayIST();

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="edit-title">Task Title</Label>
        <Input id="edit-title" {...register("title")} />
        {errors.title && <p className="text-sm text-red-500">{errors.title.message}</p>}
      </div>

      {(isManager || isAdmin) && (
        <div className="space-y-2">
          <Label>Assign To</Label>
          <Select
            value={task.assignedTo || user?.id}
            onValueChange={(v) => setValue("assignedTo", v)}
            disabled={loadingUsers}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select assignee" />
            </SelectTrigger>
            <SelectContent>
              {user && (
                <SelectItem key={user.id} value={user.id}>
                  {user.fullName} (Me)
                </SelectItem>
              )}
              {users
                ?.filter((u: { id: string }) => u.id !== user?.id)
                .map((u: { id: string; fullName: string }) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.fullName}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-2">
        <Label>Priority</Label>
        <Select
          defaultValue={task.priority}
          onValueChange={(v) => setValue("priority", v as TaskFormData["priority"])}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
        <Label className="flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          Due Date & Time
        </Label>
        <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} min={today} />
        <div className="flex items-center gap-2">
          <Select value={dueHour} onValueChange={setDueHour}>
            <SelectTrigger className="w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {HOURS.map((hour) => (
                <SelectItem key={hour} value={hour}>
                  {hour}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span>:</span>
          <Select value={dueMinute} onValueChange={setDueMinute}>
            <SelectTrigger className="w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MINUTES.map((min) => (
                <SelectItem key={min} value={min}>
                  {min}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex rounded-lg border overflow-hidden">
            {(["AM", "PM"] as const).map((period) => (
              <button
                key={period}
                type="button"
                onClick={() => setDuePeriod(period)}
                className={`px-3 py-1.5 text-sm ${
                  duePeriod === period ? "bg-primary text-primary-foreground" : "bg-background"
                }`}
              >
                {period}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Bell className="h-4 w-4" />
          Reminder
        </Label>
        <Select
          defaultValue={task.reminderBeforeMinutes?.toString() ?? "none"}
          onValueChange={(v) =>
            setValue("reminderBeforeMinutes", v === "none" ? null : parseInt(v))
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {REMINDER_OPTIONS.map((option) => (
              <SelectItem key={option.value ?? "none"} value={option.value?.toString() ?? "none"}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Description</Label>
        <Textarea {...register("description")} rows={4} />
      </div>

      <div className="flex justify-end gap-2 border-t pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Updating...
            </>
          ) : (
            "Update Task"
          )}
        </Button>
      </div>
    </form>
  );
}

function TaskDetailBody({
  taskId,
  editing,
  onEditChange,
  onUpdated,
}: {
  taskId: string;
  editing: boolean;
  onEditChange: (editing: boolean) => void;
  onUpdated?: () => void;
}) {
  const { user, can } = useAuth();
  const canEditTask = can("tasks:edit") || can("tasks:assign");
  const [commentText, setCommentText] = useState("");
  const [isPostingComment, setIsPostingComment] = useState(false);

  const { data: taskData, isLoading: loadingTask } = useSWR(
    `task-${taskId}`,
    () => tasksApi.get(taskId),
  );
  const { data: commentsData, isLoading: loadingComments } = useSWR(
    `task-comments-${taskId}`,
    () => tasksApi.getComments(taskId),
  );

  const task = taskData as Task | undefined;
  const comments = (commentsData || []) as TaskComment[];

  const handleStatusChange = async (newStatus: string) => {
    try {
      await tasksApi.update(taskId, { status: newStatus });
      toast.success("Task status updated");
      mutate(`task-${taskId}`);
      onUpdated?.();
    } catch {
      toast.error("Failed to update status");
    }
  };

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    setIsPostingComment(true);
    try {
      await tasksApi.addComment(taskId, commentText);
      setCommentText("");
      mutate(`task-comments-${taskId}`);
      toast.success("Comment posted");
    } catch {
      toast.error("Failed to post comment");
    } finally {
      setIsPostingComment(false);
    }
  };

  if (loadingTask) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-24" />
        <Skeleton className="h-40" />
      </div>
    );
  }

  if (!task) {
    return <p className="text-muted-foreground text-center py-8">Task not found</p>;
  }

  if (editing && canEditTask) {
    return (
      <TaskEditForm
        taskId={taskId}
        task={task}
        onSaved={() => {
          onEditChange(false);
          onUpdated?.();
        }}
        onCancel={() => onEditChange(false)}
      />
    );
  }

  const isOverdue = (dueDate: string | null) => {
    if (!dueDate) return false;
    return new Date(dueDate) < nowIST() && task.status !== "completed";
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <h2 className="text-lg font-semibold flex items-center gap-2 flex-wrap">
            {task.title}
            <Badge className={priorityColors[task.priority]} variant="secondary">
              {task.priority}
            </Badge>
          </h2>
          <div className="flex items-center gap-2 flex-wrap text-sm">
            <Badge className={statusColors[task.status]} variant="secondary">
              {task.status.replace("_", " ")}
            </Badge>
            {task.dueDate && (
              <span
                className={`flex items-center gap-1 ${
                  isOverdue(task.dueDate) ? "text-red-600 font-medium" : "text-muted-foreground"
                }`}
              >
                <Calendar className="w-4 h-4" />
                Due {toLocaleDateStringIST(task.dueDate)}
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {task.status !== "completed" && (
            <Button
              size="sm"
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={() => handleStatusChange("completed")}
            >
              <CheckCircle className="w-4 h-4 mr-1" />
              Complete
            </Button>
          )}
          {canEditTask && (
            <Button size="sm" variant="outline" onClick={() => onEditChange(true)}>
              <Pencil className="w-4 h-4 mr-1" />
              Edit
            </Button>
          )}
        </div>
      </div>

      <div>
        <p className="text-sm font-medium mb-1">Description</p>
        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
          {task.description || "No description provided."}
        </p>
      </div>

      <div className="rounded-lg border p-4 space-y-3 text-sm">
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">Assigned To</span>
          <div className="flex items-center gap-2">
            <Avatar className="h-7 w-7">
              <AvatarImage src={task.assignedUser?.avatarUrl || undefined} />
              <AvatarFallback className="text-xs">
                {task.assignedUser?.fullName?.[0] || "A"}
              </AvatarFallback>
            </Avatar>
            <span>{task.assignedUser?.fullName || "Unknown"}</span>
          </div>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Created By</span>
          <span>{task.createdByUser?.fullName || "Unknown"}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Created On</span>
          <span>{toLocaleDateStringIST(task.createdAt)}</span>
        </div>
      </div>

      <div className="space-y-4">
        <p className="text-sm font-medium">Comments</p>
        {loadingComments ? (
          <Skeleton className="h-16" />
        ) : comments.length === 0 ? (
          <p className="text-muted-foreground text-sm">No comments yet</p>
        ) : (
          comments.map((comment: TaskComment & { users?: { avatar_url?: string; full_name?: string }; created_at?: string; content?: string }) => (
            <div key={comment.id} className="flex gap-3">
              <Avatar className="h-8 w-8">
                <AvatarImage src={comment.users?.avatar_url} />
                <AvatarFallback>{comment.users?.full_name?.[0] || "U"}</AvatarFallback>
              </Avatar>
              <div className="bg-muted/50 p-3 rounded-lg flex-1">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-semibold text-sm">
                    {comment.users?.full_name || "Unknown User"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {comment.created_at ? toLocaleStringIST(comment.created_at) : ""}
                  </span>
                </div>
                <p className="text-sm">{comment.content}</p>
              </div>
            </div>
          ))
        )}
        <form onSubmit={handlePostComment} className="flex gap-3 items-start">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user?.avatarUrl || undefined} />
            <AvatarFallback>{user?.fullName?.[0]}</AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-2">
            <Textarea
              placeholder="Add a comment..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              rows={2}
              className="resize-none"
            />
            <Button type="submit" size="sm" disabled={!commentText.trim() || isPostingComment}>
              <Send className="w-3 h-3 mr-2" />
              Post
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function TaskDetailSheet({
  taskId,
  open,
  onOpenChange,
  onUpdated,
}: {
  taskId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated?: () => void;
}) {
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (!open) setEditing(false);
  }, [open, taskId]);

  return (
    <FormSideSheet
      open={open}
      onOpenChange={onOpenChange}
      title={editing ? "Edit Task" : "Task Details"}
      description={editing ? "Update task information" : "View and manage this task"}
      size="xl"
    >
      {taskId && open ? (
        <TaskDetailBody
          taskId={taskId}
          editing={editing}
          onEditChange={setEditing}
          onUpdated={onUpdated}
        />
      ) : null}
    </FormSideSheet>
  );
}
