"use client";

import { useCallback, useState } from "react";
import { useParams } from "next/navigation";
import useSWR from "swr";
import { format } from "date-fns";
import {
  Activity,
  CheckSquare,
  Clock,
  Flag,
  Kanban,
  Loader2,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { milestonesApi, projectsApi } from "@/lib/api";
import { useAuth } from "@/providers/auth-provider";
import { canManageProject } from "@/lib/projects-scope";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormSideSheet } from "@/components/ui/form-side-sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useHeaderRefresh } from "@/hooks/layout/useHeaderRefresh";
import { toast } from "sonner";

const MILESTONE_STATUSES = ["pending", "in_progress", "completed", "cancelled"] as const;

interface TimelineEvent {
  id: string;
  type: "milestone" | "sprint" | "task" | "time_entry" | "activity";
  title: string;
  description?: string | null;
  status?: string | null;
  date: string;
}

interface TimelineSummary {
  milestonesTotal: number;
  milestonesCompleted: number;
  sprintsTotal: number;
  sprintsActive: number;
  tasksTotal: number;
  tasksCompleted: number;
  hoursLogged: number;
}

interface MilestoneRecord {
  id: string;
  name: string;
  description?: string | null;
  dueDate?: string | null;
  status: string;
}

type MilestoneForm = {
  name: string;
  description: string;
  dueDate: string;
  status: string;
};

const emptyForm = (): MilestoneForm => ({
  name: "",
  description: "",
  dueDate: "",
  status: "pending",
});

const EVENT_ICONS: Record<string, React.ElementType> = {
  milestone: Flag,
  sprint: Kanban,
  task: CheckSquare,
  time_entry: Clock,
  activity: Activity,
};

