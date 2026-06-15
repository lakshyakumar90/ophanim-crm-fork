"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import useSWR, { mutate } from "swr";
import { useHeaderRefresh } from "@/hooks/use-header-refresh";
import { activitiesApi, teamsApi, usersApi } from "@/lib/api";
import { useDepartment } from "@/providers/department-context";
import { useAuth } from "@/providers/auth-provider";
import {
  DEFAULT_RESOURCE_OPEN,
  SYSTEM_ACTIVITY_TYPES,
  buildDetailedSections,
  formatActivityDescription,
  formatFieldName,
  getDateRange,
  getEntityLabel,
  getSummaryItems,
  matchesQuickFilter,
  resourceLabels,
  type ActivityLog,
  type ActivityScope,
  type QuickFilter,
  type ResourceGroupKey,
  type TeamOption,
  type TimePreset,
  type UserOption,
} from "@/lib/activity-grouping";

export function useActivityFeed() {
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

  const { startDate, endDate } = getDateRange(
    timePreset,
    customStartDate,
    customEndDate,
    user?.shiftType,
  );

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
  const summaryItems = useMemo(
    () => getSummaryItems(allActivities, user?.shiftType),
    [allActivities, user?.shiftType],
  );
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
  const detailedSections = useMemo(
    () => buildDetailedSections(visibleActivities, user?.shiftType),
    [visibleActivities, user?.shiftType],
  );
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


  return {
    user,
    departments,
    scope,
    setScope,
    activityType,
    setActivityType,
    resourceType,
    setResourceType,
    timePreset,
    setTimePreset,
    customStartDate,
    setCustomStartDate,
    customEndDate,
    setCustomEndDate,
    showSystemEvents,
    setShowSystemEvents,
    quickFilter,
    setQuickFilter,
    viewMode,
    setViewMode,
    searchQuery,
    setSearchQuery,
    showAdvancedFilters,
    setShowAdvancedFilters,
    filterDeptId,
    setFilterDeptId,
    filterDesignation,
    setFilterDesignation,
    filterTeamId,
    setFilterTeamId,
    filterUserId,
    setFilterUserId,
    expandedActivities,
    setExpandedActivities,
    openResources,
    setOpenResources,
    isAdmin,
    isManager,
    teamsForScope,
    userOptions,
    userMap,
    canQueryActivities,
    isLoading,
    error,
    handleLoadMore,
    isLoadingMore,
    meta,
    allActivities,
    summaryItems,
    visibleActivities,
    detailedSections,
    hiddenSystemCount,
    activeFilterLabels,
    scopeOptions,
    showUserFilterPanel,
    scopeNeedsDept,
    scopeNeedsUser,
    effectiveScope,
  };
}
