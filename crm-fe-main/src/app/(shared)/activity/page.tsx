"use client";

import type { ElementType } from "react";
import { useCallback, useEffect, useState } from "react";
import useSWR, { mutate } from "swr";
import { formatInTimeZone } from "date-fns-tz";
import { subDays } from "date-fns";
import { activitiesApi, teamsApi, usersApi } from "@/lib/api";
import { useAuth } from "@/providers/auth-provider";
import { useDepartment } from "@/providers/department-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  Activity,
  CheckCircle,
  CheckSquare,
  ChevronDown,
  ChevronUp,
  Clock,
  LogIn,
  LogOut,
  MessageSquare,
  RefreshCw,
  Settings,
  Target,
  User,
  Users,
} from "lucide-react";
import { formatDistanceToNowIST, formatIST } from "@/lib/date-utils";
import { useHeaderRefresh } from "@/hooks/use-header-refresh";

const IST_TIMEZONE = "Asia/Kolkata";

type ActivityScope = "self" | "team" | "department" | "all-crm" | "member";
type TimePreset = "today" | "yesterday" | "this-week" | "custom";

interface ActivityLog {
  id: string;
  user_id: string | null;
  lead_id?: string | null;
  entity_id?: string | null;
  entity_type?: string | null;
  entity_name?: string | null;
  source_type?: string | null;
  activity_type: string;
  title: string | null;
  description: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  user?: {
    id: string;
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
  } | null;
  lead?: {
    id: string;
    lead_name: string | null;
  };
}

interface TeamOption {
  id: string;
  name: string;
  departmentId?: string | null;
}

interface UserOption {
  id: string;
  fullName: string;
  email: string;
  role?: string;
}

const actionIcons: Record<string, ElementType> = {
  create: Activity,
  update: RefreshCw,
  delete: Activity,
  login: LogIn,
  logout: LogOut,
  status_change: RefreshCw,
  clock_in: LogIn,
  clock_out: LogOut,
  complete: CheckCircle,
  comment: MessageSquare,
  task_create: CheckSquare,
  task_update: CheckSquare,
  task_reassign: CheckSquare,
  team_create: Users,
  team_update: Users,
};

const resourceIcons: Record<string, ElementType> = {
  lead: Target,
  task: CheckSquare,
  user: User,
  team: Users,
  attendance: Clock,
  settings: Settings,
  project: Activity,
};

const actionColors: Record<string, string> = {
  login: "bg-green-100 text-green-700",
  logout: "bg-slate-100 text-slate-700",
  status_change: "bg-orange-100 text-orange-700",
  complete: "bg-emerald-100 text-emerald-700",
  clock_in: "bg-green-100 text-green-700",
  clock_out: "bg-amber-100 text-amber-700",
  comment: "bg-blue-100 text-blue-700",
};

const formatFieldName = (field: string): string =>
  field
    .replace(/_/g, " ")
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (value) => value.toUpperCase())
    .trim();

const formatValue = (value: unknown): string => {
  if (value === null || value === undefined) return "-";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return value.join(", ") || "-";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
};

const getChangesFromMetadata = (
  metadata: Record<string, unknown> | null,
  activityType: string,
): Array<{ field: string; oldVal: string; newVal: string }> => {
  if (!metadata || activityType === "comment") return [];

  const changes: Array<{ field: string; oldVal: string; newVal: string }> = [];

  if (activityType === "status_change") {
    changes.push({
      field: "Status",
      oldVal: formatValue(metadata.from_status),
      newVal: formatValue(metadata.to_status),
    });
    return changes;
  }

  Object.entries(metadata).forEach(([key, value]) => {
    if (
      value === null ||
      value === undefined ||
      key === "comment_preview" ||
      key === "commented_on"
    ) {
      return;
    }

    changes.push({
      field: formatFieldName(key),
      oldVal: "",
      newVal: formatValue(value),
    });
  });

  return changes;
};

const formatActivityDescription = (activity: ActivityLog) => {
  if (activity.title) return activity.title;
  return (activity.activity_type || "activity").replace(/_/g, " ");
};

