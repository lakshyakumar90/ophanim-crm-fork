"use client";

import type { ElementType } from "react";
import { formatInTimeZone } from "date-fns-tz";
import { startOfMonth, subDays } from "date-fns";
import {
  Activity,
  Briefcase,
  CheckCircle,
  CheckSquare,
  Clock,
  FolderKanban,
  LogIn,
  LogOut,
  MessageSquare,
  Pencil,
  PlusCircle,
  RefreshCw,
  Trash2,
  Target,
  User,
  Users,
} from "lucide-react";
import {
  formatIST,
  getShiftAwareDateKeyIST,
  getShiftAwareDayBoundsISO,
  getShiftAwareTodayKeyIST,
  getShiftAwareYesterdayKeyIST,
  IST_TIMEZONE,
} from "@/lib/date-utils";

export const DEFAULT_RESOURCE_OPEN: string[] = [];
export const SYSTEM_ACTIVITY_TYPES = new Set(["login", "logout", "clock_in", "clock_out"]);

export type ActivityScope = "self" | "team" | "department" | "all-crm" | "member";
export type TimePreset = "today" | "yesterday" | "this-week" | "this-month" | "custom";
export type QuickFilter = "all" | "lead-updates" | "task-completions" | "project-modified" | "user-logins";
export type ResourceGroupKey = "lead" | "task" | "user" | "attendance" | "project" | "other";
export type TimeBucketKey = "today" | "yesterday" | "earlier";
export interface TimeSection {
  key: string;
  label: string;
  activities: ActivityLog[];
  collapsible: boolean;
}

export interface DateEntitySection {
  key: string;
  label: string;
  entities: EntityGroup[];
}

