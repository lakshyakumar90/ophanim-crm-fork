"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  Loader2,
  Users,
  Briefcase,
  Target,
  Plus,
  Trash2,
  Code2,
  Palette,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import type { Project } from "@/types";
import { projectsApi } from "@/lib/projects-api";
import { useAuth } from "@/providers/auth-provider";
import { useHeaderRefresh } from "@/hooks/use-header-refresh";

function getRoleBadgeColor(role: string): string {
  switch (role) {
    case "project_manager":
      return "bg-purple-50 text-purple-700 border-purple-200";
    case "developer":
      return "bg-blue-50 text-blue-700 border-blue-200";
    case "designer":
      return "bg-pink-50 text-pink-700 border-pink-200";
    case "seo_specialist":
      return "bg-orange-50 text-orange-700 border-orange-200";
    case "content_writer":
      return "bg-indigo-50 text-indigo-700 border-indigo-200";
    default:
      return "bg-slate-50 text-slate-700 border-slate-200";
  }
}

const ROLE_LABELS: Record<string, string> = {
  project_manager: "Project Manager",
  developer: "Developer",
  designer: "Designer",
  seo_specialist: "SEO Specialist",
  content_writer: "Content Writer",
};

function getRoleLabel(role: string): string {
  return (
    ROLE_LABELS[role] ||
    role
      .split("_")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ")
  );
}