function toDateInputValue(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

export default function ProjectTimelinePage() {
  const params = useParams();
  const projectId = params.id as string;
  const { user, can } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showSheet, setShowSheet] = useState(false);
  const [editingMilestoneId, setEditingMilestoneId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<MilestoneForm>(emptyForm());

  const { data: project } = useSWR(
    user && projectId ? ["project", projectId] : null,
    () => projectsApi.get(projectId),
  );

  const canManageMilestones = canManageProject(project, user, can);

  const { data, isLoading, mutate } = useSWR(
    user && projectId ? ["timeline", projectId] : null,
    () => projectsApi.getTimeline(projectId),
  );

  const { data: milestonesData, mutate: mutateMilestones } = useSWR(
    user && projectId ? ["milestones", projectId] : null,
    () => milestonesApi.list(projectId),
  );

  const milestonesList: MilestoneRecord[] = Array.isArray(milestonesData)
    ? milestonesData
    : (milestonesData as { data?: MilestoneRecord[] })?.data ?? [];

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await Promise.all([mutate(), mutateMilestones()]);
    setTimeout(() => setIsRefreshing(false), 500);
  }, [mutate, mutateMilestones]);

  useHeaderRefresh({ onRefresh: handleRefresh, isRefreshing, enabled: Boolean(user) });

  const timeline = data as {
    events?: TimelineEvent[];
    summary?: TimelineSummary;
  } | null;

  const events = [...(timeline?.events ?? [])].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
  const summary = timeline?.summary;
  const tasks = events.filter((e) => e.type === "task");

  const resetForm = () => {
    setForm(emptyForm());
    setEditingMilestoneId(null);
  };

  const openCreate = () => {
    resetForm();
    setShowSheet(true);
  };

  const openEdit = (milestone: MilestoneRecord) => {
    setEditingMilestoneId(milestone.id);
    setForm({
      name: milestone.name,
      description: milestone.description || "",
      dueDate: toDateInputValue(milestone.dueDate),
      status: milestone.status || "pending",
    });
    setShowSheet(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        dueDate: form.dueDate
          ? new Date(`${form.dueDate}T12:00:00`).toISOString()
          : null,
        status: form.status,
      };

      if (editingMilestoneId) {
        await milestonesApi.update(projectId, editingMilestoneId, payload);
        toast.success("Milestone updated");
      } else {
        await milestonesApi.create(projectId, payload);
        toast.success("Milestone created");
      }

      setShowSheet(false);
      resetForm();
      await Promise.all([mutate(), mutateMilestones()]);
    } catch {
      toast.error(
        editingMilestoneId ? "Failed to update milestone" : "Failed to create milestone",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!pendingDeleteId) return;
    setSaving(true);
    try {
      await milestonesApi.delete(projectId, pendingDeleteId);
      toast.success("Milestone deleted");
      setPendingDeleteId(null);
      await Promise.all([mutate(), mutateMilestones()]);
    } catch {
      toast.error("Failed to delete milestone");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold">
            <Flag className="h-5 w-5 text-primary" />
            Project Timeline
          </h1>
          <p className="text-sm text-muted-foreground">
            Milestones, sprints, tasks, and activity
          </p>
        </div>
        {canManageMilestones && (
          <Button size="sm" className="gap-1.5" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Add Milestone
          </Button>
        )}
      </div>

      {isLoading ? (
        <Skeleton className="h-48 w-full" />
      ) : (
        <div className="space-y-4">
          {summary && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardContent className="pt-4 text-sm">
                  <p className="text-muted-foreground">Milestones</p>
                  <p className="text-lg font-semibold">
                    {summary.milestonesCompleted}/{summary.milestonesTotal}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 text-sm">
                  <p className="text-muted-foreground">Sprints</p>
                  <p className="text-lg font-semibold">
                    {summary.sprintsActive} active / {summary.sprintsTotal}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 text-sm">
                  <p className="text-muted-foreground">Tasks</p>
                  <p className="text-lg font-semibold">
                    {summary.tasksCompleted}/{summary.tasksTotal}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 text-sm">
                  <p className="text-muted-foreground">Hours logged</p>
                  <p className="text-lg font-semibold">{summary.hoursLogged}</p>
                </CardContent>
              </Card>
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Timeline</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {events.length === 0 ? (
                <p className="text-sm text-muted-foreground">No timeline events yet</p>
              ) : (
                events.map((event) => {
                  const Icon = EVENT_ICONS[event.type] || Activity;
                  const milestoneRecord =
                    event.type === "milestone"
                      ? milestonesList.find((m) => m.id === event.id)
                      : null;

                  return (
                    <div
                      key={`${event.type}-${event.id}`}
                      className="flex items-start justify-between gap-3 rounded border px-3 py-2 text-sm"
                    >
                      <div className="flex gap-3 min-w-0">
                        <div className="mt-0.5 text-muted-foreground shrink-0">
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium truncate">{event.title}</p>
                          {event.description && (
                            <p className="text-muted-foreground text-xs mt-0.5 line-clamp-2">
                              {event.description}
                            </p>
                          )}
                          <p className="text-muted-foreground text-xs mt-1">
                            {format(new Date(event.date), "MMM d, yyyy")}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <div className="flex items-center gap-1">
                          {canManageMilestones && milestoneRecord && (
                            <>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => openEdit(milestoneRecord)}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive hover:text-destructive"
                                onClick={() => setPendingDeleteId(milestoneRecord.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          )}
                        </div>
                        <Badge variant="secondary" className="capitalize text-[10px]">
                          {event.type.replace(/_/g, " ")}
                        </Badge>
                        {event.status && (
                          <Badge variant="outline" className="capitalize text-[10px]">
                            {event.status.replace(/_/g, " ")}
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Milestones</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {milestonesList.length === 0 ? (
                <p className="text-sm text-muted-foreground">No milestones yet</p>
              ) : (
                milestonesList.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between gap-3 rounded border px-3 py-2 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="font-medium">{m.name}</p>
                      {m.description && (
                        <p className="text-muted-foreground text-xs line-clamp-1">
                          {m.description}
                        </p>
                      )}
                      <p className="text-muted-foreground text-xs">
                        {m.dueDate
                          ? format(new Date(m.dueDate), "MMM d, yyyy")
                          : "No due date"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="outline" className="capitalize">
                        {String(m.status ?? "pending").replace(/_/g, " ")}
                      </Badge>
                      {canManageMilestones && (
                        <>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => openEdit(m)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => setPendingDeleteId(m.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {tasks.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Tasks</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {tasks.slice(0, 10).map((t) => (
                  <div key={t.id} className="flex justify-between text-sm">
                    <span>{t.title}</span>
                    <Badge variant="outline" className="capitalize">
                      {String(t.status ?? "todo").replace(/_/g, " ")}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <FormSideSheet
        open={showSheet}
        onOpenChange={(open) => {
          setShowSheet(open);
          if (!open) resetForm();
        }}
        title={editingMilestoneId ? "Edit milestone" : "Add milestone"}
        description={
          editingMilestoneId
            ? "Update milestone details."
            : "Add a milestone to the project timeline."
        }
        size="md"
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowSheet(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="milestone-form"
              disabled={saving || !form.name.trim()}
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : editingMilestoneId ? (
                "Save changes"
              ) : (
                "Create milestone"
              )}
            </Button>
          </>
        }
      >
        <form id="milestone-form" onSubmit={handleSave} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="milestone-name">Name</Label>
            <Input
              id="milestone-name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Phase 1 delivery"
              required
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="milestone-description">Description</Label>
            <Textarea
              id="milestone-description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Optional details"
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="milestone-due">Due date</Label>
            <Input
              id="milestone-due"
              type="date"
              value={form.dueDate}
              onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select
              value={form.status}
              onValueChange={(status) => setForm({ ...form, status })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MILESTONE_STATUSES.map((status) => (
                  <SelectItem key={status} value={status} className="capitalize">
                    {status.replace(/_/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </form>
      </FormSideSheet>

      <AlertDialog
        open={Boolean(pendingDeleteId)}
        onOpenChange={(open) => !open && setPendingDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete milestone?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The milestone will be removed from the
              project timeline.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={saving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