const getEntityLabel = (activity: ActivityLog) => {
  if (activity.entity_name) return activity.entity_name;
  if (activity.lead?.lead_name) return activity.lead.lead_name;
  if (activity.entity_type) return formatFieldName(activity.entity_type);
  return "Activity";
};

const getDateRange = (
  preset: TimePreset,
  customStartDate: string,
  customEndDate: string,
) => {
  if (preset === "custom") {
    return {
      startDate: customStartDate
        ? new Date(`${customStartDate}T00:00:00+05:30`).toISOString()
        : undefined,
      endDate: customEndDate
        ? new Date(`${customEndDate}T23:59:59.999+05:30`).toISOString()
        : undefined,
    };
  }

  const now = new Date();
  const today = formatInTimeZone(now, IST_TIMEZONE, "yyyy-MM-dd");

  if (preset === "today") {
    return {
      startDate: new Date(`${today}T00:00:00+05:30`).toISOString(),
      endDate: new Date(`${today}T23:59:59.999+05:30`).toISOString(),
    };
  }

  if (preset === "yesterday") {
    const yesterday = formatInTimeZone(subDays(now, 1), IST_TIMEZONE, "yyyy-MM-dd");
    return {
      startDate: new Date(`${yesterday}T00:00:00+05:30`).toISOString(),
      endDate: new Date(`${yesterday}T23:59:59.999+05:30`).toISOString(),
    };
  }

  const isoDay = Number(formatInTimeZone(now, IST_TIMEZONE, "i"));
  const startOfWeek = formatInTimeZone(
    subDays(now, isoDay - 1),
    IST_TIMEZONE,
    "yyyy-MM-dd",
  );

  return {
    startDate: new Date(`${startOfWeek}T00:00:00+05:30`).toISOString(),
    endDate: new Date(`${today}T23:59:59.999+05:30`).toISOString(),
  };
};

