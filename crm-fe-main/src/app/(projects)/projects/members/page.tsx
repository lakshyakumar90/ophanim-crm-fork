"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Search,
  Users2,
  Code,
  Palette,
  FileText,
  TrendingUp,
  FolderKanban,
  Briefcase,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { projectsApi } from "@/lib/api";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDistanceToNowIST } from "@/lib/date-utils";
import {
  ProjectMemberDetailSheet,
  type ProjectMemberDetail,
} from "@/components/projects/ProjectMemberDetailSheet";
import {
  ProjectTeamDetailSheet,
  type ProjectTeamDetail,
} from "@/components/projects/ProjectTeamDetailSheet";
import { ListPageLayout } from "@/components/shared/list-page-layout";

interface ProjectMember {
  id: string;
  userId: string;
  role: string;
  allocationPercentage?: number;
  user: {
    id: string;
    fullName: string;
    avatarUrl: string | null;
    email?: string;
  };
}

interface ProjectItem {
  id: string;
  name: string;
  status: string;
  managerId: string;
  manager?: {
    id: string;
    fullName: string;
    avatarUrl: string | null;
    email?: string;
  };
  members?: ProjectMember[];
  updatedAt: string;
}

// Aggregate member record built from project membership data
interface AggregateMember {
  id: string;
  fullName: string;
  email: string;
  avatarUrl: string | null;
  projectRoles: { projectId: string; projectName: string; role: string }[];
  // The most "senior" project role this person holds across all projects
  primaryRole: string;
}

const ROLE_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  project_manager: {
    label: "Project Manager",
    icon: Briefcase,
    color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  },
  developer: {
    label: "Developer",
    icon: Code,
    color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  },
  seo_specialist: {
    label: "SEO Specialist",
    icon: TrendingUp,
    color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  },
  content_writer: {
    label: "Content Writer",
    icon: FileText,
    color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  },
  designer: {
    label: "Designer",
    icon: Palette,
    color: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300",
  },
};

const ROLE_PRIORITY = ["project_manager", "developer", "designer", "seo_specialist", "content_writer"];

function getRoleConfig(role: string) {
  return ROLE_CONFIG[role] ?? {
    label: role.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" "),
    icon: Users2,
    color: "bg-slate-100 text-slate-700",
  };
}

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

function getRoleLabel(role: string) {
  return getRoleConfig(role).label;
}

