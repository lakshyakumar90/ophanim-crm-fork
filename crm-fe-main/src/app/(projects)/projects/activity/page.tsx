"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import useSWR, { mutate } from "swr";
import { activitiesApi } from "@/lib/api";
import { useAuth } from "@/providers/auth-provider";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Search,
  Activity,
  User,
  Target,
  CheckSquare,
  Settings,
  Clock,
  Plus,
  Edit,
  Trash,
  LogIn,
  LogOut,
  ArrowRightLeft,
  RefreshCw,
  CheckCircle,
  ShieldAlert,
  UserPlus,
  UserCheck,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import { formatDistanceToNowIST, formatIST } from "@/lib/date-utils";
import { useHeaderRefresh } from "@/hooks/use-header-refresh";

// --- Types & Constants (Reused) ---

interface ActivityLog {
  id: string;
  user_id: string;
  lead_id: string;
  activity_type: string;
  title: string;
  description: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  entity_type?: string;
  entity_id?: string;
  project_id?: string;
  user?: {
    id: string;
    full_name: string;
    email: string;
    avatar_url: string | null;
  };
  lead?: {
    id: string;
    lead_name: string;
    lead_id?: string;
  };
}

const actionIcons: Record<string, React.ElementType> = {
  create: Plus,
  update: Edit,
  delete: Trash,
  login: LogIn,
  logout: LogOut,
  assign: ArrowRightLeft,
  reassign: ArrowRightLeft,
  status_change: RefreshCw,
  clock_in: LogIn,
  clock_out: LogOut,
  complete: CheckCircle,
  bulk_update: Edit,
};

const actionColors: Record<string, string> = {
  create: "bg-emerald-100 text-emerald-700",
  update: "bg-blue-100 text-blue-700",
  delete: "bg-red-100 text-red-700",
  login: "bg-green-100 text-green-700",
  logout: "bg-slate-100 text-slate-700",
  assign: "bg-violet-100 text-violet-700",
  reassign: "bg-violet-100 text-violet-700",
  status_change: "bg-orange-100 text-orange-700",
  clock_in: "bg-green-100 text-green-700",
  clock_out: "bg-amber-100 text-amber-700",
  complete: "bg-emerald-100 text-emerald-700",
  bulk_update: "bg-indigo-100 text-indigo-700",
};

// Format camelCase or snake_case to readable labels
const formatFieldName = (field: string): string => {
  return field
    .replace(/_/g, " ")
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
};

// Format values for display
const formatValue = (value: unknown): string => {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "object") {
    if (Array.isArray(value)) return value.join(", ") || "—";
    return JSON.stringify(value);
  }
  return String(value);
};

// Get changes from metadata
const getChangesFromMetadata = (
  metadata: Record<string, unknown> | null,
  activityType: string,
): Array<{ field: string; oldVal: string; newVal: string }> => {
  const changes: Array<{ field: string; oldVal: string; newVal: string }> = [];

  if (!metadata) return changes;

  if (activityType === "status_change") {
    const fromStatus = metadata.from_status as string;
    const toStatus = metadata.to_status as string;
    if (fromStatus || toStatus) {
      changes.push({
        field: "Status",
        oldVal: formatValue(fromStatus),
        newVal: formatValue(toStatus),
      });
    }
  } else {
    Object.entries(metadata).forEach(([key, val]) => {
      if (val !== null && val !== undefined) {
        changes.push({
          field: formatFieldName(key),
          oldVal: "",
          newVal: formatValue(val),
        });
      }
    });
  }

  return changes;
};

