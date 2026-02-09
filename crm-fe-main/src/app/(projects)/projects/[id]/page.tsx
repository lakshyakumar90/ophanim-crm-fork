"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { projectsApi } from "@/lib/projects-api";
import { tasksApi } from "@/lib/api";
import { formatIST, formatDistanceToNowIST } from "@/lib/date-utils";
import type { Project, Task } from "@/types";
import {
  Loader2,
  Calendar,
  Clock,
  Users,
  Building,
  Target,
  CheckCircle2,
  Circle,
  Briefcase,
  FileIcon,
  Upload,
  Download,
  Trash2,
  File,
  FileText,
  FileImage,
  RefreshCw,
    ArrowRightCircle,
  ArrowUpCircle,
  ArrowDownCircle,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ProjectNotes } from "@/components/projects/project-notes";
import { ProjectTasksList } from "@/components/projects/project-tasks-list";
import { format } from "date-fns";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";

const PRIORITY_COLORS = {
  low: "bg-slate-100 text-slate-700 border-slate-200",
  medium: "bg-yellow-100 text-yellow-700 border-yellow-200",
  high: "bg-red-100 text-red-700 border-red-200",
};

const STATUS_CONFIG = {
  planned: {
    label: "Planned",
    color: "bg-blue-100 text-blue-700 border-blue-200",
  },
  in_progress: {
    label: "In Progress",
    color: "bg-purple-100 text-purple-700 border-purple-200",
  },
  on_hold: {
    label: "On Hold",
    color: "bg-orange-100 text-orange-700 border-orange-200",
  },
  completed: {
    label: "Completed",
    color: "bg-green-100 text-green-700 border-green-200",
  },
  cancelled: {
    label: "Cancelled",
    color: "bg-red-100 text-red-700 border-red-200",
  },
};

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1";

interface DashboardStats {
  taskProgress: {
    total: number;
    completed: number;
    inProgress: number;
    todo: number;
  };
  upcomingTasks: any[];
}

