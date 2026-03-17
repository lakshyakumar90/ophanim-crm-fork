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

function TeamMemberCard({
  member,
  canManage,
  onRemove,
}: {
  member: any;
  canManage: boolean;
  onRemove: (userId: string) => void;
}) {
  return (
    <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50 transition-colors">
      <div className="flex items-center gap-3 min-w-0">
        <Avatar>
          <AvatarImage src={member.user?.avatarUrl || undefined} />
          <AvatarFallback>
            {member.user?.fullName?.charAt(0) || "U"}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="font-medium text-sm truncate">
            {member.user?.fullName}
          </p>
          <Badge
            variant="outline"
            className={`text-[10px] px-2 py-0 border-0 ${getRoleBadgeColor(member.role)}`}
          >
            {member.role?.replace(/_/g, " ").toUpperCase()}
          </Badge>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Badge variant="secondary" className="text-xs">
          {member.allocationPercentage}%
        </Badge>
        {canManage && member.user?.id && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-red-600"
            onClick={() => onRemove(member.user.id)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
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
      const res = await projectsApi.addMember(
        projectId,
        formData.userId,
        formData.role,
        parseInt(formData.allocation),
      );
      if ((res as any)?.data?.success) {
        toast.success("Member added successfully");
        setOpen(false);
        setFormData({ userId: "", role: "developer", allocation: "100" });
        onMemberAdded();
      }
    } catch {
      toast.error("Failed to add member");
    } finally {
      setLoading(false);
    }
  };

  const allUsers = resources
    ? [
        ...resources.developers,
        ...resources.designers,
        ...resources.seoSpecialists,
        ...resources.contentWriters,
        ...resources.projectManagers,
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
          <DialogDescription>Add a new member to this project.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>User</Label>
            <Select
              value={formData.userId}
              onValueChange={(val) =>
                setFormData({ ...formData, userId: val })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a user" />
              </SelectTrigger>
              <SelectContent>
                {uniqueUsers.map((user: any) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.full_name} ({user.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Role</Label>
            <Select
              value={formData.role}
              onValueChange={(val) =>
                setFormData({ ...formData, role: val })
              }
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
              {loading ? "Adding..." : "Add Member"}
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

  const isManagerOrAbove =
    user?.role === "admin" || user?.role === "manager";

  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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

  const handleRemoveMember = async (userId: string) => {
    if (!confirm("Remove this member from the project?")) return;
    try {
      await projectsApi.removeMember(id, userId);
      toast.success("Member removed");
      fetchProject(true);
    } catch {
      toast.error("Failed to remove member");
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

  const groupedMembers = {
    Managers: [
      ...(project.manager
        ? [
            {
              id: project.manager.id,
              user: project.manager,
              role: "project_manager",
              allocationPercentage: 100,
            },
          ]
        : []),
      ...(project.members?.filter(
        (m) =>
          m.role === "project_manager" && m.user?.id !== project.manager?.id,
      ) || []),
    ],
    Developers: project.members?.filter((m) => m.role === "developer") || [],
    Designers: project.members?.filter((m) => m.role === "designer") || [],
    Marketing:
      project.members?.filter((m) =>
        ["seo_specialist", "content_writer"].includes(m.role),
      ) || [],
    Other:
      project.members?.filter(
        (m) =>
          ![
            "project_manager",
            "developer",
            "designer",
            "seo_specialist",
            "content_writer",
          ].includes(m.role),
      ) || [],
  };

  const memberGroups = [
    { key: "Managers", data: groupedMembers.Managers, icon: Briefcase },
    { key: "Developers", data: groupedMembers.Developers, icon: Users },
    { key: "Designers", data: groupedMembers.Designers, icon: Users },
    { key: "Marketing & Content", data: groupedMembers.Marketing, icon: Target },
    { key: "Other", data: groupedMembers.Other, icon: Users },
  ].filter((g) => g.data.length > 0);

  const totalMembers = (project.members?.length || 0) + (project.manager ? 1 : 0);

  return (
    <div className="p-4 lg:p-6 mx-auto">
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
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-10 w-10 mx-auto mb-3 opacity-20" />
              <p>No team members assigned yet.</p>
              {isManagerOrAbove && (
                <p className="text-xs mt-1">Use &quot;Add Member&quot; to get started.</p>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {memberGroups.map((group) => (
                <div key={group.key} className="space-y-3">
                  <h4 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                    <group.icon className="h-4 w-4" /> {group.key}
                  </h4>
                  <div className="grid gap-3 md:grid-cols-2">
                    {group.data.map((member: any) => (
                      <TeamMemberCard
                        key={member.id || member.user?.id}
                        member={member}
                        canManage={isManagerOrAbove && member.role !== "project_manager"}
                        onRemove={handleRemoveMember}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
