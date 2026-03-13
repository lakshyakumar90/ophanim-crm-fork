"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { tasksApi, usersApi } from "@/lib/api";
import useSWR from "swr";
import { getTodayIST } from "@/lib/date-utils";
import { useAuth, useIsManager } from "@/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Loader2, Bell, Calendar, Clock } from "lucide-react";
import { Task } from "@/types";

const taskSchema = z.object({
  title: z.string().min(3, "Title is required"),
  description: z.string().optional(),
  assignedTo: z.string().optional(),
  priority: z.enum(["low", "medium", "high"]),
  dueDate: z.string().optional(),
  taskType: z.string().optional(),
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

export default function EditTaskPage() {
  const router = useRouter();
  const { id } = useParams();
  const { user } = useAuth();
  const isManager = useIsManager();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Due date/time state
  const [dueDate, setDueDate] = useState("");
  const [dueHour, setDueHour] = useState("09");
  const [dueMinute, setDueMinute] = useState("00");
  const [duePeriod, setDuePeriod] = useState<"AM" | "PM">("AM");

  // Fetch task details
  const { data: taskData, isLoading: loadingTask } = useSWR(
    id ? `task-${id}` : null,
    () => tasksApi.get(id as string),
  );

  const task = taskData as Task;

  // Only fetch users list for managers/admins
  const { data: usersData, isLoading: loadingUsers } = useSWR(
    isManager ? "users-list" : null,
    () => usersApi.list(),
  );

  // Handle nested data structure
  const users = usersData?.data || [];

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      priority: "medium",
      taskType: "general",
      assignedTo: user?.id,
      reminderBeforeMinutes: null,
    },
  });

  // Populate form when task data loads
  useEffect(() => {
    if (task) {
      reset({
        title: task.title,
        description: task.description || "",
        assignedTo: task.assignedTo,
        priority: task.priority as "low" | "medium" | "high",
        taskType: task.taskType || "general",
        reminderBeforeMinutes: task.reminderBeforeMinutes,
      });

      if (task.dueDate) {
        // Parse ISO string (e.g. 2023-10-27T09:00:00.000Z)
        // Taking the parts directly as it was constructed
        const [datePart, timePart] = task.dueDate.split("T");
        setDueDate(datePart);

        if (timePart) {
          const time = timePart.substring(0, 5); // HH:mm
          const [hStr, mStr] = time.split(":");
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
    }
  }, [task, reset]);

  // Build due date ISO string from separate fields
  const buildDueDateISO = (): string | undefined => {
    if (!dueDate) return undefined;

    let hour24 = parseInt(dueHour);
    if (duePeriod === "PM" && hour24 !== 12) {
      hour24 += 12;
    } else if (duePeriod === "AM" && hour24 === 12) {
      hour24 = 0;
    }

    // Construct ISO string directly to avoid timezone issues
    // We treat this as "IST time" but stored as ISO string with Z
    const hourStr = hour24.toString().padStart(2, "0");
    const minuteStr = dueMinute.padStart(2, "0");

    return `${dueDate}T${hourStr}:${minuteStr}:00.000Z`;
  };

  const onSubmit = async (data: TaskFormData) => {
    setIsSubmitting(true);
    try {
      await tasksApi.update(id as string, {
        ...data,
        dueDate: buildDueDateISO(),
        assignedTo: isManager ? data.assignedTo : undefined, // Only update assignee if manager
      });
      toast.success("Task updated successfully");
      router.push(`/sales/tasks/${id}`);
    } catch (error: any) {
      toast.error(
        error.response?.data?.error?.message || "Failed to update task",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const today = getTodayIST();

  if (loadingTask) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!task) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-600">Task not found</p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => router.push(`/sales/tasks`)}
        >
          Back to Tasks
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push(`/sales/tasks/${id}`)}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Edit Task</h1>
          <p className="text-muted-foreground">Update task details</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Task Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Task Title</Label>
              <Input
                id="title"
                {...register("title")}
                placeholder="e.g. Follow up with client"
              />
              {errors.title && (
                <p className="text-sm text-red-500">{errors.title.message}</p>
              )}
            </div>

            {/* Only show assignee selector for managers */}
            {isManager && (
              <div className="space-y-2">
                <Label htmlFor="assignedTo">Assign To</Label>
                <Select
                  value={task.assignedTo || user?.id} // Use controlled value from form or task
                  onValueChange={(v) => setValue("assignedTo", v)}
                  defaultValue={task.assignedTo}
                  disabled={loadingUsers}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        loadingUsers ? "Loading..." : "Select assignee"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {user && (
                      <SelectItem key={user.id} value={user.id}>
                        {user.fullName} (Me)
                      </SelectItem>
                    )}
                    {users
                      ?.filter((u: any) => u.id !== user?.id)
                      .map((u: any) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.fullName}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                {errors.assignedTo && (
                  <p className="text-sm text-red-500">
                    {errors.assignedTo.message}
                  </p>
                )}
              </div>
            )}

            {/* Priority */}
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select
                defaultValue={task.priority}
                onValueChange={(v) => setValue("priority", v as any)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Due Date & Time - 12 Hour Format */}
            <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
              <Label className="flex items-center gap-2 text-base font-medium">
                <Calendar className="h-4 w-4 text-primary" />
                Due Date & Time
              </Label>

              {/* Date */}
              <div className="space-y-2">
                <Label
                  htmlFor="due-date"
                  className="text-sm text-muted-foreground"
                >
                  Date
                </Label>
                <Input
                  id="due-date"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  min={today}
                  className="w-full"
                />
              </div>

              {/* Time */}
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground flex items-center gap-2">
                  <Clock className="h-3 w-3" />
                  Time
                </Label>
                <div className="flex items-center gap-2">
                  {/* Hour */}
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

                  <span className="text-xl font-semibold text-muted-foreground">
                    :
                  </span>

                  {/* Minute */}
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

                  {/* AM/PM Toggle */}
                  <div className="flex rounded-lg border overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setDuePeriod("AM")}
                      className={`px-4 py-2 text-sm font-medium transition-colors ${
                        duePeriod === "AM"
                          ? "bg-primary text-primary-foreground"
                          : "bg-background hover:bg-muted"
                      }`}
                    >
                      AM
                    </button>
                    <button
                      type="button"
                      onClick={() => setDuePeriod("PM")}
                      className={`px-4 py-2 text-sm font-medium transition-colors ${
                        duePeriod === "PM"
                          ? "bg-primary text-primary-foreground"
                          : "bg-background hover:bg-muted"
                      }`}
                    >
                      PM
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Reminder Section */}
            <div className="space-y-2">
              <Label htmlFor="reminder" className="flex items-center gap-2">
                <Bell className="h-4 w-4" />
                Reminder
              </Label>
              <Select
                defaultValue={task.reminderBeforeMinutes?.toString() ?? "none"}
                onValueChange={(v) =>
                  setValue(
                    "reminderBeforeMinutes",
                    v === "none" ? null : parseInt(v),
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="No reminder" />
                </SelectTrigger>
                <SelectContent>
                  {REMINDER_OPTIONS.map((option) => (
                    <SelectItem
                      key={option.value ?? "none"}
                      value={option.value?.toString() ?? "none"}
                    >
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                You'll receive a notification before the due date
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                {...register("description")}
                placeholder="Describe the task..."
                rows={4}
              />
            </div>

            <div className="flex justify-end gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push(`/sales/tasks/${id}`)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
              >
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
        </CardContent>
      </Card>
    </div>
  );
}
