"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Plus,
  Search,
  Filter,
  FolderKanban,
  Users2,
  Clock,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  RefreshCw,
  X,
  ChevronDown,
  ChevronUp,
  Calendar,
} from "lucide-react";
import { ProjectCard } from "@/components/projects/project-card";
import { CreateProjectModal } from "@/components/projects/create-project-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { projectsApi, type ProjectStats } from "@/lib/projects-api";
import type { Project } from "@/types";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useAuth, useIsAdmin, useIsManager } from "@/providers/auth-provider";

export default function ProjectsPage() {
  const { user } = useAuth();
  const isAdmin = useIsAdmin();
  const isManager = useIsManager();

  const [projects, setProjects] = useState<Project[]>([]);
  const [idleProjects, setIdleProjects] = useState<Project[]>([]);
  const [stats, setStats] = useState<ProjectStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<string>("all");

  // Advanced filters
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [managerFilter, setManagerFilter] = useState<string>("all");
  const [dateRangeFilter, setDateRangeFilter] = useState<string>("all");

  const fetchProjects = async () => {
    setIsLoading(true);
    try {
      const [projectsData, statsData] = await Promise.all([
        projectsApi.list(),
        projectsApi.getStats(),
      ]);

      setProjects(Array.isArray(projectsData) ? projectsData : []);
      if (statsData) {
        setStats(statsData);
      }

      // Fetch idle projects only for admin
      if (isAdmin) {
        try {
          const idleData = await projectsApi.getIdleProjects();
          if (Array.isArray(idleData)) {
            setIdleProjects(idleData);
          }
        } catch {
          // Idle projects endpoint might fail for non-admin
        }
      }
    } catch (error) {
      console.error("Failed to fetch projects", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  // Get unique managers for filter dropdown
  const managerOptions = useMemo(() => {
    const managers = new Map<string, { id: string; name: string }>();
    projects.forEach((p) => {
      if (p.manager) {
        managers.set(p.manager.id, {
          id: p.manager.id,
          name: p.manager.fullName,
        });
      }
    });
    return Array.from(managers.values()).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }, [projects]);

  // Check if any advanced filters are active
  const hasActiveFilters =
    priorityFilter !== "all" ||
    managerFilter !== "all" ||
    dateRangeFilter !== "all";

  const clearFilters = () => {
    setPriorityFilter("all");
    setManagerFilter("all");
    setDateRangeFilter("all");
  };

  // Apply all filters
  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      // Search filter - includes name, client, and description
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch =
        searchQuery === "" ||
        p.name.toLowerCase().includes(searchLower) ||
        (p.clientName && p.clientName.toLowerCase().includes(searchLower)) ||
        (p.description && p.description.toLowerCase().includes(searchLower));

      // Priority filter
      const matchesPriority =
        priorityFilter === "all" || p.priority === priorityFilter;

      // Manager filter
      const matchesManager =
        managerFilter === "all" || p.managerId === managerFilter;

      // Date range filter
      let matchesDateRange = true;
      if (dateRangeFilter !== "all" && p.startDate) {
        const startDate = new Date(p.startDate);
        const now = new Date();

        switch (dateRangeFilter) {
          case "this_month":
            matchesDateRange =
              startDate.getMonth() === now.getMonth() &&
              startDate.getFullYear() === now.getFullYear();
            break;
          case "last_month": {
            const lastMonth = new Date(
              now.getFullYear(),
              now.getMonth() - 1,
              1,
            );
            matchesDateRange =
              startDate.getMonth() === lastMonth.getMonth() &&
              startDate.getFullYear() === lastMonth.getFullYear();
            break;
          }
          case "this_quarter": {
            const currentQuarter = Math.floor(now.getMonth() / 3);
            const projectQuarter = Math.floor(startDate.getMonth() / 3);
            matchesDateRange =
              projectQuarter === currentQuarter &&
              startDate.getFullYear() === now.getFullYear();
            break;
          }
          case "this_year":
            matchesDateRange = startDate.getFullYear() === now.getFullYear();
            break;
        }
      }

      return (
        matchesSearch && matchesPriority && matchesManager && matchesDateRange
      );
    });
  }, [projects, searchQuery, priorityFilter, managerFilter, dateRangeFilter]);

  const filterByStatus = (status: string) => {
    if (status === "all") return filteredProjects;
    if (status === "idle")
      return idleProjects.filter((p) =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()),
      );
    return filteredProjects.filter((p) => p.status === status);
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const statsCards = [
    {
      label: "Total Projects",
      value: stats?.total || 0,
      icon: FolderKanban,
      color: "text-blue-600 bg-blue-100",
    },
    {
      label: "Active",
      value: stats?.active || 0,
      icon: TrendingUp,
      color: "text-green-600 bg-green-100",
    },
    {
      label: "Completed",
      value: stats?.completed || 0,
      icon: CheckCircle,
      color: "text-emerald-600 bg-emerald-100",
    },
    {
      label: "On Hold",
      value: stats?.onHold || 0,
      icon: Clock,
      color: "text-orange-600 bg-orange-100",
    },
  ];

  if (isAdmin && stats) {
    statsCards.push({
      label: "Idle",
      value: stats.idle || 0,
      icon: AlertTriangle,
      color: "text-red-600 bg-red-100",
    });
  }

  return (
    <div className="flex flex-col h-full bg-background overflow-y-auto">
      {/* Header */}
      <div className="flex flex-col gap-4 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Projects Dashboard
            </h1>
            <p className="text-muted-foreground">
              {isAdmin
                ? "Overview of all projects and team performance"
                : isManager
                  ? "Your projects and team performance"
                  : "Your assigned projects"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={fetchProjects}
              disabled={isLoading}
            >
              <RefreshCw
                className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`}
              />
            </Button>
            {isManager && (
              <CreateProjectModal onSuccess={fetchProjects}>
                <Button className="gap-2">
                  <Plus className="w-4 h-4" /> New Project
                </Button>
              </CreateProjectModal>
            )}
          </div>
        </div>

        {/* Search and Filters */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, client, or description..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={hasActiveFilters ? "border-primary text-primary" : ""}
            >
              <Filter className="w-4 h-4 mr-2" />
              Filters
              {hasActiveFilters && (
                <Badge variant="secondary" className="ml-2 h-5 px-1.5">
                  {
                    [priorityFilter, managerFilter, dateRangeFilter].filter(
                      (f) => f !== "all",
                    ).length
                  }
                </Badge>
              )}
              {showAdvancedFilters ? (
                <ChevronUp className="w-4 h-4 ml-1" />
              ) : (
                <ChevronDown className="w-4 h-4 ml-1" />
              )}
            </Button>
          </div>

          {/* Advanced Filters Panel */}
          <Collapsible open={showAdvancedFilters}>
            <CollapsibleContent>
              <div className="flex flex-wrap items-center gap-3 pt-2 pb-1">
                {/* Priority Filter */}
                <Select
                  value={priorityFilter}
                  onValueChange={setPriorityFilter}
                >
                  <SelectTrigger className="w-[130px]">
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priorities</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>

                {/* Manager Filter */}
                <Select value={managerFilter} onValueChange={setManagerFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Project Manager" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Managers</SelectItem>
                    {managerOptions.map((manager) => (
                      <SelectItem key={manager.id} value={manager.id}>
                        {manager.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Date Range Filter */}
                <Select
                  value={dateRangeFilter}
                  onValueChange={setDateRangeFilter}
                >
                  <SelectTrigger className="w-[150px]">
                    <Calendar className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Start Date" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="this_month">This Month</SelectItem>
                    <SelectItem value="last_month">Last Month</SelectItem>
                    <SelectItem value="this_quarter">This Quarter</SelectItem>
                    <SelectItem value="this_year">This Year</SelectItem>
                  </SelectContent>
                </Select>

                {/* Clear Filters */}
                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Clear
                  </Button>
                )}
              </div>

              {/* Active Filter Chips */}
              {hasActiveFilters && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {priorityFilter !== "all" && (
                    <Badge variant="secondary" className="gap-1">
                      Priority: {priorityFilter}
                      <X
                        className="h-3 w-3 cursor-pointer"
                        onClick={() => setPriorityFilter("all")}
                      />
                    </Badge>
                  )}
                  {managerFilter !== "all" && (
                    <Badge variant="secondary" className="gap-1">
                      Manager:{" "}
                      {managerOptions.find((m) => m.id === managerFilter)?.name}
                      <X
                        className="h-3 w-3 cursor-pointer"
                        onClick={() => setManagerFilter("all")}
                      />
                    </Badge>
                  )}
                  {dateRangeFilter !== "all" && (
                    <Badge variant="secondary" className="gap-1">
                      Started: {dateRangeFilter.replace("_", " ")}
                      <X
                        className="h-3 w-3 cursor-pointer"
                        onClick={() => setDateRangeFilter("all")}
                      />
                    </Badge>
                  )}
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 pb-6 space-y-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {statsCards.map((stat, i) => (
                <Card key={i} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className={`p-3 rounded-lg ${stat.color}`}>
                      <stat.icon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{stat.value}</p>
                      <p className="text-xs text-muted-foreground font-medium">
                        {stat.label}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Admin: PM Breakdown */}
            {isAdmin && stats && stats.byManager.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users2 className="h-5 w-5" />
                    Project Managers Overview
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {stats.byManager.map((pm) => (
                      <div
                        key={pm.managerId}
                        className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted/80 transition-colors"
                        onClick={() => setManagerFilter(pm.managerId)}
                      >
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={pm.managerAvatar || undefined} />
                          <AvatarFallback>
                            {getInitials(pm.managerName)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">
                            {pm.managerName}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{pm.projectCount} projects</span>
                            <span>•</span>
                            <span className="text-green-600">
                              {pm.activeCount} active
                            </span>
                            <span>•</span>
                            <span className="text-emerald-600">
                              {pm.completedCount} done
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Admin: Idle Projects Warning */}
            {isAdmin && idleProjects.length > 0 && (
              <Card className="border-orange-200 bg-orange-50/50 dark:bg-orange-950/20 dark:border-orange-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-orange-700 dark:text-orange-400">
                    <AlertTriangle className="h-5 w-5" />
                    Idle Projects ({idleProjects.length})
                    <Badge
                      variant="outline"
                      className="ml-2 text-orange-600 border-orange-300"
                    >
                      No activity for 7+ days
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {idleProjects.slice(0, 6).map((project) => (
                      <ProjectCard key={project.id} project={project} />
                    ))}
                  </div>
                  {idleProjects.length > 6 && (
                    <p className="text-sm text-muted-foreground mt-4 text-center">
                      + {idleProjects.length - 6} more idle projects
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Projects Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="all">
                  All ({filteredProjects.length})
                </TabsTrigger>
                <TabsTrigger value="in_progress">
                  Active ({filterByStatus("in_progress").length})
                </TabsTrigger>
                <TabsTrigger value="planned">
                  Planned ({filterByStatus("planned").length})
                </TabsTrigger>
                <TabsTrigger value="completed">
                  Completed ({filterByStatus("completed").length})
                </TabsTrigger>
                <TabsTrigger value="on_hold">
                  On Hold ({filterByStatus("on_hold").length})
                </TabsTrigger>
              </TabsList>

              {["all", "in_progress", "planned", "completed", "on_hold"].map(
                (status) => (
                  <TabsContent key={status} value={status}>
                    {filterByStatus(status).length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-64 text-center border-2 border-dashed rounded-lg border-muted-foreground/25">
                        <div className="bg-muted/50 p-4 rounded-full mb-3">
                          <FolderKanban className="w-6 h-6 text-muted-foreground" />
                        </div>
                        <h3 className="text-lg font-semibold">
                          No projects found
                        </h3>
                        <p className="text-muted-foreground max-w-sm mt-1 mb-4">
                          {searchQuery || hasActiveFilters
                            ? "Try adjusting your search or filters"
                            : status === "all"
                              ? "Get started by creating your first project"
                              : `No ${status.replace(/_/g, " ")} projects`}
                        </p>
                        {(searchQuery || hasActiveFilters) && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSearchQuery("");
                              clearFilters();
                            }}
                          >
                            Clear all filters
                          </Button>
                        )}
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mt-4">
                        {filterByStatus(status).map((project) => (
                          <ProjectCard key={project.id} project={project} />
                        ))}
                      </div>
                    )}
                  </TabsContent>
                ),
              )}
            </Tabs>
          </>
        )}
      </div>
    </div>
  );
}
