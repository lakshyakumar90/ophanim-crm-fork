"use client";

import { useCallback, useState } from "react";
import { useParams } from "next/navigation";
import useSWR from "swr";
import { format } from "date-fns";
import { Flag, Loader2, Plus } from "lucide-react";
import { milestonesApi, projectsApi } from "@/lib/api";
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

const MILESTONE_STATUSES = ["pending", "in_progress", "completed", "cancelled"] as const;

export default function ProjectTimelinePage() {
  const params = useParams();
  const projectId = params.id as string;
  const { user, can } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    dueDate: "",
    status: "pending",
  });

  const canManageMilestones =
    user?.role === "admin" || can("milestones:manage");

  const { data, isLoading, mutate } = useSWR(
    user && projectId ? ["timeline", projectId] : null,
    () => projectsApi.getTimeline(projectId),
  );

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await mutate();
    setTimeout(() => setIsRefreshing(false), 500);
  }, [mutate]);

  useHeaderRefresh({ onRefresh: handleRefresh, isRefreshing, enabled: Boolean(user) });

  const milestones = (data as any)?.milestones ?? (data as any)?.data?.milestones ?? [];
  const tasks = (data as any)?.tasks ?? (data as any)?.data?.tasks ?? [];

  const resetForm = () => {
    setForm({
      name: "",
      description: "",
      dueDate: "",
      status: "pending",
    });
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setCreating(true);
    try {
      await milestonesApi.create(projectId, {
        name: form.name.trim(),
        description: form.description.trim() || null,
        dueDate: form.dueDate
          ? new Date(`${form.dueDate}T12:00:00`).toISOString()
          : null,
        status: form.status,
      });
      toast.success("Milestone created");
      setShowCreate(false);
      resetForm();
      await mutate();
    } catch {
      toast.error("Failed to create milestone");
    } finally {
      setCreating(false);
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
          <p className="text-sm text-muted-foreground">Milestones and scheduled work</p>
        </div>
        {canManageMilestones && (
          <Button size="sm" className="gap-1.5" onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4" />
            Add Milestone
          </Button>
        )}
      </div>

      {isLoading ? (
        <Skeleton className="h-48 w-full" />
      ) : (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Milestones</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {milestones.length === 0 ? (
                <p className="text-sm text-muted-foreground">No milestones yet</p>
              ) : (
                milestones.map((m: any) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between rounded border px-3 py-2 text-sm"
                  >
                    <div>
                      <p className="font-medium">{m.title ?? m.name}</p>
                      {m.dueDate && (
                        <p className="text-muted-foreground">
                          Due {format(new Date(m.dueDate), "MMM d, yyyy")}
                        </p>
                      )}
                    </div>
                    <Badge variant="outline" className="capitalize">
                      {String(m.status ?? "pending").replace(/_/g, " ")}
                    </Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {tasks.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Upcoming Tasks</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {tasks.slice(0, 10).map((t: any) => (
                  <div key={t.id} className="flex justify-between text-sm">
                    <span>{t.title ?? t.name}</span>
                    <Badge variant="outline" className="capitalize">
                      {String(t.status ?? "open").replace(/_/g, " ")}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <FormSideSheet
        open={showCreate}
        onOpenChange={(open) => {
          setShowCreate(open);
          if (!open) resetForm();
        }}
        title="Add milestone"
        description="Add a milestone to the project timeline."
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
              form="create-milestone-form"
              disabled={creating || !form.name.trim()}
            >
              {creating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Create milestone"
              )}
            </Button>
          </>
        }
      >
        <form id="create-milestone-form" onSubmit={handleCreate} className="space-y-4">
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
    </div>
  );
}