function AddMemberDialog({
  projectId,
  onMemberAdded,
}: {
  projectId: string;
  onMemberAdded: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resources, setResources] = useState<any>(null);
  const [formData, setFormData] = useState({
    userId: "",
    role: "developer",
    allocation: "100",
  });

  useEffect(() => {
    if (open && !resources) {
      projectsApi.getResources().then((data) => {
        if (data) setResources(data);
      });
    }
  }, [open, resources]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.userId) {
      toast.error("Please select a user");
      return;
    }
    setLoading(true);
    try {
      await projectsApi.addMember(
        projectId,
        formData.userId,
        formData.role,
        parseInt(formData.allocation),
      );
      toast.success("Member added successfully");
      setOpen(false);
      setFormData({ userId: "", role: "developer", allocation: "100" });
      onMemberAdded();
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || err?.message || "";
      if (msg.toLowerCase().includes("already has this role")) {
        toast.error("This user already has that role on the project. Choose a different role.");
      } else {
        toast.error("Failed to add member");
      }
    } finally {
      setLoading(false);
    }
  };

  const allUsers = resources
    ? [
        ...resources.projectManagers,
        ...resources.developers,
        ...resources.designers,
        ...resources.seoSpecialists,
        ...resources.contentWriters,
      ]
    : [];
  const uniqueUsers = Array.from(
    new Map(allUsers.map((u: any) => [u.id, u])).values(),
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1">
          <Plus className="h-4 w-4" /> Add Member
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Team Member</DialogTitle>
          <DialogDescription>Add a member to this project. A user can have multiple roles.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>User</Label>
            <Select
              value={formData.userId}
              onValueChange={(val) => setFormData({ ...formData, userId: val })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a user" />
              </SelectTrigger>
              <SelectContent>
                {uniqueUsers.map((u: any) => (
                  <SelectItem key={u.id} value={u.id}>
                    <div className="flex flex-col">
                      <span>{u.full_name || u.fullName}</span>
                      <span className="text-xs text-muted-foreground">
                        {u.email}
                        {u.job_title ? ` · ${u.job_title.replace(/_/g, " ")}` : ""}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Project Role</Label>
            <Select
              value={formData.role}
              onValueChange={(val) => setFormData({ ...formData, role: val })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="project_manager">Project Manager</SelectItem>
                <SelectItem value="developer">Developer</SelectItem>
                <SelectItem value="designer">Designer</SelectItem>
                <SelectItem value="seo_specialist">SEO Specialist</SelectItem>
                <SelectItem value="content_writer">Content Writer</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Allocation (%)</Label>
            <Input
              type="number"
              min="0"
              max="100"
              value={formData.allocation}
              onChange={(e) =>
                setFormData({ ...formData, allocation: e.target.value })
              }
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Adding...
                </>
              ) : (
                "Add Member"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function ProjectResourcesPage() {
  const params = useParams();
  const id = params.id as string;
  const { user } = useAuth();

  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingRemoveId, setPendingRemoveId] = useState<string | null>(null);
  const [removing, setRemoving] = useState(false);

  const fetchProject = async (quiet = false) => {
    if (!quiet) setIsLoading(true);
    try {
      const data = await projectsApi.get(id);
      if (data) setProject(data);
    } catch (error) {
      console.error("Failed to fetch project", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchProject();
  }, [id]);

  useHeaderRefresh({ onRefresh: () => fetchProject(true), isRefreshing: isLoading });

  const isGlobalAdmin = user?.role === "admin";
  const isProjectManager =
    project?.manager?.id === user?.id ||
    project?.members?.some(
      (m: any) => (m.userId || m.user?.id) === user?.id && m.role === "project_manager",
    );
  const isManagerOrAbove = isGlobalAdmin || !!isProjectManager;

  const confirmRemove = async () => {
    if (!pendingRemoveId) return;
    setRemoving(true);
    try {
      await projectsApi.removeMember(id, pendingRemoveId);
      toast.success("Member removed from project");
      fetchProject(true);
    } catch {
      toast.error("Failed to remove member");
    } finally {
      setRemoving(false);
      setPendingRemoveId(null);
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
      <div className="flex h-[40vh] items-center justify-center text-muted-foreground">
        <p>Project not found.</p>
      </div>
    );
  }

  // Build member groups
  const allMembers: any[] = project.members || [];
  const managerEntry = project.manager
    ? {
        id: `mgr-${project.manager.id}`,
        user: project.manager,
        role: "project_manager",
        allocationPercentage: 100,
        isPrimaryManager: true,
      }
    : null;

  const pmMembers = allMembers.filter(
    (m) => m.role === "project_manager" && m.user?.id !== project.manager?.id,
  );
  const managerGroup = [
    ...(managerEntry ? [managerEntry] : []),
    ...pmMembers,
  ];
  const developerGroup = allMembers.filter((m) => m.role === "developer");
  const designerGroup = allMembers.filter((m) => m.role === "designer");
  const marketingGroup = allMembers.filter((m) =>
    ["seo_specialist", "content_writer"].includes(m.role),
  );
  const otherGroup = allMembers.filter(
    (m) =>
      !["project_manager", "developer", "designer", "seo_specialist", "content_writer"].includes(
        m.role,
      ),
  );

  const memberGroups = [
    { key: "Managers", data: managerGroup, icon: Briefcase },
    { key: "Developers", data: developerGroup, icon: Code2 },
    { key: "Designers", data: designerGroup, icon: Palette },
    { key: "Marketing & Content", data: marketingGroup, icon: Target },
    { key: "Other", data: otherGroup, icon: Users },
  ].filter((g) => g.data.length > 0);

  // Count displayed members (managerEntry may exist when primary manager isn't in project_members)
  const totalMembers = memberGroups.reduce((sum, g) => sum + g.data.length, 0);

  // Find the member being removed for the confirmation dialog
  const removingMember = pendingRemoveId
    ? [...allMembers, ...(managerEntry ? [managerEntry] : [])].find(
        (m) => (m.user?.id || m.userId) === pendingRemoveId,
      )
    : null;

  return (
    <div className="p-4 lg:p-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Project Team</CardTitle>
            <CardDescription>
              {totalMembers} member{totalMembers !== 1 ? "s" : ""} on this project
            </CardDescription>
          </div>
          {isManagerOrAbove && (
            <AddMemberDialog
              projectId={id}
              onMemberAdded={() => fetchProject(true)}
            />
          )}
        </CardHeader>
        <CardContent>
          {memberGroups.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="h-10 w-10 mx-auto mb-3 opacity-20" />
              <p>No team members assigned yet.</p>
              {isManagerOrAbove && (
                <p className="text-xs mt-1">Use &quot;Add Member&quot; to get started.</p>
              )}
            </div>
          ) : (
            <div className="space-y-8">
              {memberGroups.map((group) => (
                <div key={group.key}>
                  <div className="flex items-center gap-2 mb-3">
                    <group.icon className="h-4 w-4 text-muted-foreground" />
                    <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                      {group.key}
                    </h4>
                    <span className="text-xs text-muted-foreground">
                      ({group.data.length})
                    </span>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="w-[240px]">Member</TableHead>
                        <TableHead>Project Role</TableHead>
                        <TableHead className="w-[100px]">Allocation</TableHead>
                        {isManagerOrAbove && (
                          <TableHead className="w-[60px] text-right">Actions</TableHead>
                        )}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {group.data.map((member: any) => {
                        const userId = member.user?.id || member.userId;
                        const canRemove = isManagerOrAbove && userId && !member.isPrimaryManager;
                        return (
                          <TableRow key={member.id || userId}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <Avatar className="h-8 w-8">
                                  <AvatarImage src={member.user?.avatarUrl || undefined} />
                                  <AvatarFallback className="text-xs">
                                    {(member.user?.fullName || member.user?.full_name || "?").charAt(0).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-medium text-sm">
                                    {member.user?.fullName || member.user?.full_name || "—"}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {member.user?.email || ""}
                                  </p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={`text-xs px-2 py-0.5 border ${getRoleBadgeColor(member.role)}`}
                              >
                                {getRoleLabel(member.role)}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <span className="text-sm font-medium">
                                {member.allocationPercentage ?? 100}%
                              </span>
                            </TableCell>
                            {isManagerOrAbove && (
                              <TableCell className="text-right">
                                {canRemove ? (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-muted-foreground hover:text-red-600"
                                    onClick={() => setPendingRemoveId(userId)}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                ) : null}
                              </TableCell>
                            )}
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Remove member confirmation dialog */}
      <AlertDialog
        open={!!pendingRemoveId}
        onOpenChange={(open) => { if (!open) setPendingRemoveId(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove member?</AlertDialogTitle>
            <AlertDialogDescription>
              {removingMember
                ? `Remove ${removingMember.user?.fullName || removingMember.user?.full_name || "this member"} from the project?`
                : "Are you sure you want to remove this member from the project?"}
              {" "}This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmRemove}
              disabled={removing}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {removing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Removing...
                </>
              ) : (
                "Remove"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