export default function GlobalMembersPage() {
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<string>("projects");
  const [selectedProject, setSelectedProject] = useState<ProjectTeamDetail | null>(null);
  const [selectedMember, setSelectedMember] = useState<ProjectMemberDetail | null>(null);
  const [teamSheetOpen, setTeamSheetOpen] = useState(false);
  const [memberSheetOpen, setMemberSheetOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await projectsApi.list();
        setProjects(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Failed to fetch projects", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  // Build an aggregate member map from project data (no separate users API call)
  const aggregateMembers = useMemo<AggregateMember[]>(() => {
    const map = new Map<string, AggregateMember>();

    const upsert = (
      uid: string,
      fullName: string,
      email: string,
      avatarUrl: string | null,
      projectId: string,
      projectName: string,
      role: string,
    ) => {
      const existing = map.get(uid);
      const projectRole = { projectId, projectName, role };
      if (!existing) {
        map.set(uid, { id: uid, fullName, email, avatarUrl, projectRoles: [projectRole], primaryRole: role });
      } else {
        // Avoid duplicate project entries
        if (!existing.projectRoles.some((r) => r.projectId === projectId && r.role === role)) {
          existing.projectRoles.push(projectRole);
        }
        // Update primary role if this one is more senior
        const existingPriority = ROLE_PRIORITY.indexOf(existing.primaryRole);
        const newPriority = ROLE_PRIORITY.indexOf(role);
        if (newPriority !== -1 && (existingPriority === -1 || newPriority < existingPriority)) {
          existing.primaryRole = role;
        }
      }
    };

    for (const project of projects) {
      // Project manager from manager_id field
      if (project.manager) {
        upsert(
          project.manager.id,
          project.manager.fullName,
          project.manager.email || "",
          project.manager.avatarUrl,
          project.id,
          project.name,
          "project_manager",
        );
      }
      // Members
      if (project.members) {
        for (const m of project.members) {
          if (!m.user) continue;
          // Skip if this is already the manager_id user — will be added above as project_manager
          const isManager = project.manager?.id === m.user.id;
          const role = isManager ? "project_manager" : m.role;
          upsert(
            m.user.id,
            m.user.fullName,
            m.user.email || "",
            m.user.avatarUrl,
            project.id,
            project.name,
            role,
          );
        }
      }
    }

    return Array.from(map.values()).sort((a, b) => a.fullName.localeCompare(b.fullName));
  }, [projects]);

  // Group members by primary role for role-based tabs
  const membersByRole = useMemo(() => {
    const groups: Record<string, AggregateMember[]> = {};
    for (const m of aggregateMembers) {
      const key = m.primaryRole || "other";
      if (!groups[key]) groups[key] = [];
      groups[key].push(m);
    }
    return groups;
  }, [aggregateMembers]);

  const roleTabKeys = useMemo(
    () => Object.keys(membersByRole).sort((a, b) => ROLE_PRIORITY.indexOf(a) - ROLE_PRIORITY.indexOf(b)),
    [membersByRole],
  );

  const filterMembers = (list: AggregateMember[]) =>
    list.filter(
      (u) =>
        u.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchQuery.toLowerCase()),
    );

  const filterProjects = (list: ProjectItem[]) =>
    list.filter((p) => p.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const filteredProjects = filterProjects(projects);
  const filteredAllMembers = filterMembers(aggregateMembers);

  const openMemberSheet = (member: AggregateMember) => {
    setSelectedMember({
      id: member.id,
      fullName: member.fullName,
      email: member.email,
      avatarUrl: member.avatarUrl,
      primaryRole: member.primaryRole,
      projectRoles: member.projectRoles,
    });
    setMemberSheetOpen(true);
  };

  const openMemberById = (userId: string) => {
    const member = aggregateMembers.find((m) => m.id === userId);
    if (member) openMemberSheet(member);
  };

  const renderMemberCard = (member: AggregateMember) => {
    const config = getRoleConfig(member.primaryRole);
    const Icon = config.icon;

    return (
      <Card
        key={member.id}
        className="hover:shadow-md transition-shadow flex flex-col cursor-pointer"
        onClick={() => openMemberSheet(member)}
      >
        <CardHeader className="pb-2">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={member.avatarUrl || undefined} />
              <AvatarFallback>{getInitials(member.fullName || "U")}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base truncate">{member.fullName}</CardTitle>
              <p className="text-sm text-muted-foreground truncate">{member.email}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0 flex-1 space-y-2">
          <Badge variant="outline" className={`${config.color} gap-1 text-xs`}>
            <Icon className="h-3 w-3" />
            {config.label}
          </Badge>

          {member.projectRoles.length > 0 && (
            <div className="space-y-1 pt-1.5 border-t">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                Project Assignments
              </p>
              <div className="flex flex-col gap-1">
                {member.projectRoles.slice(0, 3).map((pr) => (
                  <div
                    key={`${pr.projectId}-${pr.role}`}
                    className="flex items-center justify-between gap-2 bg-muted/50 rounded-md px-2 py-1"
                  >
                    <span className="text-xs font-medium truncate max-w-[120px]">{pr.projectName}</span>
                    <span className="text-[10px] text-muted-foreground shrink-0">{getRoleLabel(pr.role)}</span>
                  </div>
                ))}
                {member.projectRoles.length > 3 && (
                  <p className="text-[10px] text-muted-foreground pl-1">
                    +{member.projectRoles.length - 3} more
                  </p>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <>
    <ListPageLayout
      className="p-3 lg:p-4"
      title="Teams & Members"
      description="Project team members across all your projects"
      icon={<Users2 className="h-4 w-4" />}
      breadcrumbs={[
        { label: "Projects", href: "/projects" },
        { label: "Members" },
      ]}
      filters={
        <div className="relative max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={activeTab === "projects" ? "Search projects..." : "Search members..."}
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      }
    >
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4 flex-wrap h-auto gap-1">
              <TabsTrigger value="projects">
                <FolderKanban className="h-4 w-4 mr-1.5" />
                Project Teams ({projects.length})
              </TabsTrigger>
              <TabsTrigger value="all">
                <Users2 className="h-4 w-4 mr-1.5" />
                All Members ({aggregateMembers.length})
              </TabsTrigger>
              {roleTabKeys.map((role) => {
                const config = getRoleConfig(role);
                const Icon = config.icon;
                return (
                  <TabsTrigger key={role} value={role} className="hidden md:flex">
                    <Icon className="h-4 w-4 mr-1" />
                    {config.label}s ({membersByRole[role]?.length ?? 0})
                  </TabsTrigger>
                );
              })}
            </TabsList>

            {/* Project Teams tab */}
            <TabsContent value="projects" className="space-y-4">
              {filteredProjects.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
                  <FolderKanban className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p className="font-medium">No projects found</p>
                  <p className="text-sm mt-1">You haven't been assigned to any projects yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredProjects.map((project) => {
                    const totalMembers = (project.members?.length ?? 0) + (project.manager ? 1 : 0);
                    return (
                      <Card
                        key={project.id}
                        className="flex flex-col hover:shadow-md transition-shadow cursor-pointer"
                        onClick={() => {
                          setSelectedProject(project);
                          setTeamSheetOpen(true);
                        }}
                      >
                        <CardHeader className="pb-3">
                          <div className="flex justify-between items-start gap-2">
                            <div className="min-w-0">
                              <CardTitle className="text-base truncate">{project.name}</CardTitle>
                              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                <Badge variant="secondary" className="text-xs capitalize">
                                  {project.status.replace(/_/g, " ")}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {formatDistanceToNowIST(project.updatedAt, { addSuffix: true })}
                                </span>
                              </div>
                            </div>
                            {project.manager && (
                              <div className="flex items-center gap-1.5 bg-muted/50 px-2 py-1 rounded-full shrink-0">
                                <Avatar className="h-5 w-5">
                                  <AvatarImage src={project.manager.avatarUrl || undefined} />
                                  <AvatarFallback className="text-[9px]">
                                    {getInitials(project.manager.fullName)}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-xs font-medium max-w-[70px] truncate">
                                  {project.manager.fullName}
                                </span>
                              </div>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent className="flex-1 pt-0">
                          <div className="space-y-2">
                            <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                              <Users2 className="h-3.5 w-3.5" />
                              {totalMembers} team member{totalMembers !== 1 ? "s" : ""}
                            </p>
                            {!project.members || project.members.length === 0 ? (
                              <p className="text-xs text-muted-foreground italic">No additional members</p>
                            ) : (
                              <div className="flex flex-wrap gap-1.5">
                                {project.members.filter((m) => m.user).map((member) => {
                                  const config = getRoleConfig(member.role);
                                  return (
                                    <div
                                      key={member.id || member.userId}
                                      className="flex items-center gap-1.5 bg-background border px-2 py-1 rounded-md text-xs"
                                      title={`${member.user.fullName} — ${getRoleLabel(member.role)}`}
                                    >
                                      <Avatar className="h-5 w-5">
                                        <AvatarImage src={member.user.avatarUrl || undefined} />
                                        <AvatarFallback className="text-[9px]">
                                          {getInitials(member.user.fullName)}
                                        </AvatarFallback>
                                      </Avatar>
                                      <div className="flex flex-col leading-none">
                                        <span className="font-medium truncate max-w-[80px]">
                                          {member.user.fullName}
                                        </span>
                                        <span className={`text-[9px] mt-0.5 rounded px-1 py-0.5 w-fit ${config.color}`}>
                                          {getRoleLabel(member.role)}
                                        </span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            {/* All Members tab */}
            <TabsContent value="all">
              {filteredAllMembers.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
                  <Users2 className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p className="font-medium">
                    {searchQuery ? "No members match your search" : "No project members yet"}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {filteredAllMembers.map(renderMemberCard)}
                </div>
              )}
            </TabsContent>

            {/* Role-specific tabs */}
            {roleTabKeys.map((role) => {
              const list = filterMembers(membersByRole[role] ?? []);
              const config = getRoleConfig(role);
              const Icon = config.icon;
              return (
                <TabsContent key={role} value={role}>
                  {list.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-40 text-center text-muted-foreground">
                      <Icon className="w-8 h-8 mb-2 opacity-20" />
                      <p>{searchQuery ? `No ${config.label}s match your search` : `No ${config.label}s assigned`}</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {list.map(renderMemberCard)}
                    </div>
                  )}
                </TabsContent>
              );
            })}
          </Tabs>
        )}
    </ListPageLayout>

      <ProjectTeamDetailSheet
        project={selectedProject}
        open={teamSheetOpen}
        onOpenChange={setTeamSheetOpen}
        onMemberClick={(userId) => {
          setTeamSheetOpen(false);
          openMemberById(userId);
        }}
      />

      <ProjectMemberDetailSheet
        member={selectedMember}
        open={memberSheetOpen}
        onOpenChange={setMemberSheetOpen}
      />
    </>
  );
}