export interface ActivityLog {
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

export interface TeamOption {
  id: string;
  name: string;
  departmentId?: string | null;
}

export interface UserOption {
  id: string;
  fullName: string;
  email: string;
  role?: string;
}

export interface ActivityChange {
  field: string;
  oldVal: string;
  newVal: string;
}

export interface QuickSummaryItem {
  id: QuickFilter;
  title: string;
  value: number;
  helper: string;
  icon: ElementType;
}

export interface EntityGroup {
  entityId: string;
  entityName: string;
  resourceLabel: string;
  activities: ActivityLog[];
}

export interface ResourceGroup {
  key: ResourceGroupKey;
  label: string;
  icon: ElementType;
  accentClass: string;
  activities: ActivityLog[];
  entities: EntityGroup[];
}

export const actionIcons: Record<string, ElementType> = {
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

export const resourceIcons: Record<ResourceGroupKey, ElementType> = {
  lead: Target,
  task: CheckSquare,
  user: User,
  attendance: Clock,
  project: FolderKanban,
  other: Briefcase,
};

export const resourceLabels: Record<ResourceGroupKey, string> = {
  lead: "Leads",
  task: "Tasks",
  user: "Users",
  attendance: "Attendance",
  project: "Projects",
  other: "Other",
};

export const resourceAccent: Record<ResourceGroupKey, string> = {
  lead: "bg-slate-50/80",
  task: "bg-slate-50/80",
  user: "bg-slate-50/80",
  attendance: "bg-slate-50/80",
  project: "bg-slate-50/80",
  other: "bg-slate-50/80",
};

export const actionColors: Record<string, string> = {
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

export const timeBucketLabels: Record<TimeBucketKey, string> = {
  today: "Today",
  yesterday: "Yesterday",
  earlier: "Earlier",
};

export const formatFieldName = (field: string): string =>
  field
    .replace(/_/g, " ")
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (value) => value.toUpperCase())
    .trim();

export const formatValue = (value: unknown): string => {
  if (value === null || value === undefined) return "-";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return value.join(", ") || "-";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
};

export const getChangesFromMetadata = (
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


export const formatActivityDescription = (activity: ActivityLog) => {
  if (activity.title) return activity.title;
  return (activity.activity_type || "activity").replace(/_/g, " ");
};

export const getEntityLabel = (activity: ActivityLog) => {
  if (activity.entity_name) return activity.entity_name;
  if (activity.lead?.lead_name) return activity.lead.lead_name;
  if (activity.entity_type === "user") return activity.user?.full_name || "User";
  if (activity.entity_type) return formatFieldName(activity.entity_type);
  return "Activity";
};

export const getResourceGroupKey = (activity: ActivityLog): ResourceGroupKey => {
  const entityType = (activity.entity_type || "").toLowerCase();
  if (entityType === "lead") return "lead";
  if (entityType === "task") return "task";
  if (entityType === "user" || entityType === "team") return "user";
  if (entityType === "attendance") return "attendance";
  if (entityType === "project") return "project";
  return "other";
};

export const getEntityGroupId = (activity: ActivityLog, resourceKey: ResourceGroupKey) =>
  activity.entity_id ||
  activity.lead_id ||
  (resourceKey === "attendance" ? activity.user_id : null) ||
  `${resourceKey}-${activity.id}`;

export const getTimeBucket = (
  createdAt: string,
  shiftType: "day_shift" | "night_shift" | null | undefined,
): TimeBucketKey => {
  const now = new Date();
  const today = getShiftAwareTodayKeyIST(shiftType, now);
  const activityDay = getShiftAwareDateKeyIST(createdAt, shiftType);
  if (activityDay === today) return "today";
  const yesterday = getShiftAwareYesterdayKeyIST(shiftType, now);
  return activityDay === yesterday ? "yesterday" : "earlier";
};

export const isDateAccordionRange = (preset: TimePreset) =>
  preset === "this-week" || preset === "this-month" || preset === "custom";

export const getDateLabel = (createdAt: string) =>
  formatInTimeZone(new Date(createdAt), IST_TIMEZONE, "EEE, MMM d");

export const getDateKey = (
  createdAt: string,
  shiftType: "day_shift" | "night_shift" | null | undefined,
) => getShiftAwareDateKeyIST(createdAt, shiftType);

export const buildTimeSections = (
  activities: ActivityLog[],
  shiftType: "day_shift" | "night_shift" | null | undefined,
): TimeSection[] => {
  const dateMap = new Map<string, TimeSection>();
  const now = new Date();
  const today = getShiftAwareTodayKeyIST(shiftType, now);
  const yesterday = getShiftAwareYesterdayKeyIST(shiftType, now);

  activities.forEach((activity) => {
    const key = getDateKey(activity.created_at, shiftType);
    const existing = dateMap.get(key);
    if (existing) {
      existing.activities.push(activity);
      return;
    }

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

export interface DateResourceGroup {
  key: ResourceGroupKey;
  label: string;
  icon: ElementType;
  accentClass: string;
  activities: ActivityLog[];
}

export interface DateDetailedSection {
  dateKey: string;
  dateLabel: string;
  resources: DateResourceGroup[];
}

export const buildDetailedSections = (
  activities: ActivityLog[],
  shiftType: "day_shift" | "night_shift" | null | undefined,
): DateDetailedSection[] => {
  const dateMap = new Map<string, DateDetailedSection>();
  const now = new Date();
  const today = getShiftAwareTodayKeyIST(shiftType, now);
  const yesterday = getShiftAwareYesterdayKeyIST(shiftType, now);
  
  activities.forEach(activity => {
    const dateKey = getDateKey(activity.created_at, shiftType);
    let section = dateMap.get(dateKey);
    if (!section) {
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

export const isLeadUpdate = (activity: ActivityLog) =>
  getResourceGroupKey(activity) === "lead" &&
  ["update", "status_change", "comment"].includes(activity.activity_type);

export const isTaskCompletion = (activity: ActivityLog) =>
  getResourceGroupKey(activity) === "task" && activity.activity_type === "complete";

export const isProjectModification = (activity: ActivityLog) =>
  getResourceGroupKey(activity) === "project" &&
  ["create", "update", "delete", "status_change", "comment"].includes(activity.activity_type);

export const isUserLogin = (activity: ActivityLog) => activity.activity_type === "login";

export const matchesQuickFilter = (activity: ActivityLog, filter: QuickFilter) => {
  if (filter === "all") return true;
  if (filter === "lead-updates") return isLeadUpdate(activity);
  if (filter === "task-completions") return isTaskCompletion(activity);
  if (filter === "project-modified") return isProjectModification(activity);
  if (filter === "user-logins") return isUserLogin(activity);
  return true;
};

export const getDateRange = (
  preset: TimePreset,
  customStartDate: string,
  customEndDate: string,
  shiftType: "day_shift" | "night_shift" | null | undefined,
) => {
  const now = new Date();
  const todayKey = getShiftAwareTodayKeyIST(shiftType, now);

  if (preset === "custom") {
    if (customStartDate && customEndDate) {
      const startBounds = getShiftAwareDayBoundsISO(customStartDate, shiftType);
      const endBounds = getShiftAwareDayBoundsISO(customEndDate, shiftType);
      return {
        startDate: startBounds.startDate,
        endDate: endBounds.endDate,
      };
    }

    return {
      startDate: customStartDate
        ? getShiftAwareDayBoundsISO(customStartDate, shiftType).startDate
        : undefined,
      endDate: customEndDate
        ? getShiftAwareDayBoundsISO(customEndDate, shiftType).endDate
        : undefined,
    };
  }

  if (preset === "today") {
    return getShiftAwareDayBoundsISO(todayKey, shiftType);
  }

  if (preset === "yesterday") {
    const yesterdayKey = getShiftAwareYesterdayKeyIST(shiftType, now);
    return getShiftAwareDayBoundsISO(yesterdayKey, shiftType);
  }

  const todayDate = new Date(`${todayKey}T00:00:00+05:30`);

  if (preset === "this-month") {
    const monthStart = formatInTimeZone(startOfMonth(todayDate), IST_TIMEZONE, "yyyy-MM-dd");
    const monthStartBounds = getShiftAwareDayBoundsISO(monthStart, shiftType);
    const todayBounds = getShiftAwareDayBoundsISO(todayKey, shiftType);
    return {
      startDate: monthStartBounds.startDate,
      endDate: todayBounds.endDate,
    };
  }

  const isoDay = Number(formatInTimeZone(todayDate, IST_TIMEZONE, "i"));
  const startOfWeek = formatInTimeZone(
    subDays(todayDate, isoDay - 1),
    IST_TIMEZONE,
    "yyyy-MM-dd",
  );
  const weekStartBounds = getShiftAwareDayBoundsISO(startOfWeek, shiftType);
  const todayBounds = getShiftAwareDayBoundsISO(todayKey, shiftType);

  return {
    startDate: weekStartBounds.startDate,
    endDate: todayBounds.endDate,
  };
};

export const getSummaryItems = (
  activities: ActivityLog[],
  shiftType: "day_shift" | "night_shift" | null | undefined,
): QuickSummaryItem[] => {
  const todayActivities = activities.filter(
    (activity) => getTimeBucket(activity.created_at, shiftType) === "today",
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

export const parseDateOnly = (value: string): Date | undefined => {
  if (!value) return undefined;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return undefined;
  return new Date(year, month - 1, day);
};

export const toDateOnlyString = (date: Date): string =>
  formatInTimeZone(date, IST_TIMEZONE, "yyyy-MM-dd");

