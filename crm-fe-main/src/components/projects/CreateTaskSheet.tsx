"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { tasksApi, usersApi } from "@/lib/api";
import { projectsApi } from "@/lib/projects-api";
import useSWR from "swr";
import { getTodayIST } from "@/lib/date-utils";
import { useAuth, useIsManager, useIsAdmin } from "@/providers/auth-provider";
import type { Project } from "@/types";
import { FormSideSheet } from "@/components/ui/form-side-sheet";
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
import { Loader2, Bell, Calendar, Clock } from "lucide-react";

const taskSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().optional(),
  assignedTo: z.string().optional(),
  priority: z.enum(["low", "medium", "high"]),
  reminderBeforeMinutes: z.number({ error: "Reminder is required" }).min(1, "Reminder must be at least 1 minute"),
});

type TaskFormData = z.infer<typeof taskSchema>;

const REMINDER_OPTIONS = [
  { value: "15", label: "15 minutes before" },
  { value: "30", label: "30 minutes before (default)" },
  { value: "60", label: "1 hour before" },
  { value: "1440", label: "1 day before" },
];

const HOURS = Array.from({ length: 12 }, (_, i) =>
  (i + 1).toString().padStart(2, "0"),
);
const MINUTES = ["00", "15", "30", "45"];

function CreateTaskFormBody({
  fixedProjectId,
  onSuccess,
}: {
  fixedProjectId?: string;
  onSuccess?: () => void;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dueDate, setDueDate] = useState("");
  const [dueHour, setDueHour] = useState("09");
  const [dueMinute, setDueMinute] = useState("00");
  const [duePeriod, setDuePeriod] = useState<"AM" | "PM">("AM");
  const [selectedProjectId, setSelectedProjectId] = useState("");

  const { user } = useAuth();
  const isManager = useIsManager();
  const isAdmin = useIsAdmin();

  const { data: usersData, isLoading: loadingUsers } = useSWR("users-list", () =>
    usersApi.list(),
  );
  const users = usersData?.data || [];

  const { data: projectsData, isLoading: loadingProjects } = useSWR(
    !fixedProjectId ? "projects-list-for-task" : null,
    () => projectsApi.list(),
  );
  const projects: Project[] = Array.isArray(projectsData) ? projectsData : [];

  const projectId = fixedProjectId || selectedProjectId;

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
      assignedTo: user?.id,
      reminderBeforeMinutes: 30,
    },
  });

  const buildDueDateISO = (): string | undefined => {
    if (!dueDate) return undefined;
    let hour24 = parseInt(dueHour);
    if (duePeriod === "PM" && hour24 !== 12) hour24 += 12;
    else if (duePeriod === "AM" && hour24 === 12) hour24 = 0;
    return `${dueDate}T${hour24.toString().padStart(2, "0")}:${dueMinute}:00.000Z`;
  };

  const onSubmit = async (data: TaskFormData) => {
    setIsSubmitting(true);
    try {
      await tasksApi.create({
        ...data,
        dueDate: buildDueDateISO(),
        assignedTo: isManager || isAdmin ? data.assignedTo : user?.id,
        ...(projectId ? { projectId, taskType: "project_related" } : {}),
      });
      toast.success("Task created successfully");
      reset();
      setDueDate("");
      setSelectedProjectId("");
      onSuccess?.();
    } catch (error: any) {
      toast.error(
        error.response?.data?.error?.message || "Failed to create task",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const today = getTodayIST();

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">
          Task Title <span className="text-red-500">*</span>
        </Label>
        <Input id="title" {...register("title")} placeholder="e.g. Implement feature X" />
        {errors.title && (
          <p className="text-sm text-red-500">{errors.title.message}</p>
        )}
      </div>

      {!fixedProjectId && (
        <div className="space-y-2">
          <Label>
            Link to Project{" "}
            <span className="text-muted-foreground text-xs">(optional)</span>
          </Label>
          <Select
            value={selectedProjectId || "none"}
            onValueChange={(v) => setSelectedProjectId(v === "none" ? "" : v)}
            disabled={loadingProjects}
          >
            <SelectTrigger>
              <SelectValue
                placeholder={loadingProjects ? "Loading projects..." : "Select a project"}
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No project</SelectItem>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {(isAdmin || isManager) && (
        <div className="space-y-2">
          <Label>Assign To</Label>
          <Select
            defaultValue={user?.id}
            onValueChange={(v) => setValue("assignedTo", v)}
            disabled={loadingUsers}
          >
            <SelectTrigger>
              <SelectValue placeholder={loadingUsers ? "Loading..." : "Select assignee"} />
            </SelectTrigger>
            <SelectContent>
              {user && (
                <SelectItem value={user.id}>{user.fullName} (Me)</SelectItem>
              )}
              {users
                .filter((u: any) => u.id !== user?.id)
                .map((u: any) => (
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
        <Select defaultValue="medium" onValueChange={(v) => setValue("priority", v as any)}>
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

      <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
        <Label className="flex items-center gap-2 font-medium">
          <Calendar className="h-4 w-4 text-primary" />
          Due Date & Time
        </Label>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Date</Label>
          <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} min={today} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Clock className="h-3 w-3" /> Time
          </Label>
          <div className="flex items-center gap-2">
            <Select value={dueHour} onValueChange={setDueHour}>
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {HOURS.map((h) => (
                  <SelectItem key={h} value={h}>{h}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-lg font-semibold text-muted-foreground">:</span>
            <Select value={dueMinute} onValueChange={setDueMinute}>
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MINUTES.map((m) => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex rounded-lg border overflow-hidden">
              {(["AM", "PM"] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setDuePeriod(p)}
                  className={`px-3 py-2 text-sm font-medium transition-colors ${
                    duePeriod === p
                      ? "bg-primary text-primary-foreground"
                      : "bg-background hover:bg-muted"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Bell className="h-4 w-4" />
          Reminder <span className="text-destructive">*</span>
        </Label>
        <Select
          defaultValue="30"
          onValueChange={(v) => setValue("reminderBeforeMinutes", parseInt(v))}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select reminder" />
          </SelectTrigger>
          <SelectContent>
            {REMINDER_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.reminderBeforeMinutes && (
          <p className="text-xs text-destructive">{errors.reminderBeforeMinutes.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label>Description</Label>
        <Textarea {...register("description")} placeholder="Describe the task..." rows={3} />
      </div>

      <div className="flex justify-end gap-2 border-t pt-4">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Create Task
        </Button>
      </div>
    </form>
  );
}

export function CreateTaskSheet({
  open,
  onOpenChange,
  onCreated,
  projectId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
  projectId?: string;
}) {
  return (
    <FormSideSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Create Task"
      description="Add a new task and optionally link it to a project."
      size="xl"
    >
      <CreateTaskFormBody
        fixedProjectId={projectId}
        onSuccess={() => {
          onOpenChange(false);
          onCreated?.();
        }}
      />
    </FormSideSheet>
  );
}
