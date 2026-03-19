"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Calendar,
  Clock,
  Layout,
  MoreVertical,
  CheckCircle2,
  AlertCircle,
  PlayCircle,
  PauseCircle,
  XCircle,
} from "lucide-react";
import { format } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useHeaderRefresh } from "@/hooks/use-header-refresh";

interface Project {
  id: string;
  name: string;
  description: string;
  status: "planned" | "in_progress" | "on_hold" | "completed" | "cancelled";
  priority: "low" | "medium" | "high";
  startDate: string;
  endDate: string;
  manager: {
    fullName: string;
    avatarUrl: string | null;
  };
}

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1";

const STATUS_CONFIG = {
  planned: {
    label: "Planned",
    color: "bg-blue-100 text-blue-700 border-blue-200",
    icon: Calendar,
  },
  in_progress: {
    label: "In Progress",
    color: "bg-purple-100 text-purple-700 border-purple-200",
    icon: PlayCircle,
  },
  on_hold: {
    label: "On Hold",
    color: "bg-orange-100 text-orange-700 border-orange-200",
    icon: PauseCircle,
  },
  completed: {
    label: "Completed",
    color: "bg-green-100 text-green-700 border-green-200",
    icon: CheckCircle2,
  },
  cancelled: {
    label: "Cancelled",
    color: "bg-red-100 text-red-700 border-red-200",
    icon: XCircle,
  },
};

const PRIORITY_COLORS = {
  low: "bg-slate-100 text-slate-700 border-slate-200",
  medium: "bg-yellow-100 text-yellow-700 border-yellow-200",
  high: "bg-red-100 text-red-700 border-red-200",
};

export default function MyProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchProjects = async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const token = localStorage.getItem("crm_access_token");
      const res = await fetch(`${API_URL}/projects/my-projects`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setProjects(data.data);
      } else {
        toast.error("Failed to fetch your projects");
      }
    } catch (error) {
      console.error("Failed to fetch projects:", error);
      toast.error("Failed to load projects");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useHeaderRefresh({ onRefresh: () => fetchProjects(true), isRefreshing: loading });

  const activeProjects = projects.filter(
    (p) => p.status === "in_progress" || p.status === "planned",
  );
  const otherProjects = projects.filter(
    (p) => p.status !== "in_progress" && p.status !== "planned",
  );

  if (loading) {
    return (
      <div className="flex flex-col gap-6 p-4 lg:p-6">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 p-4 lg:p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Projects</h1>
        <p className="text-muted-foreground">
          Projects you manage or are assigned to as a team member.
        </p>
      </div>

      {projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 border rounded-lg bg-slate-50">
          <Layout className="h-10 w-10 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">No projects assigned</h3>
          <p className="text-muted-foreground text-center max-w-sm mt-1">
            You haven&apos;t been assigned to any projects yet. Check back later
            or contact your manager.
          </p>
        </div>
      ) : (
        <>
          {/* Active Projects */}
          <section className="space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <PlayCircle className="h-5 w-5 text-purple-500" />
              Active & Planned
            </h2>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {activeProjects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  router={router}
                />
              ))}
              {activeProjects.length === 0 && (
                <p className="text-muted-foreground col-span-full italic">
                  No active projects.
                </p>
              )}
            </div>
          </section>

          {/* Other Projects */}
          {otherProjects.length > 0 && (
            <section className="space-y-4 pt-4 border-t">
              <h2 className="text-lg font-semibold flex items-center gap-2 text-muted-foreground">
                <Clock className="h-5 w-5" />
                Past & On Hold
              </h2>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 opacity-80 hover:opacity-100 transition-opacity">
                {otherProjects.map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    router={router}
                  />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function ProjectCard({ project, router }: { project: Project; router: any }) {
  const StatusIcon = STATUS_CONFIG[project.status].icon;

  return (
    <Card className="flex flex-col hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <Badge
            variant="outline"
            className={STATUS_CONFIG[project.status].color}
          >
            <StatusIcon className="h-3 w-3 mr-1" />
            {STATUS_CONFIG[project.status].label}
          </Badge>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="-mr-2 -mt-2">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => router.push(`/projects/${project.id}`)}
              >
                View Details
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <CardTitle className="line-clamp-1 mt-2">{project.name}</CardTitle>
        <CardDescription className="line-clamp-2 min-h-[2.5rem]">
          {project.description || "No description provided."}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-3">
        <div className="flex items-center justify-between text-sm mb-4">
          <div className="flex flex-col gap-1">
            <span className="text-muted-foreground text-xs">Priority</span>
            <Badge
              variant="outline"
              className={PRIORITY_COLORS[project.priority]}
            >
              {project.priority.charAt(0).toUpperCase() +
                project.priority.slice(1)}
            </Badge>
          </div>
          <div className="flex flex-col gap-1 text-right">
            <span className="text-muted-foreground text-xs">Deadline</span>
            <span className="font-medium">
              {project.endDate
                ? format(new Date(project.endDate), "MMM d, yyyy")
                : "No deadline"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-3 border-t">
          <Avatar className="h-8 w-8">
            <AvatarImage src={project.manager?.avatarUrl || undefined} />
            <AvatarFallback>
              {project.manager?.fullName?.charAt(0) || "M"}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground">Manager</span>
            <span className="text-sm font-medium">
              {project.manager?.fullName || "Unknown"}
            </span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="pt-0">
        <Button
          className="w-full"
          variant="secondary"
          onClick={() => router.push(`/projects/${project.id}`)}
        >
          View Project Workspace
        </Button>
      </CardFooter>
    </Card>
  );
}