export default function ProjectDetailsPage() {
  const params = useParams();
  const [project, setProject] = useState<Project | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProject = async () => {
    try {
      const token = localStorage.getItem("crm_access_token");

      // Fetch project details
      const projectData = await projectsApi.get(params.id as string);
      if (projectData) {
        setProject(projectData);
      }

      // Fetch dashboard stats
      const statsRes = await fetch(
        `${API_URL}/projects/${params.id}/dashboard-stats`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch project data", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (params.id) {
      fetchProject();
    }
  }, [params.id]);

  if (isLoading) {
    return (
      <div className="flex h-[50vh] flex-col items-center justify-center gap-2">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">
          Loading project workspace...
        </p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex h-[50vh] flex-col items-center justify-center gap-4">
        <div className="rounded-full bg-slate-100 p-4">
          <Building className="h-8 w-8 text-muted-foreground" />
        </div>
        <div className="text-center">
          <h2 className="text-lg font-semibold">Project Not Found</h2>
          <p className="text-sm text-muted-foreground">
            The project you're looking for doesn't exist or you don't have
            access.
          </p>
        </div>
      </div>
    );
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleBadgeColor = (role: string) => {
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
  };

  // Group team members by role category
  const groupedMembers = {
    Managers: [
      ...(project.manager
        ? [
            {
              id: project.manager.id,
              user: project.manager,
              role: "project_manager",
              allocationPercentage: 100, // PM is always 100% implicitly if main manager
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

  const completionRate = stats?.taskProgress.total
    ? Math.round(
        (stats.taskProgress.completed / stats.taskProgress.total) * 100,
      )
    : 0;

  return (
    <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto">
      {/* Header Section */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={STATUS_CONFIG[project.status].color}
            >
              {STATUS_CONFIG[project.status].label}
            </Badge>
            <Badge
              variant="outline"
              className={PRIORITY_COLORS[project.priority]}
            >
              {project.priority.charAt(0).toUpperCase() +
                project.priority.slice(1)}{" "}
              Priority
            </Badge>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">{project.name}</h1>
          <p className="text-muted-foreground max-w-2xl">
            {project.description || "No description provided."}
          </p>
        </div>
      </div>

      <Separator />

      {/* Main Content */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
          <TabsTrigger value="notes">Discussions</TabsTrigger>
          <TabsTrigger value="files">Files</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Project Info Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Project Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                    <Building className="h-5 w-5" />
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium leading-none">Client</p>
                    <p className="text-sm text-muted-foreground">
                      {project.clientName || "Internal Project"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                    <Calendar className="h-5 w-5" />
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium leading-none">
                      Start Date
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {project.startDate
                        ? format(new Date(project.startDate), "MMM d, yyyy")
                        : "Not set"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-50 text-rose-600">
                    <Clock className="h-5 w-5" />
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium leading-none">Deadline</p>
                    <p className="text-sm text-muted-foreground">
                      {project.endDate
                        ? format(new Date(project.endDate), "MMM d, yyyy")
                        : "No deadline"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Team Snapshot */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Team Snapshot</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9">
                    <AvatarImage
                      src={project.manager?.avatarUrl || undefined}
                    />
                    <AvatarFallback>M</AvatarFallback>
                  </Avatar>
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium leading-none">Manager</p>
                    <p className="text-sm text-muted-foreground">
                      {project.manager?.fullName || "Unassigned"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                    <Users className="h-5 w-5" />
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium leading-none">Members</p>
                    <p className="text-sm text-muted-foreground">
                      {project.members?.length || 0} active members
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Progress Visualization */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Progress</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      Task Completion
                    </span>
                    <span className="font-medium">{completionRate}%</span>
                  </div>
                  <Progress value={completionRate} className="h-2" />
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2">
                  <div className="flex flex-col items-center bg-slate-50 p-2 rounded-md">
                    <span className="text-lg font-bold text-slate-700">
                      {stats?.taskProgress.todo || 0}
                    </span>
                    <span className="text-[10px] uppercase text-muted-foreground font-medium">
                      To Do
                    </span>
                  </div>
                  <div className="flex flex-col items-center bg-purple-50 p-2 rounded-md">
                    <span className="text-lg font-bold text-purple-700">
                      {stats?.taskProgress.inProgress || 0}
                    </span>
                    <span className="text-[10px] uppercase text-muted-foreground font-medium">
                      In Progress
                    </span>
                  </div>
                  <div className="flex flex-col items-center bg-green-50 p-2 rounded-md">
                    <span className="text-lg font-bold text-green-700">
                      {stats?.taskProgress.completed || 0}
                    </span>
                    <span className="text-[10px] uppercase text-muted-foreground font-medium">
                      Done
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity/Notes and Upcoming Tasks */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="h-full flex flex-col">
              <CardHeader>
                <CardTitle className="text-base">Recent Discussions</CardTitle>
                <CardDescription>Latest notes from the team</CardDescription>
              </CardHeader>
              <CardContent className="flex-1">
                <div className="max-h-[300px] overflow-y-auto pr-2">
                  <ProjectNotes projectId={project.id} />
                </div>
              </CardContent>
            </Card>

            <Card className="h-full flex flex-col">
              <CardHeader>
                <CardTitle className="text-base">Upcoming Tasks</CardTitle>
                <CardDescription>Tasks due soon</CardDescription>
              </CardHeader>
              <CardContent className="flex-1">
                {stats?.upcomingTasks && stats.upcomingTasks.length > 0 ? (
                  <div className="space-y-4">
                    {stats.upcomingTasks.map((task: any) => (
                      <div
                        key={task.id}
                        className="flex items-start gap-3 pb-3 border-b last:border-0 last:pb-0"
                      >
                        <div
                          className={`mt-0.5 p-1 rounded-full border ${task.status === "in_progress" ? "bg-purple-100 border-purple-200 text-purple-600" : "bg-slate-100 border-slate-200 text-slate-500"}`}
                        >
                          {task.status === "in_progress" ? (
                            <Clock className="h-3 w-3" />
                          ) : (
                            <Circle className="h-3 w-3" />
                          )}
                        </div>
                        <div className="flex-1 space-y-1">
                          <p className="text-sm font-medium leading-none">
                            {task.title}
                          </p>
                          <div className="flex items-center gap-2">
                            <Badge
                              variant="outline"
                              className={`text-[10px] px-1 py-0 h-4 ${PRIORITY_COLORS[task.priority as keyof typeof PRIORITY_COLORS]}`}
                            >
                              {task.priority}
                            </Badge>
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(task.due_date), "MMM d")}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-48 text-center text-muted-foreground">
                    <CheckCircle2 className="h-8 w-8 mb-2 opacity-20" />
                    <p>No upcoming tasks due clearly.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tasks Tab */}
        <TabsContent value="tasks">
          <ProjectTasksList projectId={project.id} />
        </TabsContent>

        {/* Team Tab */}
        <TabsContent value="team">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Project Team</CardTitle>
                <CardDescription>
                  Manage team members and allocations.
                </CardDescription>
              </div>
              <AddMemberDialog
                projectId={project.id}
                onMemberAdded={fetchProject}
              />
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Managers Section */}
                {groupedMembers.Managers.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                      <Briefcase className="h-4 w-4" /> Management
                    </h4>
                    <div className="grid gap-3 md:grid-cols-2">
                      {groupedMembers.Managers.map((member: any) => (
                        <TeamMemberCard
                          key={member.id || member.user.id}
                          member={member}
                          getBadgeColor={getRoleBadgeColor}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Developers Section */}
                {groupedMembers.Developers.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                      <Users className="h-4 w-4" /> Developers
                    </h4>
                    <div className="grid gap-3 md:grid-cols-2">
                      {groupedMembers.Developers.map((member: any) => (
                        <TeamMemberCard
                          key={member.id}
                          member={member}
                          getBadgeColor={getRoleBadgeColor}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Designers Section */}
                {groupedMembers.Designers.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                      <Users className="h-4 w-4" /> Designers
                    </h4>
                    <div className="grid gap-3 md:grid-cols-2">
                      {groupedMembers.Designers.map((member: any) => (
                        <TeamMemberCard
                          key={member.id}
                          member={member}
                          getBadgeColor={getRoleBadgeColor}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Marketing Section */}
                {groupedMembers.Marketing.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                      <Target className="h-4 w-4" /> Marketing & Content
                    </h4>
                    <div className="grid gap-3 md:grid-cols-2">
                      {groupedMembers.Marketing.map((member: any) => (
                        <TeamMemberCard
                          key={member.id}
                          member={member}
                          getBadgeColor={getRoleBadgeColor}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Other Section */}
                {groupedMembers.Other.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-muted-foreground">
                      Other Members
                    </h4>
                    <div className="grid gap-3 md:grid-cols-2">
                      {groupedMembers.Other.map((member: any) => (
                        <TeamMemberCard
                          key={member.id}
                          member={member}
                          getBadgeColor={getRoleBadgeColor}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Empty State */}
                {(!project.members || project.members.length === 0) &&
                  !project.manager && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Users className="h-10 w-10 mx-auto mb-3 opacity-20" />
                      <p>No team members assigned yet.</p>
                      <p className="text-xs">Add members to see them here.</p>
                    </div>
                  )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notes Tab (Dedicated) */}
        <TabsContent value="notes">
          <div className="max-w-3xl mx-auto">
            <ProjectNotes projectId={project.id} />
          </div>
        </TabsContent>

        {/* Files Tab */}
        <TabsContent value="files">
          <ProjectFilesSection projectId={project.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function TeamMemberCard({
  member,
  getBadgeColor,
}: {
  member: any;
  getBadgeColor: (role: string) => string;
}) {
  return (
    <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50 transition-colors">
      <div className="flex items-center gap-3">
        <Avatar>
          <AvatarImage src={member.user?.avatarUrl || undefined} />
          <AvatarFallback>
            {member.user?.fullName?.charAt(0) || "U"}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="font-medium text-sm">{member.user?.fullName}</p>
          <Badge
            variant="outline"
            className={`text-[10px] px-2 py-0 border-0 ${getBadgeColor(member.role)}`}
          >
            {member.role?.replace("_", " ").toUpperCase()}
          </Badge>
        </div>
      </div>
      <Badge variant="secondary" className="text-xs">
        {member.allocationPercentage}%
      </Badge>
    </div>
  );
}

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
import { Plus } from "lucide-react";

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
        if (data) {
          setResources(data);
        }
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

      if (res.data.success) {
        toast.success("Member added successfully");
        setOpen(false);
        setFormData({ userId: "", role: "developer", allocation: "100" });
        onMemberAdded();
      }
    } catch (error) {
      toast.error("Failed to add member");
      console.error(error);
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

  // Deduplicate users
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
          <DialogDescription>
            Add a new member to this project team.
          </DialogDescription>
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
              onValueChange={(val) => setFormData({ ...formData, role: val })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select role" />
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

interface ProjectFile {
  id: string;
  projectId: string;
  name: string;
  fileType: string | null;
  fileSize: number | null;
  storagePath: string;
  uploadedBy: string | null;
  description: string | null;
  createdAt: string;
  uploader?: {
    id: string;
    fullName: string;
    avatarUrl: string | null;
  };
}

function ProjectFilesSection({ projectId }: { projectId: string }) {
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);

  const fetchFiles = async () => {
    try {
      const token = localStorage.getItem("crm_access_token");
      const res = await fetch(`${API_URL}/projects/${projectId}/files`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setFiles(data.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch files", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, [projectId]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const token = localStorage.getItem("crm_access_token");
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`${API_URL}/projects/${projectId}/files`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (res.ok) {
        toast.success("File uploaded successfully");
        fetchFiles();
      } else {
        const err = await res.json();
        toast.error(err.error || "Upload failed");
      }
    } catch (error) {
      toast.error("Failed to upload file");
      console.error(error);
    } finally {
      setIsUploading(false);
      e.target.value = ""; // Reset input
    }
  };

  const handleDownload = async (file: ProjectFile) => {
    try {
      const token = localStorage.getItem("crm_access_token");
      const res = await fetch(
        `${API_URL}/projects/${projectId}/files/${file.id}/download`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (res.ok) {
        const data = await res.json();
        window.open(data.data.downloadUrl, "_blank");
      } else {
        toast.error("Failed to get download URL");
      }
    } catch (error) {
      toast.error("Download failed");
      console.error(error);
    }
  };

  const handleDelete = async (fileId: string) => {
    if (!confirm("Are you sure you want to delete this file?")) return;

    try {
      const token = localStorage.getItem("crm_access_token");
      const res = await fetch(
        `${API_URL}/projects/${projectId}/files/${fileId}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (res.ok) {
        toast.success("File deleted");
        fetchFiles();
      } else {
        toast.error("Failed to delete file");
      }
    } catch (error) {
      toast.error("Delete failed");
      console.error(error);
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (fileType: string | null) => {
    if (!fileType) return <File className="h-5 w-5" />;
    if (fileType.startsWith("image/"))
      return <FileImage className="h-5 w-5 text-blue-500" />;
    if (fileType.includes("pdf"))
      return <FileText className="h-5 w-5 text-red-500" />;
    return <FileIcon className="h-5 w-5 text-slate-500" />;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-10 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Project Files</CardTitle>
          <CardDescription>Upload and manage project documents</CardDescription>
        </div>
        <div className="relative">
          <input
            type="file"
            id="file-upload"
            className="hidden"
            onChange={handleUpload}
            disabled={isUploading}
          />
          <label htmlFor="file-upload">
            <Button
              asChild
              size="sm"
              disabled={isUploading}
              className="cursor-pointer gap-1"
            >
              <span>
                {isUploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                {isUploading ? "Uploading..." : "Upload File"}
              </span>
            </Button>
          </label>
        </div>
      </CardHeader>
      <CardContent>
        {files.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            <FileIcon className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p>No files uploaded yet.</p>
            <p className="text-xs mt-1">
              Upload documents, images, or other files.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {files.map((file) => (
              <div
                key={file.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-slate-100 rounded-lg">
                    {getFileIcon(file.fileType)}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{file.name}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{formatFileSize(file.fileSize)}</span>
                      <span>•</span>
                      <span>{file.uploader?.fullName || "Unknown"}</span>
                      <span>•</span>
                      <span>
                        {format(new Date(file.createdAt), "MMM d, yyyy")}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDownload(file)}
                    title="Download"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(file.id)}
                    title="Delete"
                    className="text-red-500 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
