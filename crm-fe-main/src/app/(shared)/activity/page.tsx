"use client";

import type { Dispatch, ElementType, SetStateAction } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { formatInTimeZone } from "date-fns-tz";
import { startOfMonth, subDays } from "date-fns";
import {
  Activity,
  Briefcase,
  CheckCircle,
  CheckSquare,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Clock,
  FolderKanban,
  LogIn,
  LogOut,
  MessageSquare,
  Pencil,
  PlusCircle,
  RefreshCw,
  Target,
  Trash2,
  User,
  Users,
} from "lucide-react";
import useSWR, { mutate } from "swr";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useHeaderRefresh } from "@/hooks/use-header-refresh";
import { activitiesApi, teamsApi, usersApi } from "@/lib/api";
import { formatDistanceToNowIST, formatIST } from "@/lib/date-utils";
import { cn } from "@/lib/utils";
import { useDepartment } from "@/providers/department-context";
import { useAuth } from "@/providers/auth-provider";

const IST_TIMEZONE = "Asia/Kolkata";
const DEFAULT_RESOURCE_OPEN: string[] = [];
const SYSTEM_ACTIVITY_TYPES = new Set(["login", "logout", "clock_in", "clock_out"]);

type ActivityScope = "self" | "team" | "department" | "all-crm" | "member";
type TimePreset = "today" | "yesterday" | "this-week" | "this-month" | "custom";
type QuickFilter = "all" | "lead-updates" | "task-completions" | "project-modified" | "user-logins";
type ResourceGroupKey = "lead" | "task" | "user" | "attendance" | "project" | "other";
type TimeBucketKey = "today" | "yesterday" | "earlier";
interface TimeSection {
  key: string;
  label: string;
  activities: ActivityLog[];
  collapsible: boolean;
}

interface DateEntitySection {
  key: string;
  label: string;
  entities: EntityGroup[];
}

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

interface ActivityChange {
  field: string;
  oldVal: string;
  newVal: string;
}

interface QuickSummaryItem {
  id: QuickFilter;
  title: string;
  value: number;
  helper: string;
  icon: ElementType;
}

interface EntityGroup {
  entityId: string;
  entityName: string;
  resourceLabel: string;
  activities: ActivityLog[];
}

interface ResourceGroup {
  key: ResourceGroupKey;
  label: string;
  icon: ElementType;
  accentClass: string;
  activities: ActivityLog[];
  entities: EntityGroup[];
}

const actionIcons: Record<string, ElementType> = {
  create: PlusCircle,
  update: Pencil,
  delete: Trash2,
  login: LogIn,
  logout: LogOut,
  status_change: RefreshCw,
  clock_in: Clock,
  clock_out: Clock,
  complete: CheckCircle,
  comment: MessageSquare,
  task_create: CheckSquare,
  task_update: CheckSquare,
  task_reassign: CheckSquare,
  team_create: Users,
  team_update: Users,
};

const resourceIcons: Record<ResourceGroupKey, ElementType> = {
  lead: Target,
  task: CheckSquare,
  user: User,
  attendance: Clock,
  project: FolderKanban,
  other: Briefcase,
};

const resourceLabels: Record<ResourceGroupKey, string> = {
  lead: "Leads",
  task: "Tasks",
  user: "Users",
  attendance: "Attendance",
  project: "Projects",
  other: "Other",
};

const resourceAccent: Record<ResourceGroupKey, string> = {
  lead: "bg-slate-50/80",
  task: "bg-slate-50/80",
  user: "bg-slate-50/80",
  attendance: "bg-slate-50/80",
  project: "bg-slate-50/80",
  other: "bg-slate-50/80",
};

const actionColors: Record<string, string> = {
  create: "bg-emerald-100 text-emerald-700 ring-emerald-200",
  update: "bg-blue-100 text-blue-700 ring-blue-200",
  delete: "bg-red-100 text-red-700 ring-red-200",
  comment: "bg-violet-100 text-violet-700 ring-violet-200",
  login: "bg-slate-100 text-slate-700 ring-slate-200",
  logout: "bg-slate-100 text-slate-700 ring-slate-200",
  clock_in: "bg-slate-100 text-slate-700 ring-slate-200",
  clock_out: "bg-slate-100 text-slate-700 ring-slate-200",
  status_change: "bg-blue-100 text-blue-700 ring-blue-200",
  complete: "bg-emerald-100 text-emerald-700 ring-emerald-200",
  task_create: "bg-emerald-100 text-emerald-700 ring-emerald-200",
  task_update: "bg-blue-100 text-blue-700 ring-blue-200",
  task_reassign: "bg-blue-100 text-blue-700 ring-blue-200",
  team_create: "bg-emerald-100 text-emerald-700 ring-emerald-200",
  team_update: "bg-blue-100 text-blue-700 ring-blue-200",
};