export default function ProjectActivityPage() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [resourceType, setResourceType] = useState("project");
  const [expandedActivities, setExpandedActivities] = useState<Set<string>>(
    new Set(),
  );

  // Instead of using useDepartment(), effectively get the departmentId if available on the user
  // For PMs, `user.departmentId` or the team info should be relevant.
  // Assuming `user.departmentId` is populated if they are in a department.
  const departmentId = user?.departmentId;

  const { data, isLoading, error } = useSWR(
    user ? ["projectActivities", resourceType, departmentId] : null,
    () =>
      activitiesApi
        .list({
          limit: 100,
          resourceType: resourceType !== "all" ? resourceType : undefined,
          departmentId: departmentId || undefined, // Filter by the user's department
        })
  );

  // NOTE: Stats might fail if the user is not technically an "admin".
  // The backend might need adjustment if getStats is restricted to admin-only.
  // Assuming it allows department-based stats for managers.
  const { data: statsData } = useSWR(
    user ? ["projectActivityStats", departmentId] : null,
    () =>
      activitiesApi.getStats({
        departmentId: departmentId || undefined,
        resourceType: "project",
      }),
  );

  const refreshProjectActivity = useCallback(async () => {
    await Promise.all([
      mutate(["projectActivities", resourceType, departmentId]),
      mutate(["projectActivityStats", departmentId]),
    ]);
  }, [departmentId, resourceType]);

  useHeaderRefresh({
    onRefresh: refreshProjectActivity,
    enabled: Boolean(user),
  });

  const activities: ActivityLog[] = data?.data || [];

  const filteredActivities = activities.filter((activity) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      activity.user?.full_name?.toLowerCase().includes(searchLower) ||
      activity.user?.email?.toLowerCase().includes(searchLower) ||
      activity.activity_type?.toLowerCase().includes(searchLower) ||
      activity.title?.toLowerCase().includes(searchLower) ||
      activity.lead?.lead_name?.toLowerCase().includes(searchLower)
    );
  });

  const getActionIcon = (activityType: string) => {
    return actionIcons[activityType] || Activity;
  };

  const formatActivityDescription = (activity: ActivityLog) => {
    if (activity.title) return activity.title;
    const action = (activity.activity_type || "activity").replace(/_/g, " ");
    return action;
  };

  if (isLoading && !data) {
    return (
      <div className="p-8">
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center text-red-500">
          Failed to load activities. Please check your permissions.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Project Activity
          </h1>
          <p className="text-slate-600">Recent activity across projects</p>
        </div>
        <Badge variant="secondary" className="text-lg px-3 py-1">
          {activities.length} Activities
        </Badge>
      </div>

      {statsData && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-lg bg-red-50 text-red-600">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">
                  {statsData.totalActivities || 0}
                </p>
                <p className="text-xs text-slate-500 font-medium">
                  Total Activities
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-lg bg-blue-50 text-blue-600">
                <CheckSquare className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">
                  {statsData.tasksDone || 0}
                </p>
                <p className="text-xs text-slate-500 font-medium">
                  Tasks Completed
                </p>
              </div>
            </CardContent>
          </Card>
          {/* Add more relevant stats for projects if available */}
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search by user or action..."
                className="pl-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={resourceType} onValueChange={setResourceType}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Resource Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="project">Projects</SelectItem>
                <SelectItem value="task">Tasks</SelectItem>
                <SelectItem value="all">All Resources</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Activity List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Recent Activities
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredActivities.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Activity className="h-12 w-12 mx-auto mb-4 text-slate-300" />
              <p>No activities found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredActivities.map((activity) => {
                const ActionIcon = getActionIcon(activity.activity_type);
                const colorClass =
                  actionColors[activity.activity_type] ||
                  "bg-slate-100 text-slate-700";
                const isExpanded = expandedActivities.has(activity.id);
                const changes = getChangesFromMetadata(
                  activity.metadata,
                  activity.activity_type,
                );
                const hasChanges = changes.length > 0;

                const toggleExpanded = () => {
                  setExpandedActivities((prev) => {
                    const next = new Set(prev);
                    if (next.has(activity.id)) {
                      next.delete(activity.id);
                    } else {
                      next.add(activity.id);
                    }
                    return next;
                  });
                };

                return (
                  <div
                    key={activity.id}
                    className="bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    <div className="flex items-start gap-4 p-4">
                      <div
                        className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${
                          colorClass.split(" ")[0]
                        }`}
                      >
                        <ActionIcon
                          className={`h-5 w-5 ${colorClass.split(" ")[1]}`}
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <Avatar className="h-6 w-6">
                            <AvatarImage
                              src={activity.user?.avatar_url || ""}
                            />
                            <AvatarFallback className="text-xs">
                              {activity.user?.full_name?.[0] || "U"}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium text-slate-900">
                            {activity.user?.full_name || "Unknown User"}
                          </span>
                          <span className="text-slate-500">
                            {formatActivityDescription(activity)}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 text-sm flex-wrap">
                          {activity.lead && (
                            <Link href={`/leads/${activity.lead.id || activity.lead_id}`}>
                              <Badge
                                variant="outline"
                                className="flex items-center gap-1 cursor-pointer hover:bg-accent transition-colors"
                              >
                                <Target className="h-3 w-3" />
                                {activity.lead.lead_name}
                                <ExternalLink className="h-2.5 w-2.5 opacity-60" />
                              </Badge>
                            </Link>
                          )}
                          {activity.entity_type === "project" && activity.entity_id && (
                            <Link href={`/projects/${activity.entity_id}/overview`}>
                              <Badge
                                variant="outline"
                                className="flex items-center gap-1 cursor-pointer hover:bg-accent transition-colors"
                              >
                                <ExternalLink className="h-3 w-3" />
                                View Project
                              </Badge>
                            </Link>
                          )}
                          {activity.entity_type === "task" && activity.entity_id && activity.project_id && (
                            <Link href={`/projects/${activity.project_id}/tasks`}>
                              <Badge
                                variant="outline"
                                className="flex items-center gap-1 cursor-pointer hover:bg-accent transition-colors"
                              >
                                <ExternalLink className="h-3 w-3" />
                                View Task
                              </Badge>
                            </Link>
                          )}
                          {hasChanges && (
                            <button
                              onClick={toggleExpanded}
                              className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors"
                            >
                              {isExpanded ? (
                                <>
                                  <ChevronUp className="h-3 w-3" />
                                  Hide Changes
                                </>
                              ) : (
                                <>
                                  <ChevronDown className="h-3 w-3" />
                                  View Changes ({changes.length})
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="text-right text-sm text-slate-500 shrink-0">
                        <div>
                          {formatDistanceToNowIST(activity.created_at, {
                            addSuffix: true,
                          })}
                        </div>
                        <div className="text-xs text-slate-400">
                          {formatIST(activity.created_at, "MMM d, HH:mm")}
                        </div>
                      </div>
                    </div>

                    {isExpanded && hasChanges && (
                      <div className="px-4 pb-4 pt-0">
                        <div className="ml-14 bg-white rounded-lg border border-slate-200 overflow-hidden">
                          <div className="bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600 uppercase tracking-wide">
                            {activity.activity_type === "create"
                              ? "Created With"
                              : "Details"}
                          </div>
                          <div className="divide-y divide-slate-100">
                            {changes.map((change, idx) => (
                              <div
                                key={idx}
                                className="px-3 py-2 flex items-center gap-2 text-sm"
                              >
                                <span className="font-medium text-slate-700 min-w-[120px]">
                                  {change.field}
                                </span>
                                {activity.activity_type === "status_change" ? (
                                  <>
                                    <span className="text-red-500 line-through">
                                      {change.oldVal}
                                    </span>
                                    <ArrowRight className="h-3 w-3 text-slate-400 shrink-0" />
                                    <span className="text-emerald-600">
                                      {change.newVal}
                                    </span>
                                  </>
                                ) : (
                                  <span className="text-emerald-600">
                                    {change.newVal}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 
          IMPORTANT: For "Activity Log" to work perfectly for Projects, 
          the backend activity.service.ts must query `all_activities` view 
          where entity_type includes 'project'. 
          (Currently supported: lead, task, user, team. Project support might need backend view update but for now this shows existing activities for the user's department)
      */}
    </div>
  );
}
