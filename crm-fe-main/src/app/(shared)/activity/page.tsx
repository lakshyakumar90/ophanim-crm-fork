"use client";

import type { Dispatch, ElementType, SetStateAction } from "react";
import { useCallback, useEffect, useMemo, useState, useRef } from "react";
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
  Search,
  Filter as FilterIcon,
  X,
  Settings2
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
  userMap?: Map<string, string>
): ActivityChange[] => {
  if (!metadata || activityType === "comment") return [];

  const changes: ActivityChange[] = [];

  const formatMetadataValue = (key: string, val: any): string => {
    if (val === null || val === undefined) return "-";
    
    // User resolution
    if (
      (key.toLowerCase().includes("user") || 
       key.toLowerCase().includes("assign") || 
       key.toLowerCase().includes("member")) && 
      typeof val === "string" && 
      userMap?.has(val)
    ) {
      return userMap.get(val)!;
    }

    // Date resolution - match common date keys or ISO strings
    if (
      (key.toLowerCase().includes("date") || key.toLowerCase().endsWith("at")) && 
      typeof val === "string" && 
      /^\d{4}-\d{2}-\d{2}/.test(val)
    ) {
      try {
        return formatIST(val, "MMM d, yyyy");
      } catch (e) {
        return String(val);
      }
    }

    if (typeof val === "boolean") return val ? "Yes" : "No";
    if (Array.isArray(val)) return val.map(v => formatValue(v)).join(", ") || "-";
    if (typeof val === "object") return JSON.stringify(val);
    return String(val);
  };

  // Capture from_status and to_status safely if they exist, ignoring general keys.
  if (("from_status" in metadata && "to_status" in metadata) || activityType === "status_change") {
    const oldStatus = formatValue(metadata.from_status || metadata.from || metadata.old_status);
    const newStatus = formatValue(metadata.to_status || metadata.to || metadata.new_status);
    
    if (oldStatus !== newStatus || activityType === "status_change") {
      changes.push({
        field: "Status",
        oldVal: oldStatus,
        newVal: newStatus,
      });
    }
    
    // If it's pure status_change we return, but if it's an update with status we can continue parsing others
    if (activityType === "status_change" || (Object.keys(metadata).length <= 2 && oldStatus !== newStatus)) return changes;
  }

  const metadataKeys = Object.keys(metadata);

  Object.entries(metadata).forEach(([key, value]) => {
    if (
      value === null ||
      value === undefined ||
      key === "comment_preview" ||
      key === "commented_on" ||
      key === "from_status" ||
      key === "to_status"
    ) {
      return;
    }

    // If this is a summary key like 'updates', check if we have individual field keys.
    // If we do, skip the summary key to avoid clutter.
    if (key === "updates" || key === "changed_fields") {
       const updatesList = Array.isArray(value) ? value : String(value).split(",");
       const hasIndividualKeys = updatesList.some(f => metadataKeys.includes(String(f).trim()));
       if (hasIndividualKeys) return; 
    }

    let oldValStr = "";
    let newValStr = "";

    // Support nested object patterns like { old: "A", new: "B" }
    if (typeof value === "object" && !Array.isArray(value)) {
      const vObj = value as Record<string, any>;
      const hasOldNew = ("old" in vObj && "new" in vObj) || ("from" in vObj && "to" in vObj);
      
      if (hasOldNew) {
         let oldV = "old" in vObj ? vObj.old : vObj.from;
         let newV = "new" in vObj ? vObj.new : vObj.to;
         
         oldValStr = formatMetadataValue(key, oldV);
         newValStr = formatMetadataValue(key, newV);
      } else {
         newValStr = formatMetadataValue(key, value);
      }
    } else {
      newValStr = formatMetadataValue(key, value);
    }

    if (oldValStr && newValStr && oldValStr === newValStr) return;

    changes.push({
      field: formatFieldName(key),
      oldVal: oldValStr,
      newVal: newValStr,
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

const buildTimeSections = (activities: ActivityLog[]): TimeSection[] => {
  const dateMap = new Map<string, TimeSection>();

  activities.forEach((activity) => {
    const key = getDateKey(activity.created_at);
    const existing = dateMap.get(key);
    if (existing) {
      existing.activities.push(activity);
      return;
    }

    const today = formatInTimeZone(new Date(), IST_TIMEZONE, "yyyy-MM-dd");
    const yesterday = formatInTimeZone(subDays(new Date(), 1), IST_TIMEZONE, "yyyy-MM-dd");
    let label = getDateLabel(activity.created_at);
    if (key === today) label = "Today";
    else if (key === yesterday) label = "Yesterday";

    dateMap.set(key, {
      key,
      label,
      activities: [activity],
      collapsible: true, // Only for potential compatibility elsewhere, Timeline doesn't use it
    });
  });

  return [...dateMap.values()].sort((a, b) => b.key.localeCompare(a.key));
};

interface DateResourceGroup {
  key: ResourceGroupKey;
  label: string;
  icon: ElementType;
  accentClass: string;
  activities: ActivityLog[];
}

interface DateDetailedSection {
  dateKey: string;
  dateLabel: string;
  resources: DateResourceGroup[];
}

const buildDetailedSections = (activities: ActivityLog[]): DateDetailedSection[] => {
  const dateMap = new Map<string, DateDetailedSection>();
  
  activities.forEach(activity => {
    const dateKey = getDateKey(activity.created_at);
    let section = dateMap.get(dateKey);
    if (!section) {
      const today = formatInTimeZone(new Date(), IST_TIMEZONE, "yyyy-MM-dd");
      const yesterday = formatInTimeZone(subDays(new Date(), 1), IST_TIMEZONE, "yyyy-MM-dd");
      let dLabel = getDateLabel(activity.created_at);
      if (dateKey === today) dLabel = "Today";
      else if (dateKey === yesterday) dLabel = "Yesterday";
      
      section = { dateKey, dateLabel: dLabel, resources: [] };
      dateMap.set(dateKey, section);
    }
    
    const resourceKey = getResourceGroupKey(activity);
    let rGroup = section.resources.find(r => r.key === resourceKey);
    if (!rGroup) {
      rGroup = {
        key: resourceKey,
        label: resourceLabels[resourceKey],
        icon: resourceIcons[resourceKey],
        accentClass: resourceAccent[resourceKey],
        activities: [],
      };
      section.resources.push(rGroup);
    }
    
    rGroup.activities.push(activity);
  });
  
  const order: ResourceGroupKey[] = ["lead", "task", "user", "attendance", "project", "other"];
  const sortedDates = [...dateMap.values()].sort((a, b) => b.dateKey.localeCompare(a.dateKey));
  
  sortedDates.forEach(dateSec => {
    dateSec.resources.sort((a, b) => order.indexOf(a.key) - order.indexOf(b.key));
  });
  
  return sortedDates;
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

// Extant code removed to save lines. Group structures replaced by buildDetailedSections

const renderActivityItem = ({
  activity,
  entityName,
  expandedActivities,
  setExpandedActivities,
  userMap,
}: {
  activity: ActivityLog;
  entityName: string;
  expandedActivities: Set<string>;
  setExpandedActivities: Dispatch<SetStateAction<Set<string>>>;
  userMap?: Map<string, string>;
}) => {
  const ActionIcon = actionIcons[activity.activity_type] || Activity;
  const colorClass =
    actionColors[activity.activity_type] || "bg-slate-100 text-slate-700 ring-slate-200";
  const changes = getChangesFromMetadata(activity.metadata, activity.activity_type, userMap);
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
                  className="grid gap-2 text-sm md:grid-cols-[140px_1fr_1fr]"
                >
                  <span className="font-semibold text-slate-500 uppercase tracking-widest text-[10px]">{change.field}</span>
                  <span className="text-slate-400 line-through truncate">{change.oldVal || "-"}</span>
                  <span className="text-slate-900 font-medium truncate">{change.newVal}</span>
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


const renderTimelineActivityItem = ({
  activity,
  entityName,
  expandedActivities,
  setExpandedActivities,
  userMap,
}: {
  activity: ActivityLog;
  entityName: string;
  expandedActivities: Dispatch<SetStateAction<Set<string>>> | any;
  setExpandedActivities: Dispatch<SetStateAction<Set<string>>> | any;
  userMap?: Map<string, string>;
}) => {
  const ActionIcon = actionIcons[activity.activity_type] || Activity;
  const colorClass = actionColors[activity.activity_type] || "bg-slate-100 text-slate-700 ring-slate-200";
  const changes = getChangesFromMetadata(activity.metadata, activity.activity_type, userMap);
  const commentPreview =
    typeof activity.metadata?.comment_preview === "string" ? activity.metadata.comment_preview : null;
  const isExpanded = expandedActivities.has(activity.id);

  return (
    <div key={activity.id} className="relative flex items-start gap-4 group">
      {/* Timeline Time and Node */}
      <div className="flex flex-col items-center gap-1 w-[50px] sm:w-[60px] shrink-0 pt-0.5">
        <span className="text-[11px] sm:text-xs font-semibold text-slate-500">{formatIST(activity.created_at, "HH:mm")}</span>
        <div className={cn("relative z-10 rounded-full p-1.5 ring-4 ring-white bg-white", colorClass)}>
          <ActionIcon className="h-3.5 w-3.5" />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pb-6 border-b border-slate-100 group-last:border-transparent transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1">
          <p className="text-sm text-slate-700 leading-snug">
            <span className="font-bold text-slate-900">{activity.user?.full_name || "System"}</span>{" "}
            <span className="font-medium text-slate-600">{formatActivityDescription(activity)}</span>{" "}
            {entityName !== "Activity" && (
              <span className="font-semibold text-[10px] tracking-widest uppercase bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded ml-1">
                {entityName}
              </span>
            )}
          </p>
          <span className="text-xs text-slate-400 shrink-0 whitespace-nowrap hidden sm:block">
            {formatDistanceToNowIST(activity.created_at, { addSuffix: true })}
          </span>
        </div>

        {changes.length > 0 && (
          <button
            type="button"
            onClick={() =>
              setExpandedActivities((prev: any) => {
                const next = new Set(prev);
                if (next.has(activity.id)) next.delete(activity.id);
                else next.add(activity.id);
                return next;
              })
            }
            className="mt-1.5 flex items-center gap-1 text-xs font-medium text-blue-600 transition-colors hover:text-blue-800"
          >
            {isExpanded ? (
              <><ChevronUp className="h-3 w-3" /> Hide changes</>
            ) : (
              <><ChevronDown className="h-3 w-3" /> View changes ({changes.length})</>
            )}
          </button>
        )}

        {commentPreview && (
          <p className="mt-2 text-sm italic text-slate-600 border-l-2 border-slate-300 pl-3 py-1 bg-slate-50/50 rounded-r-md">
            &quot;{commentPreview}&quot;
          </p>
        )}

        {isExpanded && changes.length > 0 && (
          <div className="mt-2 space-y-1.5 rounded-lg border border-slate-200 bg-slate-50/50 p-3">
            {changes.map((change, index) => (
              <div key={`${activity.id}-${index}`} className="grid gap-2 text-sm md:grid-cols-[140px_1fr_1fr]">
                <span className="font-semibold text-slate-500 uppercase tracking-widest text-[10px]">{change.field}</span>
                <span className="text-slate-400 line-through truncate">{change.oldVal || "-"}</span>
                <span className="text-slate-900 font-medium truncate">{change.newVal}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
function ScrollAnchor({ onIntersect, disabled }: { onIntersect: () => void; disabled?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current || disabled) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) onIntersect();
    });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [onIntersect, disabled]);
  return <div ref={ref} className="h-4 w-full opacity-0 pointer-events-none" aria-hidden="true" />;
}

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

    const [viewMode, setViewMode] = useState<"timeline" | "detailed">("timeline");
  const [searchQuery, setSearchQuery] = useState("");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(() => {
    if (typeof window === "undefined") return false;
    const url = new URLSearchParams(window.location.search);
    return Boolean(url.get("userId") || url.get("teamId") || (url.get("rtype") && url.get("rtype") !== "all") || url.get("preset") === "custom");
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
    if (viewMode !== "timeline") params.set("view", viewMode);
    if (searchQuery) params.set("q", searchQuery);
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
    (isAdmin || isManager)
      ? [
          "activity-filter-users-all",
          userListParams?.departmentId || "",
          userListParams?.teamId || "",
          userListParams?.role || "",
        ]
      : null;

  const { data: usersData } = useSWR(usersKey, () => usersApi.list(userListParams!));
  const userOptions: UserOption[] = usersData?.data || [];

  const userMap = useMemo(() => {
    const map = new Map<string, string>();
    userOptions.forEach(u => map.set(u.id, u.fullName));
    return map;
  }, [userOptions]);

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
  const visibleActivities = useMemo(() => {
    let evs = baseVisibleActivities;
    if (!showSystemEvents) {
      evs = evs.filter((a) => !SYSTEM_ACTIVITY_TYPES.has(a.activity_type));
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      evs = evs.filter((a) => 
        (a.user?.full_name || "").toLowerCase().includes(q) ||
        (formatActivityDescription(a)).toLowerCase().includes(q) ||
        (getEntityLabel(a)).toLowerCase().includes(q) ||
        (a.activity_type || "").toLowerCase().includes(q)
      );
    }
    return evs;
  }, [baseVisibleActivities, showSystemEvents, searchQuery]);
  const detailedSections = useMemo(() => buildDetailedSections(visibleActivities), [visibleActivities]);
  const hiddenSystemCount = useMemo(
    () =>
      baseVisibleActivities.filter((activity) =>
        SYSTEM_ACTIVITY_TYPES.has(activity.activity_type),
      ).length,
    [baseVisibleActivities],
  );

  const activeFilterLabels = useMemo(() => {
    const labels = [];
    if (timePreset !== "today") labels.push(timePreset === "custom" ? "Custom Range" : timePreset.replace("-", " "));
    if (activityType !== "all") labels.push(formatFieldName(activityType));
    if (resourceType !== "all") labels.push(resourceLabels[resourceType as ResourceGroupKey] || resourceType);
    if (filterDeptId) labels.push("Department");
    if (filterTeamId) labels.push("Team");
    if (filterDesignation !== "all") labels.push(filterDesignation);
    if (filterUserId && userOptions.length) {
      const u = userOptions.find(u => u.id === filterUserId);
      if (u) labels.push(u.fullName);
    }
    return labels;
  }, [timePreset, activityType, resourceType, filterDeptId, filterTeamId, filterDesignation, filterUserId, userOptions]);


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
      <Card className="border-slate-200 overflow-visible shadow-sm">
        <CardContent className="space-y-4 p-5">
          {/* Summary String */}
          <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50/70 p-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-slate-900">
                Showing {visibleActivities.length} activities
              </span>
              {activeFilterLabels.length > 0 && (
                <span className="text-sm text-slate-600">
                  • Filtered by: <span className="font-medium capitalize text-slate-800">{activeFilterLabels.join(" • ")}</span>
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-slate-600">Show system events</span>
              <Switch checked={showSystemEvents} onCheckedChange={setShowSystemEvents} />
            </div>
          </div>

          {/* Primary Filters Row */}
          <div className="flex flex-wrap items-end gap-3 pt-1">
            <div className="flex-1 min-w-[200px] flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                Search
              </label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                <Input 
                  placeholder="Search activities..." 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-9 h-10 w-full"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-widest text-slate-500">Date Range</label>
              <Select value={timePreset} onValueChange={(value) => setTimePreset(value as TimePreset)}>
                <SelectTrigger className="w-40 h-10"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="yesterday">Yesterday</SelectItem>
                  <SelectItem value="this-week">This Week</SelectItem>
                  <SelectItem value="this-month">This Month</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-widest text-slate-500">Activity Type</label>
              <Select value={activityType} onValueChange={setActivityType}>
                <SelectTrigger className="w-40 h-10"><SelectValue placeholder="All Types" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="create">Created</SelectItem>
                  <SelectItem value="update">Updated</SelectItem>
                  <SelectItem value="status_change">Status Change</SelectItem>
                  <SelectItem value="comment">Comment</SelectItem>
                  <SelectItem value="complete">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(isAdmin || isManager) && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-widest text-slate-500">User Scope</label>
                <Select value={scope} onValueChange={(value) => setScope(value as ActivityScope)}>
                  <SelectTrigger className="w-48 h-10"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {scopeOptions.map((o) => (<SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <Button 
              variant={showAdvancedFilters ? "secondary" : "outline"} 
              className="h-10 gap-2" 
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            >
              <FilterIcon className="h-4 w-4" />
              Advanced
            </Button>
          </div>

          {/* Advanced Filters */}
          {showAdvancedFilters && (
            <div className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 mt-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-widest text-slate-500">Resource Type</label>
                <Select value={resourceType} onValueChange={setResourceType}>
                  <SelectTrigger className="w-44 bg-white"><SelectValue placeholder="All Resources" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Resources</SelectItem>
                    <SelectItem value="lead">Leads</SelectItem>
                    <SelectItem value="task">Tasks</SelectItem>
                    <SelectItem value="attendance">Attendance</SelectItem>
                    <SelectItem value="project">Projects</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {isAdmin && scope !== "team" && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold uppercase tracking-widest text-slate-500">Org Filter (Dept)</label>
                  <Select value={filterDeptId || "all"} onValueChange={(v) => setFilterDeptId(v === "all" ? "" : v)}>
                    <SelectTrigger className="w-48 bg-white"><SelectValue placeholder="All Departments" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Departments</SelectItem>
                      {departments.map((d) => (<SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {isAdmin && scope === "team" && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold uppercase tracking-widest text-slate-500">Org Filter (Team)</label>
                  <Select value={filterTeamId || ""} onValueChange={setFilterTeamId}>
                    <SelectTrigger className="w-48 bg-white"><SelectValue placeholder="Select Team" /></SelectTrigger>
                    <SelectContent>
                      {teamsForScope.map((team) => (<SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-widest text-slate-500">Role Filter</label>
                <Select value={filterDesignation} onValueChange={setFilterDesignation}>
                  <SelectTrigger className="w-44 bg-white"><SelectValue placeholder="All Roles" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    {isAdmin && <SelectItem value="admin">Admin</SelectItem>}
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="employee">Employee</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {showUserFilterPanel && scope !== "team" && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold uppercase tracking-widest text-slate-500">User</label>
                  <Select value={filterUserId || "all"} onValueChange={(v) => setFilterUserId(v === "all" ? "" : v)}>
                    <SelectTrigger className="w-56 bg-white"><SelectValue placeholder="All Users" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Users</SelectItem>
                      {userOptions.map((o) => (<SelectItem key={o.id} value={o.id}>{o.fullName}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}

          {/* Smart Filter Chips */}
          {activeFilterLabels.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 mt-2">
              <span className="text-xs font-semibold uppercase tracking-widest text-slate-500">Active Filters:</span>
              {activeFilterLabels.map((lbl, i) => (
                <Badge key={i} variant="secondary" className="px-2.5 py-1 rounded border-slate-200 text-xs font-semibold capitalize bg-white text-slate-700">
                  {lbl} <X className="h-3 w-3 ml-1.5 -mr-0.5 opacity-50 block" /> {/* Pseudo delete icon, full delete handled by clear all for now */}
                </Badge>
              ))}
              <button 
                onClick={() => {
                  setTimePreset("today");
                  setActivityType("all");
                  setResourceType("all");
                  setFilterDeptId("");
                  setFilterTeamId("");
                  setFilterDesignation("all");
                  setFilterUserId("");
                }}
                className="text-xs font-medium text-blue-600 ml-2 hover:underline"
              >
                Clear all
              </button>
            </div>
          )}
        </CardContent>
      </Card>
      <Card className="border-slate-200 border-none shadow-none bg-transparent">
        <CardHeader className="px-0 pt-2 pb-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <CardTitle className="flex items-center gap-2 text-xl text-slate-900 font-bold">
              <Activity className="h-5 w-5 text-primary" />
              Activity Feed
            </CardTitle>
            
            <div className="flex items-center gap-2">
               <div className="flex p-1 rounded-lg border border-slate-200 bg-white shadow-sm">
                 <button 
                    onClick={() => setViewMode("timeline")} 
                    className={cn("px-4 py-1.5 text-xs font-semibold rounded-md transition-all", viewMode === "timeline" ? "bg-slate-900 text-white shadow" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900")}
                 >
                   Timeline
                 </button>
                 <button 
                    onClick={() => setViewMode("detailed")} 
                    className={cn("px-4 py-1.5 text-xs font-semibold rounded-md transition-all", viewMode === "detailed" ? "bg-slate-900 text-white shadow" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900")}
                 >
                   Detailed View
                 </button>
               </div>
            </div>
          </div>
          {/* We hide the old badge array or keep it minimal */}
          <div className="hidden">
              <Badge variant="outline">{detailedSections.length} resource groups</Badge>
              <Badge variant="outline">{visibleActivities.length} visible items</Badge>
              {!showSystemEvents && hiddenSystemCount > 0 && (
                <Badge variant="secondary">{hiddenSystemCount} system events hidden</Badge>
              )}
            </div>
        </CardHeader>
        <CardContent className="p-0 sm:p-2">
          {viewMode === "timeline" && canQueryActivities && !isLoading && !error && visibleActivities.length > 0 && (
             <div className="space-y-8 max-w-4xl pt-4 pb-12 w-full">
               {buildTimeSections(visibleActivities).map(section => (
                  <div key={section.key} className="relative">
                    <div className="bg-background/95 backdrop-blur-sm py-2 px-1 mb-4 my-2 flex items-center gap-3">
                       <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">{section.label}</h3>
                       <Badge variant="secondary" className="text-xs px-2 bg-slate-100 text-slate-600">{section.activities.length}</Badge>
                       <div className="h-px bg-slate-200 flex-1" />
                    </div>
                    <div className="relative pl-1 sm:pl-2">
                       {/* Vertical Spine */}
                       <div className="absolute top-4 bottom-0 left-[26px] sm:left-[31px] w-px bg-slate-200" />
                       <div className="space-y-4">
                         {section.activities.map(act => renderTimelineActivityItem({
                             activity: act,
                             entityName: getEntityLabel(act),
                             expandedActivities,
                             setExpandedActivities,
                             userMap
                         }))}
                       </div>
                    </div>
                  </div>
               ))}
             </div>
          )}

          <div className={viewMode === "timeline" ? "hidden" : "block"}>
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
          ) : detailedSections.length === 0 ? (
            <div className="py-12 text-center text-slate-500">
              <Activity className="mx-auto mb-4 h-12 w-12 text-slate-300" />
              <p>No activities found for the current filters.</p>
            </div>
          ) : (
            <div className="space-y-6 max-w-4xl w-full mx-auto" style={{ paddingTop: '16px', paddingBottom: '32px' }}>
              {detailedSections.map((dateSection) => {
                return (
                  <div key={dateSection.dateKey} className="relative">
                    <div className="bg-background/95 backdrop-blur-sm py-2 px-1 mb-4 flex items-center justify-between gap-3">
                       <h3 className="text-sm font-bold tracking-tight text-slate-800">{dateSection.dateLabel}</h3>
                       <div className="flex items-center gap-3 flex-1 ml-3">
                         <div className="h-px bg-slate-200 flex-1" />
                         <Badge variant="secondary" className="text-xs px-2 bg-slate-100 text-slate-600">
                           {dateSection.resources.reduce((acc, r) => acc + r.activities.length, 0)} events
                         </Badge>
                       </div>
                    </div>

                    <div className="space-y-4">
                      {dateSection.resources.map((resourceGroup) => {
                        const rKey = `${dateSection.dateKey}-${resourceGroup.key}`;
                        const isOpen = openResources.has(rKey);
                        const GroupIcon = resourceGroup.icon;

                        return (
                          <Collapsible
                            key={rKey}
                            open={isOpen}
                            onOpenChange={(nextOpen) =>
                              setOpenResources((prev) => {
                                const next = new Set(prev);
                                if (nextOpen) next.add(rKey);
                                else next.delete(rKey);
                                return next;
                              })
                            }
                          >
                            <div className={cn("rounded-xl border border-slate-200 shadow-sm overflow-hidden", resourceGroup.accentClass)}>
                              <CollapsibleTrigger className="w-full">
                                <div className="flex items-center justify-between gap-4 px-4 py-3 bg-white/50 text-left hover:bg-white/80 transition-colors">
                                  <div className="flex items-center gap-3">
                                    <div className="p-2 bg-white rounded-lg shadow-sm border border-slate-100">
                                      <GroupIcon className="h-4 w-4 text-slate-700" />
                                    </div>
                                    <div>
                                      <h4 className="text-sm font-bold text-slate-900">
                                        {resourceGroup.label} ({new Set(resourceGroup.activities.map((a: any) => a.entity_id || a.lead_id || a.user_id)).size})
                                      </h4>
                                      <p className="text-xs font-medium text-slate-500">
                                        {resourceGroup.activities.length} activities
                                      </p>
                                    </div>
                                  </div>
                                  <div className="mr-2">
                                    {isOpen ? <ChevronDown className="h-4 w-4 text-slate-500" /> : <ChevronRight className="h-4 w-4 text-slate-500" />}
                                  </div>
                                </div>
                              </CollapsibleTrigger>
                              <CollapsibleContent>
                                <div className="border-t border-slate-100 bg-white/70 p-4 space-y-3">
                                  {resourceGroup.activities.map(act => renderActivityItem({
                                    activity: act,
                                    entityName: getEntityLabel(act),
                                    expandedActivities,
                                    setExpandedActivities,
                                    userMap
                                  }))}
                                </div>
                              </CollapsibleContent>
                            </div>
                          </Collapsible>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          </div>

          {!isLoading && meta.total > allActivities.length && (
            <div className="pt-6 pb-2 text-center text-slate-500 text-sm flex justify-center w-full">
              {isLoadingMore ? "Loading more activity..." : null}
              <ScrollAnchor onIntersect={handleLoadMore} disabled={isLoadingMore} />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