const timeBucketLabels: Record<TimeBucketKey, string> = {
  today: "Today",
  yesterday: "Yesterday",
  earlier: "Earlier",
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
): ActivityChange[] => {
  if (!metadata || activityType === "comment") return [];

  const changes: ActivityChange[] = [];

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
  if (activity.entity_type === "user") return activity.user?.full_name || "User";
  if (activity.entity_type) return formatFieldName(activity.entity_type);
  return "Activity";
};

const getResourceGroupKey = (activity: ActivityLog): ResourceGroupKey => {
  const entityType = (activity.entity_type || "").toLowerCase();
  if (entityType === "lead") return "lead";
  if (entityType === "task") return "task";
  if (entityType === "user" || entityType === "team") return "user";
  if (entityType === "attendance") return "attendance";
  if (entityType === "project") return "project";
  return "other";
};

const getEntityGroupId = (activity: ActivityLog, resourceKey: ResourceGroupKey) =>
  activity.entity_id ||
  activity.lead_id ||
  (resourceKey === "attendance" ? activity.user_id : null) ||
  `${resourceKey}-${activity.id}`;

const getTimeBucket = (createdAt: string): TimeBucketKey => {
  const now = new Date();
  const today = formatInTimeZone(now, IST_TIMEZONE, "yyyy-MM-dd");
  const activityDay = formatInTimeZone(new Date(createdAt), IST_TIMEZONE, "yyyy-MM-dd");
  if (activityDay === today) return "today";
  const yesterday = formatInTimeZone(subDays(now, 1), IST_TIMEZONE, "yyyy-MM-dd");
  return activityDay === yesterday ? "yesterday" : "earlier";
};

const isDateAccordionRange = (preset: TimePreset) =>
  preset === "this-week" || preset === "this-month" || preset === "custom";

const getDateLabel = (createdAt: string) =>
  formatInTimeZone(new Date(createdAt), IST_TIMEZONE, "EEE, MMM d");

const getDateKey = (createdAt: string) =>
  formatInTimeZone(new Date(createdAt), IST_TIMEZONE, "yyyy-MM-dd");

const buildTimeSections = (activities: ActivityLog[], preset: TimePreset): TimeSection[] => {
  if (isDateAccordionRange(preset)) {
    const dateMap = new Map<string, TimeSection>();

    activities.forEach((activity) => {
      const key = getDateKey(activity.created_at);
      const existing = dateMap.get(key);
      if (existing) {
        existing.activities.push(activity);
        return;
      }

      dateMap.set(key, {
        key,
        label: getDateLabel(activity.created_at),
        activities: [activity],
        collapsible: true,
      });
    });

    return [...dateMap.values()].sort((a, b) => b.key.localeCompare(a.key));
  }

  const bucketMap: Record<TimeBucketKey, ActivityLog[]> = {
    today: [],
    yesterday: [],
    earlier: [],
  };

  activities.forEach((activity) => {
    bucketMap[getTimeBucket(activity.created_at)].push(activity);
  });

  return (Object.keys(timeBucketLabels) as TimeBucketKey[])
    .filter((bucketKey) => bucketMap[bucketKey].length > 0)
    .map((bucketKey) => ({
      key: bucketKey,
      label: timeBucketLabels[bucketKey],
      activities: bucketMap[bucketKey],
      collapsible: false,
    }));
};

const buildDateEntitySections = (
  entities: EntityGroup[],
  preset: TimePreset,
): DateEntitySection[] => {
  if (!isDateAccordionRange(preset)) return [];

  const dateMap = new Map<string, DateEntitySection>();

  entities.forEach((entity) => {
    const latestActivity = entity.activities[0];
    if (!latestActivity) return;

    const key = getDateKey(latestActivity.created_at);
    const existing = dateMap.get(key);

    if (existing) {
      existing.entities.push(entity);
      return;
    }

    dateMap.set(key, {
      key,
      label: getDateLabel(latestActivity.created_at),
      entities: [entity],
    });
  });

  return [...dateMap.values()].sort((a, b) => b.key.localeCompare(a.key));
};

const isLeadUpdate = (activity: ActivityLog) =>
  getResourceGroupKey(activity) === "lead" &&
  ["update", "status_change", "comment"].includes(activity.activity_type);

const isTaskCompletion = (activity: ActivityLog) =>
  getResourceGroupKey(activity) === "task" && activity.activity_type === "complete";

const isProjectModification = (activity: ActivityLog) =>
  getResourceGroupKey(activity) === "project" &&
  ["create", "update", "delete", "status_change", "comment"].includes(activity.activity_type);

const isUserLogin = (activity: ActivityLog) => activity.activity_type === "login";

