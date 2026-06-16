"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { tasksApi, usersApi, leadsApi } from "@/lib/api";
import { projectsApi } from "@/lib/projects-api";
import useSWR from "swr";
import { getTodayIST } from "@/lib/date-utils";
import { useAuth, useIsManager, useIsAdmin } from "@/providers/auth-provider";
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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Loader2, Bell, Calendar, Clock, Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { FormSideSheet } from "@/components/ui/form-side-sheet";

const taskSchema = z.object({
  title: z.string().min(3, "Title is required"),
  description: z.string().optional(),
  assignedTo: z.string().optional(),
  priority: z.enum(["low", "medium", "high"]),
  dueDate: z.string().optional(),
  taskType: z.string().optional(),
  reminderBeforeMinutes: z.number().optional().nullable(),
  relatedLeadId: z.string().optional().nullable(),
  projectId: z.string().optional().nullable(),
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

function CreateTaskFormBody({ onSuccess }: { onSuccess?: () => void }) {
  const { user } = useAuth();
  const isManager = useIsManager();
  const isAdmin = useIsAdmin();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [openLeadCombo, setOpenLeadCombo] = useState(false);
  const [dueDate, setDueDate] = useState("");
  const [dueHour, setDueHour] = useState("09");
  const [dueMinute, setDueMinute] = useState("00");
  const [duePeriod, setDuePeriod] = useState<"AM" | "PM">("AM");

  const { data: usersData, isLoading: loadingUsers } = useSWR(
    isManager || isAdmin ? "users-list" : null,
    () => usersApi.list(),
  );
  const { data: leadsData } = useSWR("leads-list", () =>
    leadsApi.list({ limit: 100 }),
  );
  const { data: projectsData } = useSWR(
    isAdmin ? "projects-list" : null,
    () => projectsApi.list(),
  );

  const users = usersData?.data || [];
  const leads = leadsData?.data || [];
  const projects = Array.isArray(projectsData) ? projectsData : [];

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
      taskType: "general",
      assignedTo: user?.id,
      reminderBeforeMinutes: null,
    },
  });

  const selectedLeadId = watch("relatedLeadId");

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
        assignedTo: isManager || isAdmin ? data.assignedTo : user?.id,
        relatedLeadId: data.relatedLeadId || undefined,
        projectId: data.projectId || undefined,
      });
      toast.success("Task created successfully");
      onSuccess?.();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: { message?: string } } } };
      toast.error(err.response?.data?.error?.message || "Failed to create task");
    } finally {
      setIsSubmitting(false);
    }
  };

  const today = getTodayIST();

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="title">Task Title</Label>
        <Input id="title" {...register("title")} placeholder="e.g. Follow up with client" />
        {errors.title && <p className="text-sm text-red-500">{errors.title.message}</p>}
      </div>

      <div className="space-y-2 flex flex-col">
        <Label className="mb-2">Related Lead (Optional)</Label>
        <Popover open={openLeadCombo} onOpenChange={setOpenLeadCombo}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={openLeadCombo}
              className="w-full justify-between font-normal"
            >
              {selectedLeadId
                ? leads.find((lead: { id: string; leadName?: string }) => lead.id === selectedLeadId)
                    ?.leadName
                : "Select a lead..."}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[400px] p-0" align="start">
            <Command>
              <CommandInput placeholder="Search lead..." />
              <CommandList>
                <CommandEmpty>No lead found.</CommandEmpty>
                <CommandGroup>
                  <CommandItem
                    value="none"
                    onSelect={() => {
                      setValue("relatedLeadId", null);
                      setOpenLeadCombo(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        !selectedLeadId ? "opacity-100" : "opacity-0",
                      )}
                    />
                    None
                  </CommandItem>
                  {leads.map((lead: { id: string; leadName?: string; businessName?: string }) => (
                    <CommandItem
                      key={lead.id}
                      value={lead.leadName}
                      onSelect={() => {
                        setValue("relatedLeadId", lead.id);
                        setOpenLeadCombo(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          selectedLeadId === lead.id ? "opacity-100" : "opacity-0",
                        )}
                      />
                      {lead.leadName}
                      {lead.businessName && (
                        <span className="ml-2 text-muted-foreground text-xs">
                          ({lead.businessName})
                        </span>
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {isAdmin && (
        <div className="space-y-2">
          <Label htmlFor="projectId">Related Project (Optional)</Label>
          <Select onValueChange={(v) => setValue("projectId", v === "none" ? null : v)}>
            <SelectTrigger>
              <SelectValue placeholder="Select a project" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              {projects.map((proj: { id: string; name: string }) => (
                <SelectItem key={proj.id} value={proj.id}>
                  {proj.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {(isManager || isAdmin) && (
        <div className="space-y-2">
          <Label htmlFor="assignedTo">Assign To</Label>
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
        <Label htmlFor="priority">Priority</Label>
        <Select defaultValue="medium" onValueChange={(v) => setValue("priority", v as TaskFormData["priority"])}>
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

      <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
        <Label className="flex items-center gap-2 text-base font-medium">
          <Calendar className="h-4 w-4 text-primary" />
          Due Date & Time
        </Label>
        <div className="space-y-2">
          <Label htmlFor="due-date" className="text-sm text-muted-foreground">
            Date
          </Label>
          <Input
            id="due-date"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            min={today}
          />
        </div>
        <div className="space-y-2">
          <Label className="text-sm text-muted-foreground flex items-center gap-2">
            <Clock className="h-3 w-3" />
            Time
          </Label>
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
            <span className="text-xl font-semibold text-muted-foreground">:</span>
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
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    duePeriod === period
                      ? "bg-primary text-primary-foreground"
                      : "bg-background hover:bg-muted"
                  }`}
                >
                  {period}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Bell className="h-4 w-4" />
          Reminder
        </Label>
        <Select
          defaultValue="none"
          onValueChange={(v) =>
            setValue("reminderBeforeMinutes", v === "none" ? null : parseInt(v))
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
        <Textarea id="description" {...register("description")} placeholder="Describe the task..." rows={4} />
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

export function CreateTaskSheet({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
}) {
  return (
    <FormSideSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Create New Task"
      description="Assign a task to yourself or a team member."
      size="xl"
    >
      <CreateTaskFormBody
        onSuccess={() => {
          onOpenChange(false);
          onCreated?.();
        }}
      />
    </FormSideSheet>
  );
}
