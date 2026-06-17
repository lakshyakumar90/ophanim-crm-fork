"use client";

import { useCallback, useState } from "react";
import { useParams } from "next/navigation";
import useSWR from "swr";
import { format } from "date-fns";
import { Kanban, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { projectsApi } from "@/lib/api";
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

const SPRINT_STATUSES = ["planned", "active", "completed", "cancelled"] as const;

type SprintForm = {
  name: string;
  goal: string;
  startDate: string;
  endDate: string;
  status: string;
};

const emptyForm = (): SprintForm => ({
  name: "",
  goal: "",
  startDate: "",
  endDate: "",
  status: "planned",
});

export default function ProjectSprintsPage() {
  const params = useParams();
  const projectId = params.id as string;
  const { user, can } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [editingSprintId, setEditingSprintId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<SprintForm>(emptyForm());

  const { data: project } = useSWR(
    user && projectId ? ["project", projectId] : null,
    () => projectsApi.get(projectId),
  );

  const canManageSprints = canManageProject(project, user, can);

  const { data, isLoading, mutate } = useSWR(
    user && projectId ? ["sprints", projectId] : null,
    () => projectsApi.listSprints(projectId),
  );

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await mutate();
    setTimeout(() => setIsRefreshing(false), 500);
  }, [mutate]);

  useHeaderRefresh({ onRefresh: handleRefresh, isRefreshing, enabled: Boolean(user) });

  const sprints = Array.isArray(data) ? data : (data as any)?.data ?? [];

  const openCreate = () => {
    setEditingSprintId(null);
    setForm(emptyForm());
    setShowCreate(true);
  };

  const openEdit = (sprint: any) => {
    setEditingSprintId(sprint.id);
    setForm({
      name: sprint.name ?? "",
      goal: sprint.goal ?? "",
      startDate: sprint.startDate ? sprint.startDate.slice(0, 10) : "",
      endDate: sprint.endDate ? sprint.endDate.slice(0, 10) : "",
      status: sprint.status ?? "planned",
    });
    setShowCreate(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        goal: form.goal.trim() || null,
        startDate: form.startDate || null,
        endDate: form.endDate || null,
        status: form.status,
      };
      if (editingSprintId) {
        await projectsApi.updateSprint(projectId, editingSprintId, payload);
        toast.success("Sprint updated");
      } else {
        await projectsApi.createSprint(projectId, payload);
        toast.success("Sprint created");
      }
      setShowCreate(false);
      setEditingSprintId(null);
      setForm(emptyForm());
      await mutate();
    } catch {
      toast.error(editingSprintId ? "Failed to update sprint" : "Failed to create sprint");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!pendingDeleteId) return;
    setSaving(true);
    try {
      await projectsApi.deleteSprint(projectId, pendingDeleteId);
      toast.success("Sprint deleted");
      setPendingDeleteId(null);
      await mutate();
    } catch {
      toast.error("Failed to delete sprint");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold">
            <Kanban className="h-5 w-5 text-primary" />
            Sprints
          </h1>
          <p className="text-sm text-muted-foreground">Agile sprint planning and tracking</p>
        </div>
        {canManageSprints && (
          <Button size="sm" className="gap-1.5" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            New Sprint
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : sprints.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No sprints defined for this project
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {sprints.map((sprint: any) => (
            <Card key={sprint.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">{sprint.name}</CardTitle>
                  <div className="flex items-center gap-1 shrink-0">
                    <Badge variant="outline" className="capitalize">
                      {String(sprint.status ?? "planned").replace(/_/g, " ")}
                    </Badge>
                    {canManageSprints && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => openEdit(sprint)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-red-600"
                          onClick={() => setPendingDeleteId(sprint.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-1">
                {sprint.startDate && (
                  <p>Start: {format(new Date(sprint.startDate), "MMM d, yyyy")}</p>
                )}
                {sprint.endDate && (
                  <p>End: {format(new Date(sprint.endDate), "MMM d, yyyy")}</p>
                )}
                {sprint.goal && <p className="pt-1">{sprint.goal}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <FormSideSheet
        open={showCreate}
        onOpenChange={(open) => {
          setShowCreate(open);
          if (!open) {
            setEditingSprintId(null);
            setForm(emptyForm());
          }
        }}
        title={editingSprintId ? "Edit sprint" : "New sprint"}
        description="Plan a sprint for this project."
        size="md"
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowCreate(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="create-sprint-form"
              disabled={saving || !form.name.trim()}
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : editingSprintId ? (
                "Save changes"
              ) : (
                "Create sprint"
              )}
            </Button>
          </>
        }
      >
        <form id="create-sprint-form" onSubmit={handleSave} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="sprint-name">Name</Label>
            <Input
              id="sprint-name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Sprint 1"
              required
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sprint-goal">Goal</Label>
            <Textarea
              id="sprint-goal"
              value={form.goal}
              onChange={(e) => setForm({ ...form, goal: e.target.value })}
              placeholder="What should this sprint achieve?"
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sprint-start">Start date</Label>
              <Input
                id="sprint-start"
                type="date"
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sprint-end">End date</Label>
              <Input
                id="sprint-end"
                type="date"
                value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
              />
            </div>
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
                {SPRINT_STATUSES.map((status) => (
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
        open={!!pendingDeleteId}
        onOpenChange={(open) => !open && setPendingDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete sprint?</AlertDialogTitle>
            <AlertDialogDescription>
              Tasks linked to this sprint will be unassigned from it. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={saving}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