export default function ActivityPage() {
  const { user } = useAuth();
  const { departments } = useDepartment();

  // Core filters
  const [scope, setScope] = useState<ActivityScope>("self");
  const [activityType, setActivityType] = useState("all");
  const [resourceType, setResourceType] = useState("all");
  const [timePreset, setTimePreset] = useState<TimePreset>("today");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");

  // User-filter panel (admin/manager only) — replaces old dept/team/member sub-filters
  const [filterDeptId, setFilterDeptId] = useState("");
  const [filterDesignation, setFilterDesignation] = useState("all");
  const [filterTeamId, setFilterTeamId] = useState("");
  const [filterUserId, setFilterUserId] = useState("");

  // Pagination
  const [extraActivities, setExtraActivities] = useState<ActivityLog[]>([]);
  const [loadMorePage, setLoadMorePage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [expandedActivities, setExpandedActivities] = useState<Set<string>>(new Set());

  const isAdmin = user?.role === "admin";
  const isManager = user?.role === "manager";
  // Teams for the "By Team" scope selector (admin only)
  const teamsKey = isAdmin && user ? ["activity-teams-admin"] : null;
  const { data: teamsData = [] } = useSWR<TeamOption[]>(teamsKey, () =>
    teamsApi.list(),
  );

  // Filter teams by selected department when admin picks dept + team scope
  const teamsForScope = teamsData.filter((t) =>
    filterDeptId ? t.departmentId === filterDeptId : true,
  );

  // Users for the user-filter dropdown
  // Admin: filter by dept + designation; Manager: always scoped to their team
  const userListParams =
    isAdmin || isManager
      ? {
          limit: 200,
          departmentId: isAdmin && filterDeptId ? filterDeptId : undefined,
          teamId: isManager
            ? user?.teamId || undefined
            : scope === "team" && filterTeamId
              ? filterTeamId
              : undefined,
          role:
            filterDesignation !== "all" ? filterDesignation : undefined,
        }
      : null;

  const usersKey =
    (isAdmin || isManager) && scope !== "self"
      ? [
          "activity-filter-users",
          userListParams?.departmentId || "",
          userListParams?.teamId || "",
          userListParams?.role || "",
        ]
      : null;

  const { data: usersData } = useSWR(usersKey, () =>
    usersApi.list(userListParams!),
  );
  const userOptions: UserOption[] = usersData?.data || [];

  // Reset downstream filters when scope changes
  useEffect(() => {
    setFilterDeptId("");
    setFilterDesignation("all");
    setFilterTeamId("");
    setFilterUserId("");
  }, [scope]);

  // Reset user when dept/designation/team changes
  useEffect(() => {
    setFilterUserId("");
  }, [filterDeptId, filterDesignation, filterTeamId]);

  // Auto set team for manager in team/member scope
  useEffect(() => {
    if (!isManager || !user?.teamId) return;
    if (scope !== "team" && scope !== "member") return;
    if (!filterTeamId) setFilterTeamId(user.teamId);
  }, [isManager, scope, user?.teamId, filterTeamId]);

  const { startDate, endDate } = getDateRange(timePreset, customStartDate, customEndDate);

  // Resolve effective scope + ids for the API
  const effectiveScope: ActivityScope = filterUserId
    ? "member"
    : scope === "all-crm" && filterDeptId
      ? "department"
      : scope;

  const effectiveUserId = filterUserId || undefined;
  const effectiveTeamId =
    !filterUserId && (scope === "team" || scope === "member")
      ? filterTeamId || user?.teamId || undefined
      : undefined;
  const effectiveDeptId =
    !filterUserId && (scope === "department" || (scope === "all-crm" && filterDeptId))
      ? filterDeptId || undefined
      : undefined;

  const canQueryActivities =
    Boolean(user) &&
    (scope !== "member" || Boolean(filterUserId)) &&
    (scope !== "team" || Boolean(effectiveTeamId)) &&
    (scope !== "department" || Boolean(effectiveDeptId));

  const activityParams = {
    limit: 50,
    scope: effectiveScope,
    action: activityType !== "all" ? activityType : undefined,
    resourceType: resourceType !== "all" ? resourceType : undefined,
    startDate,
    endDate,
    userId: effectiveUserId,
    teamId: effectiveTeamId,
    departmentId: effectiveDeptId,
  };

  const activityKey = canQueryActivities
    ? [
        "activities",
        effectiveScope,
        resourceType,
        activityType,
        startDate || "",
        endDate || "",
        effectiveUserId || "",
        effectiveTeamId || "",
        effectiveDeptId || "",
      ]
    : null;

  const { data, isLoading, error } = useSWR(activityKey, () =>
    activitiesApi.list(activityParams),
  );

  useEffect(() => {
    setExtraActivities([]);
    setLoadMorePage(1);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    effectiveScope, resourceType, activityType,
    startDate, endDate,
    effectiveUserId, effectiveTeamId, effectiveDeptId,
    canQueryActivities,
  ]);

  const handleLoadMore = useCallback(async () => {
    if (!canQueryActivities || isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      const nextPage = loadMorePage + 1;
      const result = await activitiesApi.list({ ...activityParams, page: nextPage });
      setExtraActivities((prev) => [...prev, ...(result.data || [])]);
      setLoadMorePage(nextPage);
    } finally {
      setIsLoadingMore(false);
    }
  }, [activityParams, canQueryActivities, isLoadingMore, loadMorePage]);

  const statsKey = canQueryActivities
    ? [
        "activityStats",
        effectiveScope,
        resourceType,
        startDate || "",
        endDate || "",
        effectiveUserId || "",
        effectiveTeamId || "",
        effectiveDeptId || "",
      ]
    : null;

  const statsParams = {
    limit: 100,
    scope: effectiveScope,
    resourceType: resourceType !== "all" ? resourceType : undefined,
    startDate,
    endDate,
    userId: effectiveUserId,
    teamId: effectiveTeamId,
    departmentId: effectiveDeptId,
  };

  const { data: statsData } = useSWR(statsKey, () =>
    activitiesApi.getStats(statsParams),
  );

  const refreshActivityData = useCallback(async () => {
    if (!activityKey || !statsKey) return;
    setExtraActivities([]);
    setLoadMorePage(1);
    await Promise.all([mutate(activityKey), mutate(statsKey)]);
  }, [activityKey, statsKey]);

  useHeaderRefresh({ onRefresh: refreshActivityData, enabled: Boolean(user) });

  const activities: ActivityLog[] = data?.data || [];
  const meta = data?.meta || { total: 0 };
  const allActivities = [...activities, ...extraActivities];

  const statCards = [
    { title: "Total Activities", value: statsData?.totalActivities || 0, icon: Activity, color: "bg-red-50 text-red-600" },
    { title: "Comments", value: statsData?.commentsCount || 0, icon: MessageSquare, color: "bg-blue-50 text-blue-600" },
    { title: "Status Changes", value: statsData?.statusChanges || 0, icon: RefreshCw, color: "bg-orange-50 text-orange-600" },
    { title: "Tasks Completed", value: statsData?.tasksDone || 0, icon: CheckCircle, color: "bg-emerald-50 text-emerald-600" },
    { title: "Auth Events", value: statsData?.authEvents || 0, icon: LogIn, color: "bg-slate-100 text-slate-700" },
  ];

  const scopeOptions: Array<{ value: ActivityScope; label: string }> = isAdmin
    ? [
        { value: "self", label: "My Activity" },
        { value: "all-crm", label: "Whole CRM" },
        { value: "department", label: "By Department" },
        { value: "team", label: "By Team" },
        { value: "member", label: "Specific User" },
      ]
    : isManager
      ? [
          { value: "self", label: "My Activity" },
          { value: "team", label: "My Team" },
          { value: "member", label: "Specific Team Member" },
        ]
      : [];

  // Whether to show the user-filter panel
  const showUserFilterPanel = (isAdmin || isManager) && scope !== "self";

  // Whether scope requires a sub-selection to be queryable
  const scopeNeedsDept = scope === "department" && isAdmin;
  const scopeNeedsUser = scope === "member";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Activity Log</h1>
          <p className="text-slate-600">Track and review activity with role-based filters</p>
        </div>
        <Badge variant="secondary" className="text-lg px-3 py-1">
          {meta.total} Activities
        </Badge>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardContent className="p-4 flex items-center gap-4">
              <div className={`p-3 rounded-lg ${stat.color}`}>
                <stat.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
                <p className="text-xs text-slate-500 font-medium">{stat.title}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-5 space-y-4">

          {/* Row 1: Time Range */}
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Time Range
              </label>
              <Select
                value={timePreset}
                onValueChange={(value) => setTimePreset(value as TimePreset)}
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="yesterday">Yesterday</SelectItem>
                  <SelectItem value="this-week">This Week</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {timePreset === "custom" && (
              <>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    From
                  </label>
                  <Input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="w-40"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    To
                  </label>
                  <Input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="w-40"
                  />
                </div>
              </>
            )}
          </div>

          <div className="h-px bg-slate-100" />

          {/* Row 2: Scope (admin/manager) + Activity Type + Resource */}
          <div className="flex flex-wrap gap-3 items-end">
            {/* View As — only for admin/manager */}
            {(isAdmin || isManager) && (
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  View As
                </label>
                <Select
                  value={scope}
                  onValueChange={(value) => setScope(value as ActivityScope)}
                >
                  <SelectTrigger className="w-52">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {scopeOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Activity Type */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Activity Type
              </label>
              <Select value={activityType} onValueChange={setActivityType}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="comment">Comments</SelectItem>
                  <SelectItem value="status_change">Status Changes</SelectItem>
                  <SelectItem value="create">Creates</SelectItem>
                  <SelectItem value="update">Updates</SelectItem>
                  <SelectItem value="delete">Deletes</SelectItem>
                  <SelectItem value="complete">Completions</SelectItem>
                  <SelectItem value="task_create">Task Created</SelectItem>
                  <SelectItem value="task_update">Task Updated</SelectItem>
                  <SelectItem value="task_reassign">Task Reassigned</SelectItem>
                  <SelectItem value="clock_in">Clock In</SelectItem>
                  <SelectItem value="clock_out">Clock Out</SelectItem>
                  <SelectItem value="login">Logins</SelectItem>
                  <SelectItem value="logout">Logouts</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Resource Type */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Resource
              </label>
              <Select value={resourceType} onValueChange={setResourceType}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Resources</SelectItem>
                  <SelectItem value="lead">Leads</SelectItem>
                  <SelectItem value="task">Tasks</SelectItem>
                  <SelectItem value="user">Users</SelectItem>
                  <SelectItem value="team">Teams</SelectItem>
                  <SelectItem value="attendance">Attendance</SelectItem>
                  <SelectItem value="project">Projects</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row 3: User Filter Panel — admin/manager, scope != "self" */}
          {showUserFilterPanel && (
            <div className="flex flex-wrap items-end gap-3 px-4 py-3 bg-slate-50 rounded-lg border border-slate-100">

              {/* Department — admin only, shown for all-crm / department / member scopes */}
              {isAdmin && scope !== "team" && (
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Department
                    {scopeNeedsDept && <span className="ml-1 text-red-500">*</span>}
                  </label>
                  <Select
                    value={filterDeptId || "all"}
                    onValueChange={(v) => setFilterDeptId(v === "all" ? "" : v)}
                  >
                    <SelectTrigger className="w-52 bg-white">
                      <SelectValue placeholder="All Departments" />
                    </SelectTrigger>
                    <SelectContent>
                      {!scopeNeedsDept && (
                        <SelectItem value="all">All Departments</SelectItem>
                      )}
                      {departments.map((dept) => (
                        <SelectItem key={dept.id} value={dept.id}>
                          {dept.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Team — admin only, for "By Team" scope */}
              {isAdmin && scope === "team" && (
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Team <span className="ml-1 text-red-500">*</span>
                  </label>
                  <Select
                    value={filterTeamId || ""}
                    onValueChange={setFilterTeamId}
                  >
                    <SelectTrigger className="w-52 bg-white">
                      <SelectValue placeholder="Select Team" />
                    </SelectTrigger>
                    <SelectContent>
                      {teamsForScope.map((team) => (
                        <SelectItem key={team.id} value={team.id}>
                          {team.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Designation / Role */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Designation
                </label>
                <Select
                  value={filterDesignation}
                  onValueChange={setFilterDesignation}
                >
                  <SelectTrigger className="w-44 bg-white">
                    <SelectValue placeholder="All Designations" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Designations</SelectItem>
                    {isAdmin && <SelectItem value="admin">Admin</SelectItem>}
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="employee">Employee</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* User — shown for all non-"self" scopes except "By Team" with no user intent */}
              {scope !== "team" && (
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    User
                    {scopeNeedsUser && <span className="ml-1 text-red-500">*</span>}
                  </label>
                  <Select
                    value={filterUserId || "all"}
                    onValueChange={(v) => setFilterUserId(v === "all" ? "" : v)}
                    disabled={userOptions.length === 0}
                  >
                    <SelectTrigger className="w-56 bg-white">
                      <SelectValue placeholder={scopeNeedsUser ? "Select User" : "All Users"} />
                    </SelectTrigger>
                    <SelectContent>
                      {!scopeNeedsUser && (
                        <SelectItem value="all">All Users</SelectItem>
                      )}
                      {userOptions.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          <span>{u.fullName}</span>
                          <span className="ml-1.5 text-xs text-slate-400 capitalize">
                            ({u.role || "—"})
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Reset link */}
              <button
                type="button"
                onClick={() => {
                  setFilterDeptId("");
                  setFilterDesignation("all");
                  setFilterTeamId("");
                  setFilterUserId("");
                }}
                className="text-xs text-slate-500 hover:text-slate-800 underline underline-offset-2 transition-colors self-end pb-2"
              >
                Reset
              </button>
            </div>
          )}

        </CardContent>
      </Card>

      {/* Activity Feed */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Recent Activities
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!canQueryActivities ? (
            <div className="text-center py-12 text-slate-500">
              {scopeNeedsDept
                ? "Select a department to load activity."
                : scopeNeedsUser
                  ? "Select a user to load activity."
                  : "Select the required filters to load activity."}
            </div>
          ) : isLoading ? (
            <div className="space-y-4">
              {[...Array(8)].map((_, index) => (
                <Skeleton key={index} className="h-20" />
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-12 text-red-500">
              Failed to load activities
            </div>
          ) : allActivities.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Activity className="h-12 w-12 mx-auto mb-4 text-slate-300" />
              <p>No activities found</p>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {allActivities.map((activity) => {
                  const ActionIcon = actionIcons[activity.activity_type] || Activity;
                  const EntityIcon = resourceIcons[activity.entity_type || ""] || Activity;
                  const colorClass = actionColors[activity.activity_type] || "bg-slate-100 text-slate-700";
                  const isExpanded = expandedActivities.has(activity.id);
                  const changes = getChangesFromMetadata(activity.metadata, activity.activity_type);
                  const commentPreview =
                    typeof activity.metadata?.comment_preview === "string"
                      ? activity.metadata.comment_preview
                      : null;

                  return (
                    <div
                      key={activity.id}
                      className="bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                    >
                      <div className="flex items-start gap-4 p-4">
                        <div
                          className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${colorClass.split(" ")[0]}`}
                        >
                          <ActionIcon className={`h-5 w-5 ${colorClass.split(" ")[1]}`} />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={activity.user?.avatar_url || ""} />
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
                            <Badge variant="outline" className="flex items-center gap-1">
                              <EntityIcon className="h-3 w-3" />
                              {getEntityLabel(activity)}
                            </Badge>
                            {activity.entity_type && (
                              <Badge variant="secondary">
                                {formatFieldName(activity.entity_type)}
                              </Badge>
                            )}
                            {changes.length > 0 && (
                              <button
                                onClick={() =>
                                  setExpandedActivities((prev) => {
                                    const next = new Set(prev);
                                    if (next.has(activity.id)) next.delete(activity.id);
                                    else next.add(activity.id);
                                    return next;
                                  })
                                }
                                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors"
                              >
                                {isExpanded ? (
                                  <><ChevronUp className="h-3 w-3" />Hide Changes</>
                                ) : (
                                  <><ChevronDown className="h-3 w-3" />View Changes ({changes.length})</>
                                )}
                              </button>
                            )}
                          </div>

                          {commentPreview && (
                            <p className="mt-2 text-sm text-slate-600 italic">
                              "{commentPreview}"
                            </p>
                          )}

                          {isExpanded && changes.length > 0 && (
                            <div className="mt-3 rounded-md border border-slate-200 bg-white p-3 space-y-2">
                              {changes.map((change, index) => (
                                <div
                                  key={`${activity.id}-${index}`}
                                  className="grid gap-1 md:grid-cols-[140px_1fr_1fr]"
                                >
                                  <span className="text-xs font-medium text-slate-500">
                                    {change.field}
                                  </span>
                                  <span className="text-sm text-slate-500">
                                    {change.oldVal || "-"}
                                  </span>
                                  <span className="text-sm text-slate-900">
                                    {change.newVal}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="text-right text-sm text-slate-500 shrink-0">
                          <div>
                            {formatDistanceToNowIST(activity.created_at, { addSuffix: true })}
                          </div>
                          <div>{formatIST(activity.created_at, "MMM d, HH:mm")}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              {!isLoading && meta.total > allActivities.length && (
                <div className="text-center pt-4">
                  <Button
                    variant="outline"
                    onClick={handleLoadMore}
                    disabled={isLoadingMore}
                  >
                    {isLoadingMore
                      ? "Loading..."
                      : `Load More (${meta.total - allActivities.length} remaining)`}
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
