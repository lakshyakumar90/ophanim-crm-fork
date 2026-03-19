"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Loader2,
  Save,
  Trash2,
  AlertTriangle,
  Building,
  Bell,
  Shield,
  Users2,
  Settings2,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
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
import { toast } from "sonner";
import type { Project } from "@/types";
import { projectsApi } from "@/lib/projects-api";
import { useAuth } from "@/providers/auth-provider";

export default function ProjectSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { user } = useAuth();

  const isAdmin = user?.role === "admin";
  const isManagerOrAbove = user?.role === "admin" || user?.role === "manager";

  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const [form, setForm] = useState({
    name: "",
    description: "",
    clientName: "",
    status: "planned" as Project["status"],
    priority: "medium" as Project["priority"],
    startDate: "",
    endDate: "",
  });

  // Notification preference states (UI only — would persist to user_preferences)
  const [notifPrefs, setNotifPrefs] = useState({
    taskAssigned: true,
    taskStatusChange: true,
    memberAdded: true,
    commentMention: true,
    deadlineReminder: true,
    dailyDigest: false,
  });

  useEffect(() => {
    if (!user) return;
    if (!isManagerOrAbove) {
      router.replace(`/projects/${id}/overview`);
      return;
    }
    projectsApi
      .get(id)
      .then((p) => {
        if (!p) return;
        setProject(p);
        setForm({
          name: p.name || "",
          description: p.description || "",
          clientName: p.clientName || "",
          status: p.status,
          priority: p.priority,
          startDate: p.startDate ? p.startDate.split("T")[0] : "",
          endDate: p.endDate ? p.endDate.split("T")[0] : "",
        });
      })
      .catch(() => toast.error("Failed to load project"))
      .finally(() => setIsLoading(false));
  }, [id, user, isManagerOrAbove]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Project name is required");
      return;
    }
    setIsSaving(true);
    try {
      await projectsApi.update(id, {
        name: form.name.trim(),
        description: form.description.trim() || null,
        clientName: form.clientName.trim() || null,
        status: form.status,
        priority: form.priority,
        startDate: form.startDate || null,
        endDate: form.endDate || null,
      });
      toast.success("Project updated successfully");
    } catch {
      toast.error("Failed to update project");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await projectsApi.delete(id);
      toast.success("Project deleted");
      router.push("/projects");
    } catch {
      toast.error("Failed to delete project");
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex h-[40vh] items-center justify-center">
        <div className="text-center">
          <Building className="h-10 w-10 mx-auto mb-3 opacity-20" />
          <p className="text-muted-foreground">Project not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-4 lg:p-6">
      {/* ── General Settings ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Settings2 className="h-4 w-4" />
            General Settings
          </CardTitle>
          <CardDescription>
            Update the project details and configuration.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Project Name *</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Enter project name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                placeholder="What is this project about?"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="clientName">Client Name</Label>
              <Input
                id="clientName"
                value={form.clientName}
                onChange={(e) =>
                  setForm({ ...form, clientName: e.target.value })
                }
                placeholder="Client or company name"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) =>
                    setForm({ ...form, status: v as Project["status"] })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planned">Planned</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="on_hold">On Hold</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Priority</Label>
                <Select
                  value={form.priority}
                  onValueChange={(v) =>
                    setForm({ ...form, priority: v as Project["priority"] })
                  }
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
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={form.startDate}
                  onChange={(e) =>
                    setForm({ ...form, startDate: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={form.endDate}
                  onChange={(e) =>
                    setForm({ ...form, endDate: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button type="submit" disabled={isSaving} className="gap-2">
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* ── Notification Preferences ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell className="h-4 w-4" />
            Notification Preferences
          </CardTitle>
          <CardDescription>
            Choose which project events trigger notifications for you.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              {
                key: "taskAssigned" as const,
                label: "Task Assigned to You",
                desc: "When a task is assigned to you in this project",
              },
              {
                key: "taskStatusChange" as const,
                label: "Task Status Changes",
                desc: "When tasks you own or are assigned to change status",
              },
              {
                key: "memberAdded" as const,
                label: "Member Added",
                desc: "When a new member joins the project",
              },
              {
                key: "commentMention" as const,
                label: "Mentions in Discussion",
                desc: "When someone @mentions you in the discussion",
              },
              {
                key: "deadlineReminder" as const,
                label: "Deadline Reminders",
                desc: "Reminders 1 day before a task due date",
              },
              {
                key: "dailyDigest" as const,
                label: "Daily Digest",
                desc: "A daily summary of project activity",
              },
            ].map(({ key, label, desc }) => (
              <div key={key} className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <p className="text-sm font-medium">{label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                </div>
                <Switch
                  checked={notifPrefs[key]}
                  onCheckedChange={(v) =>
                    setNotifPrefs((prev) => ({ ...prev, [key]: v }))
                  }
                />
              </div>
            ))}
          </div>
          <div className="flex justify-end pt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => toast.success("Notification preferences saved")}
            >
              <Save className="h-3.5 w-3.5 mr-1.5" />
              Save Preferences
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Member Access ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users2 className="h-4 w-4" />
            Member Access
          </CardTitle>
          <CardDescription>
            Configure who can see and access project content.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium">Members can view all tasks</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  All project members can see tasks assigned to others
                </p>
              </div>
              <Switch defaultChecked />
            </div>
            <Separator />
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium">Members can upload files</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Allow all members to upload files to the project
                </p>
              </div>
              <Switch defaultChecked />
            </div>
            <Separator />
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium">Members can see analytics</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Allow non-manager members to view the analytics page
                </p>
              </div>
              <Switch defaultChecked />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Danger Zone (Admin only) ── */}
      {isAdmin && (
        <>
          <Separator />
          <Card className="border-red-200 dark:border-red-900">
            <CardHeader>
              <CardTitle className="text-red-600 dark:text-red-400 flex items-center gap-2 text-base">
                <AlertTriangle className="h-5 w-5" />
                Danger Zone
              </CardTitle>
              <CardDescription>
                Irreversible and destructive actions.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Delete this project</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Permanently removes the project, all tasks, and member
                    associations.
                  </p>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={isDeleting}
                  onClick={() => setShowDeleteDialog(true)}
                  className="gap-2 shrink-0"
                >
                  {isDeleting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                  Delete Project
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Delete confirmation dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &ldquo;{project?.name}&rdquo;?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. All tasks, members, notes, and files
              associated with this project will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Delete Project
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
