"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { tasksApi, usersApi, projectsApi } from "@/lib/api";
import useSWR from "swr";
import { getTodayIST } from "@/lib/date-utils";
import { useAuth, useIsManager, useIsAdmin } from "@/providers/auth-provider";
import { getProjectMemberAssignees } from "@/lib/projects-scope";
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
import { FormSideSheet } from "@/components/ui/form-side-sheet";

const taskSchema = z.object({
  title: z.string().min(3, "Title is required"),
  description: z.string().optional(),
  assignedTo: z.string().optional(),
  priority: z.enum(["low", "medium", "high"]),
  dueDate: z.string().optional(),
  taskType: z.string().optional(),
  reminderBeforeMinutes: z.number().optional().nullable(),
  projectId: z.string().optional().nullable(),
  sprintId: z.string().optional().nullable(),
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

function CreateProjectTaskFormBody({
  defaultProjectId,
  onSuccess,
}: {
  defaultProjectId?: string | null;
  onSuccess?: () => void;
}) {
  const { user } = useAuth();
  const isManager = useIsManager();
  const isAdmin = useIsAdmin();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Due date/time state
  const [dueDate, setDueDate] = useState("");
  const [dueHour, setDueHour] = useState("09");
  const [dueMinute, setDueMinute] = useState("00");
  const [duePeriod, setDuePeriod] = useState<"AM" | "PM">("AM");

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      priority: "medium",
      taskType: "project_related",
      assignedTo: user?.id,
      reminderBeforeMinutes: null,
      projectId: defaultProjectId,
    },
  });

  // Data Fetching
  const { data: usersData, isLoading: loadingUsers } = useSWR(
    isManager || isAdmin ? "users-list" : null,
    () => usersApi.list(),
  );

  const { data: projectsData } = useSWR("projects-list", () =>
    projectsApi.list(),
  );

  const selectedProjectId = watch("projectId") || defaultProjectId;

  const { data: projectData, isLoading: loadingProject } = useSWR(
    selectedProjectId ? ["project", selectedProjectId, "assignees"] : null,
    () => projectsApi.get(selectedProjectId as string),
  );

  const { data: sprintsData } = useSWR(
    selectedProjectId ? ["sprints", selectedProjectId] : null,
    () => projectsApi.listSprints(selectedProjectId as string),
  );

  const users = usersData?.data || [];
  const projects = Array.isArray(projectsData) ? projectsData : [];
  const sprints = Array.isArray(sprintsData)
    ? sprintsData
    : (sprintsData as any)?.data ?? [];

  const assignableUsers = useMemo(() => {
    if (selectedProjectId && projectData) {
      return getProjectMemberAssignees(projectData);
    }
    if (isManager || isAdmin) {
      return (users as { id: string; fullName: string }[]).map((u) => ({
        id: u.id,
        fullName: u.fullName,
      }));
    }
    return [];
  }, [selectedProjectId, projectData, users, isManager, isAdmin]);

  const loadingAssignees = selectedProjectId ? loadingProject : loadingUsers;
  const canPickAssignee =
    isAdmin || isManager || Boolean(selectedProjectId || defaultProjectId);

  // Build due date ISO string
  const buildDueDateISO = (): string | undefined => {
    if (!dueDate) return undefined;
    let hour24 = parseInt(dueHour);
    if (duePeriod === "PM" && hour24 !== 12) hour24 += 12;
    else if (duePeriod === "AM" && hour24 === 12) hour24 = 0;
    const hourStr = hour24.toString().padStart(2, "0");
    const minuteStr = dueMinute.padStart(2, "0");
    return `${dueDate}T${hourStr}:${minuteStr}:00.000Z`;
  };

  const onSubmit = async (data: TaskFormData) => {
    setIsSubmitting(true);
    try {
      await tasksApi.create({
        ...data,
        dueDate: buildDueDateISO(),
        assignedTo: canPickAssignee ? data.assignedTo : user?.id,
        projectId: data.projectId || defaultProjectId || undefined,
        sprintId: data.sprintId && data.sprintId !== "none" ? data.sprintId : undefined,
        taskType: "project_related",
      });
      toast.success("Task created successfully");
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
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Task Title</Label>
              <Input
                id="title"
                {...register("title")}
                placeholder="e.g. Implement feature X"
              />
              {errors.title && (
                <p className="text-sm text-red-500">{errors.title.message}</p>
              )}
            </div>

            {/* Assign To */}
            {canPickAssignee && (
            <div className="space-y-2">
              <Label htmlFor="assignedTo">Assign To</Label>
              <Select
                defaultValue={user?.id}
                onValueChange={(v) => setValue("assignedTo", v)}
                disabled={loadingAssignees}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      loadingAssignees ? "Loading..." : "Select assignee"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {assignableUsers.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.fullName}
                      {u.id === user?.id ? " (Me)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="projectId">Related Project</Label>
              <Select
                onValueChange={(v) =>
                  setValue("projectId", v === "none" ? null : v)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {projects.map((proj: any) => (
                    <SelectItem key={proj.id} value={proj.id}>
                      {proj.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {(selectedProjectId || defaultProjectId) && sprints.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="sprintId">Sprint (optional)</Label>
                <Select
                  onValueChange={(v) =>
                    setValue("sprintId", v === "none" ? null : v)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="No sprint" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No sprint</SelectItem>
                    {sprints.map((sprint: any) => (
                      <SelectItem key={sprint.id} value={sprint.id}>
                        {sprint.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Priority */}
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select
                defaultValue="medium"
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
                defaultValue="none"
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

            <div className="flex justify-end gap-2 border-t pt-4">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Task"
                )}
              </Button>
            </div>
          </form>
  );
}

export function CreateProjectTaskSheet({
  open,
  onOpenChange,
  onCreated,
  defaultProjectId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
  defaultProjectId?: string | null;
}) {
  return (
    <FormSideSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Create Project Task"
      description="Add a new task to a project"
      size="xl"
    >
      <CreateProjectTaskFormBody
        defaultProjectId={defaultProjectId}
        onSuccess={() => {
          onOpenChange(false);
          onCreated?.();
        }}
      />
    </FormSideSheet>
  );
}
