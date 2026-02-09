"use client";

import { useEffect, useState } from "react";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { usersApi, projectsApi } from "@/lib/api";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDistanceToNowIST } from "@/lib/date-utils";

interface TeamMember {
  id: string;
  fullName: string;
  email: string;
  role: string;
  avatarUrl?: string | null;
  jobTitle?: string | null;
}

interface ProjectMember {
  id: string;
  userId: string;
  role: string;
  user: {
    id: string;
    fullName: string;
    avatarUrl: string | null;
  };
}

interface Project {
  id: string;
  name: string;
  status: string;
  managerId: string;
  manager?: {
    id: string;
    fullName: string;
    avatarUrl: string | null;
  };
  members?: ProjectMember[];
  updatedAt: string;
}

const JOB_TITLE_CONFIG = {
  developer: {
    label: "Developers",
    icon: Code,
    color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  },
  seo_specialist: {
    label: "SEO Specialists",
    icon: TrendingUp,
    color:
      "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  },
  content_writer: {
    label: "Content Writers",
    icon: FileText,
    color:
      "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  },
  designer: {
    label: "Designers",
    icon: Palette,
    color:
      "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  },
};

type JobTitleKey = keyof typeof JOB_TITLE_CONFIG;

export default function ProjectResourcesPage() {
  const [members, setMembers] = useState<Record<JobTitleKey, TeamMember[]>>({
    developer: [],
    seo_specialist: [],
    content_writer: [],
    designer: [],
  });
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<string>("projects");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [devRes, seoRes, contentRes, designRes, projectsRes] =
          await Promise.all([
            usersApi.getByJobTitle(["developer"]),
            usersApi.getByJobTitle(["seo_specialist"]),
            usersApi.getByJobTitle(["content_writer"]),
            usersApi.getByJobTitle(["designer"]),
            projectsApi.list(),
          ]);

        setMembers({
          developer: Array.isArray(devRes) ? devRes : [],
          seo_specialist: Array.isArray(seoRes) ? seoRes : [],
          content_writer: Array.isArray(contentRes) ? contentRes : [],
          designer: Array.isArray(designRes) ? designRes : [],
        });

        setProjects(Array.isArray(projectsRes) ? projectsRes : []);
      } catch (error) {
        console.error("Failed to fetch data", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const filterMembers = (list: TeamMember[]) =>
    list.filter(
      (u) =>
        u.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchQuery.toLowerCase()),
    );

  const filterProjects = (list: Project[]) =>
    list.filter((p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()),
    );

  const allMembers = Object.entries(members).flatMap(([jobTitle, list]) =>
    list.map((m) => ({ ...m, jobTitle })),
  );

  const filteredAll = filterMembers(allMembers);
  const filteredProjects = filterProjects(projects);

  const totalCount = Object.values(members).reduce(
    (acc, list) => acc + list.length,
    0,
  );

  const renderMemberCard = (member: TeamMember, jobTitle?: string | null) => {
    const config = jobTitle
      ? JOB_TITLE_CONFIG[jobTitle as JobTitleKey]
      : undefined;
    const Icon = config?.icon || Users2;

    return (
      <Card key={member.id} className="hover:shadow-md transition-shadow">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={member.avatarUrl || undefined} />
              <AvatarFallback>
                {getInitials(member.fullName || "U")}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base truncate">
                {member.fullName}
              </CardTitle>
              <p className="text-sm text-muted-foreground truncate">
                {member.email}
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0 flex items-center gap-2">
          {config && (
            <Badge variant="outline" className={`${config.color} gap-1`}>
              <Icon className="h-3 w-3" />
              {config.label.replace(/s$/, "")}
            </Badge>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex flex-col gap-4 p-6 bg-background/50 backdrop-blur-sm border-b sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Teams & Resources
            </h1>
            <p className="text-muted-foreground">
              Manage project teams and potential resources
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={
                activeTab === "projects"
                  ? "Search projects..."
                  : "Search team members..."
              }
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-6 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="projects">
                <FolderKanban className="h-4 w-4 mr-2" />
                Project Teams ({projects.length})
              </TabsTrigger>
              <TabsTrigger value="all">
                <Users2 className="h-4 w-4 mr-2" />
                All Resources ({totalCount})
              </TabsTrigger>
              {Object.entries(JOB_TITLE_CONFIG).map(([key, config]) => (
                <TabsTrigger key={key} value={key} className="hidden md:flex">
                  <config.icon className="h-4 w-4 mr-1" />
                  {config.label}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="projects" className="space-y-4">
              {filteredProjects.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
                  <FolderKanban className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
                  <p>No projects found</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredProjects.map((project) => (
                    <Card key={project.id} className="flex flex-col">
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-lg">
                              {project.name}
                            </CardTitle>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="secondary" className="text-xs">
                                {project.status.replace(/_/g, " ")}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {formatDistanceToNowIST(project.updatedAt, {
                                  addSuffix: true,
                                })}
                              </span>
                            </div>
                          </div>
                          {project.manager && (
                            <div className="flex items-center gap-2 bg-muted/50 px-2 py-1 rounded-full">
                              <Avatar className="h-6 w-6">
                                <AvatarImage
                                  src={project.manager.avatarUrl || undefined}
                                />
                                <AvatarFallback className="text-[10px]">
                                  {getInitials(project.manager.fullName)}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-xs font-medium max-w-[80px] truncate">
                                {project.manager.fullName}
                              </span>
                            </div>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="flex-1">
                        <div className="space-y-3">
                          <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <Users2 className="h-4 w-4" /> Team Members
                          </h4>
                          {!project.members || project.members.length === 0 ? (
                            <p className="text-sm text-muted-foreground italic">
                              No members assigned
                            </p>
                          ) : (
                            <div className="flex flex-wrap gap-2">
                              {project.members
                                .filter((m) => m.user) // Ensure user object exists
                                .map((member) => (
                                  <div
                                    key={member.id}
                                    className="flex items-center gap-2 bg-background border px-2 py-1 rounded-md shadow-sm"
                                  >
                                    <Avatar className="h-6 w-6">
                                      <AvatarImage
                                        src={member.user.avatarUrl || undefined}
                                      />
                                      <AvatarFallback className="text-[10px]">
                                        {getInitials(member.user.fullName)}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div className="flex flex-col">
                                      <span className="text-xs font-medium leading-none">
                                        {member.user.fullName}
                                      </span>
                                      <span className="text-[10px] text-muted-foreground leading-none mt-0.5">
                                        {member.role || "Member"}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="all">
              {filteredAll.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No members match your search.
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {filteredAll.map((member) =>
                    renderMemberCard(member, member.jobTitle),
                  )}
                </div>
              )}
            </TabsContent>

            {Object.entries(JOB_TITLE_CONFIG).map(([key, config]) => (
              <TabsContent key={key} value={key}>
                {filterMembers(members[key as JobTitleKey]).length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-40 text-center">
                    <config.icon className="w-8 h-8 text-muted-foreground mb-2" />
                    <p className="text-muted-foreground">
                      {searchQuery
                        ? `No ${config.label.toLowerCase()} match your search.`
                        : `No ${config.label.toLowerCase()} assigned yet.`}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filterMembers(members[key as JobTitleKey]).map((member) =>
                      renderMemberCard(member, key),
                    )}
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        )}
      </div>
    </div>
  );
}
