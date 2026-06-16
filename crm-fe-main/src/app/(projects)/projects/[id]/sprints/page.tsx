"use client";

import { useCallback, useState } from "react";
import { useParams } from "next/navigation";
import useSWR from "swr";
import { format } from "date-fns";
import { Kanban, Loader2, Plus } from "lucide-react";
import { projectsApi } from "@/lib/api";
import { useAuth } from "@/providers/auth-provider";
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
import { useHeaderRefresh } from "@/hooks/layout/useHeaderRefresh";
import { toast } from "sonner";

const SPRINT_STATUSES = ["planned", "active", "completed", "cancelled"] as const;

export default function ProjectSprintsPage() {
  const params = useParams();
  const projectId = params.id as string;
  const { user, can } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    name: "",
    goal: "",
    startDate: "",
    endDate: "",
    status: "planned",
  });

  const canManageSprints =
    user?.role === "admin" ||
    can("projects:edit") ||
    can("milestones:manage");

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

  const resetForm = () => {
    setForm({
      name: "",
      goal: "",
      startDate: "",
      endDate: "",
      status: "planned",
    });
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setCreating(true);
    try {
      await projectsApi.createSprint(projectId, {
        name: form.name.trim(),
        goal: form.goal.trim() || null,
        startDate: form.startDate || null,
        endDate: form.endDate || null,
        status: form.status,
      });
      toast.success("Sprint created");
      setShowCreate(false);
      resetForm();
      await mutate();
    } catch {
      toast.error("Failed to create sprint");
    } finally {
      setCreating(false);
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
          <Button size="sm" className="gap-1.5" onClick={() => setShowCreate(true)}>
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
                <div className="flex items-start justify-between">
                  <CardTitle className="text-base">{sprint.name}</CardTitle>
                  <Badge variant="outline" className="capitalize">
                    {String(sprint.status ?? "planned").replace(/_/g, " ")}
                  </Badge>
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
          if (!open) resetForm();
        }}
        title="New sprint"
        description="Plan a sprint for this project."
        size="md"
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowCreate(false)}
              disabled={creating}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="create-sprint-form"
              disabled={creating || !form.name.trim()}
            >
              {creating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Create sprint"
              )}
            </Button>
          </>
        }
      >
        <form id="create-sprint-form" onSubmit={handleCreate} className="space-y-4">
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
    </div>
  );
}