const matchesQuickFilter = (activity: ActivityLog, filter: QuickFilter) => {
  if (filter === "all") return true;
  if (filter === "lead-updates") return isLeadUpdate(activity);
  if (filter === "task-completions") return isTaskCompletion(activity);
  if (filter === "project-modified") return isProjectModification(activity);
  if (filter === "user-logins") return isUserLogin(activity);
  return true;
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

  if (preset === "this-month") {
    const monthStart = formatInTimeZone(startOfMonth(now), IST_TIMEZONE, "yyyy-MM-dd");
    return {
      startDate: new Date(`${monthStart}T00:00:00+05:30`).toISOString(),
      endDate: new Date(`${today}T23:59:59.999+05:30`).toISOString(),
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

const getSummaryItems = (activities: ActivityLog[]): QuickSummaryItem[] => {
  const todayActivities = activities.filter(
    (activity) => getTimeBucket(activity.created_at) === "today",
  );

  return [
    {
      id: "lead-updates",
      title: "Leads Updated",
      value: todayActivities.filter(isLeadUpdate).length,
      helper: "Status changes, comments, and lead edits",
      icon: Target,
    },
    {
      id: "task-completions",
      title: "Tasks Completed",
      value: todayActivities.filter(isTaskCompletion).length,
      helper: "Finished work items",
      icon: CheckCircle,
    },
    {
      id: "project-modified",
      title: "Projects Modified",
      value: todayActivities.filter(isProjectModification).length,
      helper: "Changes across project records",
      icon: FolderKanban,
    },
    {
      id: "user-logins",
      title: "User Logins",
      value: todayActivities.filter(isUserLogin).length,
      helper: "Authentication activity",
      icon: LogIn,
    },
  ];
};

const buildResourceGroups = (activities: ActivityLog[]): ResourceGroup[] => {
  const resourceMap = new Map<ResourceGroupKey, ResourceGroup>();

  activities.forEach((activity) => {
    const resourceKey = getResourceGroupKey(activity);
    const entityId = getEntityGroupId(activity, resourceKey);
    const resourceGroup =
      resourceMap.get(resourceKey) ||
      {
        key: resourceKey,
        label: resourceLabels[resourceKey],
        icon: resourceIcons[resourceKey],
        accentClass: resourceAccent[resourceKey],
        activities: [],
        entities: [],
      };

    resourceGroup.activities.push(activity);

    let entityGroup = resourceGroup.entities.find((entity) => entity.entityId === entityId);
    if (!entityGroup) {
      entityGroup = {
        entityId,
        entityName: getEntityLabel(activity),
        resourceLabel: resourceLabels[resourceKey].endsWith("s")
          ? resourceLabels[resourceKey].slice(0, -1)
          : resourceLabels[resourceKey],
        activities: [],
      };
      resourceGroup.entities.push(entityGroup);
    }

    entityGroup.activities.push(activity);
    resourceMap.set(resourceKey, resourceGroup);
  });

  const order: ResourceGroupKey[] = ["lead", "task", "user", "attendance", "project", "other"];
  return order
    .map((key) => resourceMap.get(key))
    .filter((group): group is ResourceGroup => Boolean(group))
    .map((group) => ({
      ...group,
      entities: group.entities.sort(
        (a, b) =>
          new Date(b.activities[0]?.created_at || 0).getTime() -
          new Date(a.activities[0]?.created_at || 0).getTime(),
      ),
    }));
};

const renderActivityItem = ({
  activity,
  entityName,
  expandedActivities,
  setExpandedActivities,
}: {
  activity: ActivityLog;
  entityName: string;
  expandedActivities: Set<string>;
  setExpandedActivities: Dispatch<SetStateAction<Set<string>>>;
}) => {
  const ActionIcon = actionIcons[activity.activity_type] || Activity;
  const colorClass =
    actionColors[activity.activity_type] || "bg-slate-100 text-slate-700 ring-slate-200";
  const changes = getChangesFromMetadata(activity.metadata, activity.activity_type);
  const commentPreview =
    typeof activity.metadata?.comment_preview === "string"
      ? activity.metadata.comment_preview
      : null;
  const isExpanded = expandedActivities.has(activity.id);

  return (
    <div
      key={activity.id}
      className="rounded-xl border border-slate-200 bg-slate-50/70 p-4"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <div className="flex items-start gap-3">
          <div className={cn("rounded-xl p-2 ring-1", colorClass)}>
            <ActionIcon className="h-4 w-4" />
          </div>
          <Avatar className="h-10 w-10 ring-2 ring-white">
            <AvatarImage src={activity.user?.avatar_url || ""} />
            <AvatarFallback className="text-xs">
              {activity.user?.full_name?.[0] || "U"}
            </AvatarFallback>
          </Avatar>
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm leading-6 text-slate-700">
            <span className="font-semibold text-slate-900">
              {activity.user?.full_name || "Unknown User"}
            </span>{" "}
            {formatActivityDescription(activity)}{" "}
            <span className="font-medium text-slate-900">{entityName}</span>
          </p>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="capitalize">
              {formatFieldName(activity.activity_type)}
            </Badge>
            {activity.entity_type && (
              <Badge variant="secondary">
                {formatFieldName(activity.entity_type)}
              </Badge>
            )}
            {changes.length > 0 && (
              <button
                type="button"
                onClick={() =>
                  setExpandedActivities((prev) => {
                    const next = new Set(prev);
                    if (next.has(activity.id)) next.delete(activity.id);
                    else next.add(activity.id);
                    return next;
                  })
                }
                className="flex items-center gap-1 text-xs font-medium text-blue-600 transition-colors hover:text-blue-800"
              >
                {isExpanded ? (
                  <>
                    <ChevronUp className="h-3 w-3" />
                    Hide changes
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-3 w-3" />
                    View changes ({changes.length})
                  </>
                )}
              </button>
            )}
          </div>

          {commentPreview && (
            <p className="mt-3 rounded-lg bg-white px-3 py-2 text-sm italic text-slate-600">
              &quot;{commentPreview}&quot;
            </p>
          )}

          {isExpanded && changes.length > 0 && (
            <div className="mt-3 space-y-2 rounded-lg border border-slate-200 bg-white p-3">
              {changes.map((change, index) => (
                <div
                  key={`${activity.id}-${index}`}
                  className="grid gap-1 text-sm md:grid-cols-[140px_1fr_1fr]"
                >
                  <span className="font-medium text-slate-500">{change.field}</span>
                  <span className="text-slate-500">{change.oldVal || "-"}</span>
                  <span className="text-slate-900">{change.newVal}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="shrink-0 text-sm text-slate-500 lg:text-right">
          <div>{formatDistanceToNowIST(activity.created_at, { addSuffix: true })}</div>
          <div>{formatIST(activity.created_at, "MMM d, HH:mm")}</div>
        </div>
      </div>
    </div>
  );
};

export default function ActivityPage() {
  const { user } = useAuth();
  const { departments } = useDepartment();

  const [scope, setScope] = useState<ActivityScope>(() => {
    if (typeof window === "undefined") return "self";
    return (new URLSearchParams(window.location.search).get("scope") as ActivityScope) || "self";
  });
  const [activityType, setActivityType] = useState("all");
  const [resourceType, setResourceType] = useState(() => {
    if (typeof window === "undefined") return "all";
    return new URLSearchParams(window.location.search).get("rtype") || "all";
  });
  const [timePreset, setTimePreset] = useState<TimePreset>(() => {
    if (typeof window === "undefined") return "today";
    return (new URLSearchParams(window.location.search).get("preset") as TimePreset) || "today";
  });
  const [customStartDate, setCustomStartDate] = useState(() => {
    if (typeof window === "undefined") return "";
    return new URLSearchParams(window.location.search).get("from") || "";
  });
  const [customEndDate, setCustomEndDate] = useState(() => {
    if (typeof window === "undefined") return "";
    return new URLSearchParams(window.location.search).get("to") || "";
  });
  const [showSystemEvents, setShowSystemEvents] = useState(false);
  const [quickFilter, setQuickFilter] = useState<QuickFilter>(() => {
    if (typeof window === "undefined") return "all";
    return (new URLSearchParams(window.location.search).get("quick") as QuickFilter) || "all";
  });

  const [filterDeptId, setFilterDeptId] = useState("");
  const [filterDesignation, setFilterDesignation] = useState("all");
  const [filterTeamId, setFilterTeamId] = useState(() => {
    if (typeof window === "undefined") return "";
    return new URLSearchParams(window.location.search).get("teamId") || "";
  });
  const [filterUserId, setFilterUserId] = useState(() => {
    if (typeof window === "undefined") return "";
    return new URLSearchParams(window.location.search).get("userId") || "";
  });

  // ── Sync filter state to URL (without triggering re-render)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams();
    if (scope !== "self") params.set("scope", scope);
    if (timePreset !== "today") params.set("preset", timePreset);
    if (timePreset === "custom" && customStartDate) params.set("from", customStartDate);
    if (timePreset === "custom" && customEndDate) params.set("to", customEndDate);
    if (quickFilter !== "all") params.set("quick", quickFilter);
    if (filterTeamId) params.set("teamId", filterTeamId);
    if (filterUserId) params.set("userId", filterUserId);
    if (resourceType !== "all") params.set("rtype", resourceType);
    const qs = params.toString();
    window.history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
  }, [scope, timePreset, customStartDate, customEndDate, quickFilter, filterTeamId, filterUserId, resourceType]);

  const [extraActivities, setExtraActivities] = useState<ActivityLog[]>([]);
  const [loadMorePage, setLoadMorePage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [expandedActivities, setExpandedActivities] = useState<Set<string>>(new Set());
  const [openResources, setOpenResources] = useState<Set<string>>(
    new Set(DEFAULT_RESOURCE_OPEN),
  );
  const [openEntities, setOpenEntities] = useState<Set<string>>(new Set());
  const [openDateGroups, setOpenDateGroups] = useState<Set<string>>(new Set());

  const isAdmin = user?.role === "admin";
  const isManager = user?.role === "manager";

  const teamsKey = isAdmin && user ? ["activity-teams-admin"] : null;
  const { data: teamsData = [] } = useSWR<TeamOption[]>(teamsKey, () => teamsApi.list());
  const teamsForScope = teamsData.filter((team) =>
    filterDeptId ? team.departmentId === filterDeptId : true,
  );

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
          role: filterDesignation !== "all" ? filterDesignation : undefined,
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

  const { data: usersData } = useSWR(usersKey, () => usersApi.list(userListParams!));
  const userOptions: UserOption[] = usersData?.data || [];

  useEffect(() => {
    setFilterDeptId("");
    setFilterDesignation("all");
    setFilterTeamId("");
    setFilterUserId("");
  }, [scope]);

  useEffect(() => {
    setFilterUserId("");
  }, [filterDeptId, filterDesignation, filterTeamId]);

  useEffect(() => {
    if (!isManager || !user?.teamId) return;
    if (scope !== "team" && scope !== "member") return;
    if (!filterTeamId) setFilterTeamId(user.teamId);
  }, [isManager, scope, user?.teamId, filterTeamId]);

  useEffect(() => {
    setQuickFilter("all");
  }, [
    scope,
    activityType,
    resourceType,
    timePreset,
    customStartDate,
    customEndDate,
    filterDeptId,
    filterDesignation,
    filterTeamId,
    filterUserId,
  ]);

  const { startDate, endDate } = getDateRange(timePreset, customStartDate, customEndDate);

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

  const { data, isLoading, error } = useSWR(activityKey, () => activitiesApi.list(activityParams));

  useEffect(() => {
    setExtraActivities([]);
    setLoadMorePage(1);
    setOpenEntities(new Set());
    setOpenDateGroups(new Set());
  }, [
    effectiveScope,
    resourceType,
    activityType,
    startDate,
    endDate,
    effectiveUserId,
    effectiveTeamId,
    effectiveDeptId,
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

  const { data: statsData } = useSWR(statsKey, () => activitiesApi.getStats(statsParams));

  const refreshActivityData = useCallback(async () => {
    if (!activityKey || !statsKey) return;
    setExtraActivities([]);
    setLoadMorePage(1);
    await Promise.all([mutate(activityKey), mutate(statsKey)]);
  }, [activityKey, statsKey]);

  useHeaderRefresh({ onRefresh: refreshActivityData, enabled: Boolean(user) });

  const activities: ActivityLog[] = data?.data || [];
  const meta = data?.meta || { total: 0 };
  const allActivities = useMemo(() => [...activities, ...extraActivities], [activities, extraActivities]);
  const summaryItems = useMemo(() => getSummaryItems(allActivities), [allActivities]);
  const baseVisibleActivities = useMemo(
    () => allActivities.filter((activity) => matchesQuickFilter(activity, quickFilter)),
    [allActivities, quickFilter],
  );
  const visibleActivities = useMemo(
    () =>
      baseVisibleActivities.filter((activity) =>
        showSystemEvents ? true : !SYSTEM_ACTIVITY_TYPES.has(activity.activity_type),
      ),
    [baseVisibleActivities, showSystemEvents],
  );
  const groupedActivities = useMemo(() => buildResourceGroups(visibleActivities), [visibleActivities]);
  const hiddenSystemCount = useMemo(
    () =>
      baseVisibleActivities.filter((activity) =>
        SYSTEM_ACTIVITY_TYPES.has(activity.activity_type),
      ).length,
    [baseVisibleActivities],
  );

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

  const showUserFilterPanel = (isAdmin || isManager) && scope !== "self";
  const scopeNeedsDept = scope === "department" && isAdmin;
  const scopeNeedsUser = scope === "member";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Activity Timeline</h1>
          <p className="mt-1 text-slate-600">
            Follow the CRM story by resource, entity, and time block instead of a flat event log.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="secondary" className="px-3 py-1 text-sm font-medium">
            {meta.total} total records
          </Badge>
          {quickFilter !== "all" && (
            <Button variant="outline" size="sm" onClick={() => setQuickFilter("all")}>
              Clear summary filter
            </Button>
          )}
        </div>
      </div>
      <Card className="border-slate-200">
        <CardContent className="space-y-4 p-5">
          <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-900">Today&apos;s Activity</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {summaryItems.map((item) => {
                  const isActive = quickFilter === item.id;
                  return (
                    <Button
                      key={item.id}
                      type="button"
                      variant={isActive ? "default" : "outline"}
                      size="sm"
                      onClick={() => setQuickFilter(isActive ? "all" : item.id)}
                      className={cn(
                        "h-auto rounded-full px-3 py-1.5 font-medium",
                        isActive
                          ? "bg-slate-900 text-white hover:bg-slate-800"
                          : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100",
                      )}
                    >
                      {item.title} ({item.value})
                    </Button>
                  );
                })}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-600">Show system events</span>
              <Switch checked={showSystemEvents} onCheckedChange={setShowSystemEvents} />
            </div>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Date Range
              </label>
              <Select value={timePreset} onValueChange={(value) => setTimePreset(value as TimePreset)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="yesterday">Yesterday</SelectItem>
                  <SelectItem value="this-week">This Week</SelectItem>
                  <SelectItem value="this-month">This Month</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {timePreset === "custom" && (
              <>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    From
                  </label>
                  <Input
                    type="date"
                    value={customStartDate}
                    onChange={(event) => setCustomStartDate(event.target.value)}
                    className="w-40"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    To
                  </label>
                  <Input
                    type="date"
                    value={customEndDate}
                    onChange={(event) => setCustomEndDate(event.target.value)}
                    className="w-40"
                  />
                </div>
              </>
            )}
          </div>

          <div className="h-px bg-slate-100" />

          <div className="flex flex-wrap items-end gap-3">
            {(isAdmin || isManager) && (
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  User Scope
                </label>
                <Select value={scope} onValueChange={(value) => setScope(value as ActivityScope)}>
                  <SelectTrigger className="w-52">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {scopeOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
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

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Resource Type
              </label>
              <Select value={resourceType} onValueChange={setResourceType}>
                <SelectTrigger className="w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Resources</SelectItem>
                  <SelectItem value="lead">Leads</SelectItem>
                  <SelectItem value="task">Tasks</SelectItem>
                  <SelectItem value="user">Users</SelectItem>
                  <SelectItem value="attendance">Attendance</SelectItem>
                  <SelectItem value="project">Projects</SelectItem>
                  <SelectItem value="team">Teams</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {showUserFilterPanel && (
            <div className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              {isAdmin && scope !== "team" && (
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Department
                    {scopeNeedsDept && <span className="ml-1 text-red-500">*</span>}
                  </label>
                  <Select
                    value={filterDeptId || "all"}
                    onValueChange={(value) => setFilterDeptId(value === "all" ? "" : value)}
                  >
                    <SelectTrigger className="w-52 bg-white">
                      <SelectValue placeholder="All Departments" />
                    </SelectTrigger>
                    <SelectContent>
                      {!scopeNeedsDept && <SelectItem value="all">All Departments</SelectItem>}
                      {departments.map((department) => (
                        <SelectItem key={department.id} value={department.id}>
                          {department.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {isAdmin && scope === "team" && (
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Team <span className="ml-1 text-red-500">*</span>
                  </label>
                  <Select value={filterTeamId || ""} onValueChange={setFilterTeamId}>
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

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Designation
                </label>
                <Select value={filterDesignation} onValueChange={setFilterDesignation}>
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

              {scope !== "team" && (
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    User
                    {scopeNeedsUser && <span className="ml-1 text-red-500">*</span>}
                  </label>
                  <Select
                    value={filterUserId || "all"}
                    onValueChange={(value) => setFilterUserId(value === "all" ? "" : value)}
                    disabled={userOptions.length === 0}
                  >
                    <SelectTrigger className="w-56 bg-white">
                      <SelectValue placeholder={scopeNeedsUser ? "Select User" : "All Users"} />
                    </SelectTrigger>
                    <SelectContent>
                      {!scopeNeedsUser && <SelectItem value="all">All Users</SelectItem>}
                      {userOptions.map((option) => (
                        <SelectItem key={option.id} value={option.id}>
                          <span>{option.fullName}</span>
                          <span className="ml-1.5 text-xs capitalize text-slate-400">
                            ({option.role || "-"})
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <button
                type="button"
                onClick={() => {
                  setFilterDeptId("");
                  setFilterDesignation("all");
                  setFilterTeamId("");
                  setFilterUserId("");
                }}
                className="self-end pb-2 text-xs text-slate-500 underline underline-offset-2 transition-colors hover:text-slate-800"
              >
                Reset
              </button>
            </div>
          )}
        </CardContent>
      </Card>
      <Card className="border-slate-200">
        <CardHeader className="border-b border-slate-100">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <CardTitle className="flex items-center gap-2 text-xl text-slate-900">
              <Activity className="h-5 w-5" />
              Structured Activity Feed
            </CardTitle>
            <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
              <Badge variant="outline">{groupedActivities.length} resource groups</Badge>
              <Badge variant="outline">{visibleActivities.length} visible items</Badge>
              {!showSystemEvents && hiddenSystemCount > 0 && (
                <Badge variant="secondary">{hiddenSystemCount} system events hidden</Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-5">
          {!canQueryActivities ? (
            <div className="py-12 text-center text-slate-500">
              {scopeNeedsDept
                ? "Select a department to load activity."
                : scopeNeedsUser
                  ? "Select a user to load activity."
                  : "Select the required filters to load activity."}
            </div>
          ) : isLoading ? (
            <div className="space-y-4">
              {[...Array(6)].map((_, index) => (
                <Skeleton key={index} className="h-28" />
              ))}
            </div>
          ) : error ? (
            <div className="py-12 text-center text-red-500">Failed to load activities</div>
          ) : groupedActivities.length === 0 ? (
            <div className="py-12 text-center text-slate-500">
              <Activity className="mx-auto mb-4 h-12 w-12 text-slate-300" />
              <p>No activities found for the current filters.</p>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                {groupedActivities.map((group) => {
                  const GroupIcon = group.icon;
                  const isOpen = openResources.has(group.key);
                  const dateEntitySections = buildDateEntitySections(group.entities, timePreset);

                  return (
                    <Collapsible
                      key={group.key}
                      open={isOpen}
                      onOpenChange={(nextOpen) =>
                        setOpenResources((prev) => {
                          const next = new Set(prev);
                          if (nextOpen) next.add(group.key);
                          else next.delete(group.key);
                          return next;
                        })
                      }
                    >
                      <div
                        className={cn(
                          "overflow-hidden rounded-2xl border border-slate-200",
                          group.accentClass,
                        )}
                      >
                        <CollapsibleTrigger className="w-full">
                          <div className="flex items-center justify-between gap-4 px-5 py-4 text-left">
                            <div className="flex items-center gap-4">
                              <div className="rounded-xl bg-white/80 p-3 shadow-sm">
                                <GroupIcon className="h-5 w-5 text-slate-700" />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <h3 className="text-lg font-semibold text-slate-900">{group.label}</h3>
                                  <Badge variant="secondary">{group.activities.length}</Badge>
                                </div>
                                <p className="text-sm text-slate-500">
                                  {group.entities.length} grouped {group.entities.length === 1 ? "entity" : "entities"}
                                </p>
                              </div>
                            </div>
                            <div className="rounded-full bg-white/80 p-2">
                              {isOpen ? (
                                <ChevronDown className="h-4 w-4 text-slate-700" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-slate-700" />
                              )}
                            </div>
                          </div>
                        </CollapsibleTrigger>

                        <CollapsibleContent>
                          <div className="space-y-4 border-t border-white/70 bg-white/60 p-4">
                            {isDateAccordionRange(timePreset)
                              ? dateEntitySections.map((dateSection) => {
                                  const dateSectionKey = `${group.key}-${dateSection.key}`;
                                  const isDateSectionOpen = openDateGroups.has(dateSectionKey);

                                  return (
                                    <Collapsible
                                      key={dateSectionKey}
                                      open={isDateSectionOpen}
                                      onOpenChange={(nextOpen) =>
                                        setOpenDateGroups((prev) => {
                                          const next = new Set(prev);
                                          if (nextOpen) next.add(dateSectionKey);
                                          else next.delete(dateSectionKey);
                                          return next;
                                        })
                                      }
                                    >
                                      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                                        <CollapsibleTrigger className="w-full">
                                          <div className="flex items-center justify-between gap-4 px-4 py-4 text-left">
                                            <div>
                                              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                                                {dateSection.label}
                                              </p>
                                              <h4 className="mt-1 text-lg font-semibold text-slate-900">
                                                {dateSection.entities.length}{" "}
                                                {group.key === "lead"
                                                  ? dateSection.entities.length === 1
                                                    ? "lead"
                                                    : "leads"
                                                  : dateSection.entities.length === 1
                                                    ? "entity"
                                                    : "entities"}
                                              </h4>
                                            </div>
                                            <div className="flex items-center gap-3">
                                              <Badge variant="outline">
                                                {dateSection.entities.length} grouped
                                              </Badge>
                                              {isDateSectionOpen ? (
                                                <ChevronDown className="h-4 w-4 text-slate-500" />
                                              ) : (
                                                <ChevronRight className="h-4 w-4 text-slate-500" />
                                              )}
                                            </div>
                                          </div>
                                        </CollapsibleTrigger>

                                        <CollapsibleContent>
                                          <div className="space-y-4 border-t border-slate-100 px-4 py-4">
                                            {dateSection.entities.map((entity) => {
                                              const isEntityOpen = openEntities.has(entity.entityId);
                                              const timeSections = buildTimeSections(
                                                entity.activities,
                                                timePreset,
                                              );

                                              return (
                                                <Collapsible
                                                  key={entity.entityId}
                                                  open={isEntityOpen}
                                                  onOpenChange={(nextOpen) =>
                                                    setOpenEntities((prev) => {
                                                      const next = new Set(prev);
                                                      if (nextOpen) next.add(entity.entityId);
                                                      else next.delete(entity.entityId);
                                                      return next;
                                                    })
                                                  }
                                                >
                                                  <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                                                    <CollapsibleTrigger className="w-full">
                                                      <div className="flex items-center justify-between gap-4 px-4 py-4 text-left">
                                                        <div>
                                                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                                                            {entity.resourceLabel}
                                                          </p>
                                                          <h4 className="mt-1 text-lg font-semibold text-slate-900">
                                                            {entity.entityName}
                                                          </h4>
                                                        </div>
                                                        <div className="flex items-center gap-3">
                                                          <Badge variant="outline">
                                                            {entity.activities.length} events
                                                          </Badge>
                                                          {isEntityOpen ? (
                                                            <ChevronDown className="h-4 w-4 text-slate-500" />
                                                          ) : (
                                                            <ChevronRight className="h-4 w-4 text-slate-500" />
                                                          )}
                                                        </div>
                                                      </div>
                                                    </CollapsibleTrigger>

                                                    <CollapsibleContent>
                                                      <div className="border-t border-slate-100 px-4 py-4">
                                                        <div className="space-y-5">
                                                          {timeSections.map((section) => (
                                                            <div key={`${entity.entityId}-${section.key}`} className="space-y-3">
                                                              <div className="space-y-3">
                                                                {section.activities.map((activity) =>
                                                                  renderActivityItem({
                                                                    activity,
                                                                    entityName: entity.entityName,
                                                                    expandedActivities,
                                                                    setExpandedActivities,
                                                                  }),
                                                                )}
                                                              </div>
                                                            </div>
                                                          ))}
                                                        </div>
                                                      </div>
                                                    </CollapsibleContent>
                                                  </div>
                                                </Collapsible>
                                              );
                                            })}
                                          </div>
                                        </CollapsibleContent>
                                      </div>
                                    </Collapsible>
                                  );
                                })
                              : group.entities.map((entity) => {
                              const isEntityOpen = openEntities.has(entity.entityId);
                              const timeSections = buildTimeSections(entity.activities, timePreset);

                              return (
                                <Collapsible
                                  key={entity.entityId}
                                  open={isEntityOpen}
                                  onOpenChange={(nextOpen) =>
                                    setOpenEntities((prev) => {
                                      const next = new Set(prev);
                                      if (nextOpen) next.add(entity.entityId);
                                      else next.delete(entity.entityId);
                                      return next;
                                    })
                                  }
                                >
                                  <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                                    <CollapsibleTrigger className="w-full">
                                      <div className="flex items-center justify-between gap-4 px-4 py-4 text-left">
                                        <div>
                                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                                            {entity.resourceLabel}
                                          </p>
                                          <h4 className="mt-1 text-lg font-semibold text-slate-900">
                                            {entity.entityName}
                                          </h4>
                                        </div>
                                        <div className="flex items-center gap-3">
                                          <Badge variant="outline">{entity.activities.length} events</Badge>
                                          {isEntityOpen ? (
                                            <ChevronDown className="h-4 w-4 text-slate-500" />
                                          ) : (
                                            <ChevronRight className="h-4 w-4 text-slate-500" />
                                          )}
                                        </div>
                                      </div>
                                    </CollapsibleTrigger>

                                    <CollapsibleContent>
                                      <div className="border-t border-slate-100 px-4 py-4">
                                        <div className="space-y-5">
                                          {timeSections.map((section) => {
                                            const sectionKey = `${entity.entityId}-${section.key}`;
                                            const isDateSectionOpen = openDateGroups.has(sectionKey);

                                            return (
                                              <div key={sectionKey} className="space-y-3">
                                                {section.collapsible ? (
                                                  <Collapsible
                                                    open={isDateSectionOpen}
                                                    onOpenChange={(nextOpen) =>
                                                      setOpenDateGroups((prev) => {
                                                        const next = new Set(prev);
                                                        if (nextOpen) next.add(sectionKey);
                                                        else next.delete(sectionKey);
                                                        return next;
                                                      })
                                                    }
                                                  >
                                                    <CollapsibleTrigger className="w-full">
                                                      <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-left">
                                                        <div className="flex items-center gap-3">
                                                          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                                                            {section.label}
                                                          </p>
                                                          <Badge variant="outline">
                                                            {section.activities.length} events
                                                          </Badge>
                                                        </div>
                                                        {isDateSectionOpen ? (
                                                          <ChevronDown className="h-4 w-4 text-slate-500" />
                                                        ) : (
                                                          <ChevronRight className="h-4 w-4 text-slate-500" />
                                                        )}
                                                      </div>
                                                    </CollapsibleTrigger>
                                                    <CollapsibleContent className="pt-3">
                                                      <div className="space-y-3">
                                                        {section.activities.map((activity) =>
                                                          renderActivityItem({
                                                            activity,
                                                            entityName: entity.entityName,
                                                            expandedActivities,
                                                            setExpandedActivities,
                                                          }),
                                                        )}
                                                      </div>
                                                    </CollapsibleContent>
                                                  </Collapsible>
                                                ) : (
                                                  <>
                                                    <div className="flex items-center gap-3">
                                                      <div className="h-px flex-1 bg-slate-100" />
                                                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                                                        {section.label}
                                                      </p>
                                                      <div className="h-px flex-1 bg-slate-100" />
                                                    </div>

                                                    <div className="space-y-3">
                                                      {section.activities.map((activity) =>
                                                        renderActivityItem({
                                                          activity,
                                                          entityName: entity.entityName,
                                                          expandedActivities,
                                                          setExpandedActivities,
                                                        }),
                                                      )}
                                                    </div>
                                                  </>
                                                )}
                                              </div>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    </CollapsibleContent>
                                  </div>
                                </Collapsible>
                              );
                            })}
                          </div>
                        </CollapsibleContent>
                      </div>
                    </Collapsible>
                  );
                })}
              </div>

              {!isLoading && meta.total > allActivities.length && (
                <div className="pt-6 text-center">
                  <Button variant="outline" onClick={handleLoadMore} disabled={isLoadingMore}>
                    {isLoadingMore
                      ? "Loading more activity..."
                      : `Load more (${meta.total - allActivities.length} remaining)`}
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
