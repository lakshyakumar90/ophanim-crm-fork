"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { differenceInCalendarDays, format, startOfMonth, subDays } from "date-fns";
import { DateRange } from "react-day-picker";
import { nowIST } from "@/lib/date-utils";
import { useAuth } from "@/providers/auth-provider";
import { useDepartment } from "@/providers/department-context";
import {
  activitiesApi,
  dashboardApi,
  teamsApi,
  usersApi,
} from "@/lib/api";
import { toast } from "sonner";

export type Interval = "daily" | "weekly" | "monthly";

export interface TeamOption {
  id: string;
  name: string;
  departmentId: string | null;
}

export interface UserOption {
  id: string;
  fullName: string;
  email: string;
  role: string;
  teamId: string | null;
  isActive: boolean;
}

export interface OverviewMetrics {
  total: number;
  wonCount: number;
  lostCount: number;
  wonValue: number;
  conversionRate: number;
  byStatus: Record<string, number>;
  bySource: Record<string, number>;
}

export interface ActivityPoint {
  date: string;
  total: number;
  status_change: number;
  comment: number;
  other: number;
}

export interface UserWiseRow {
  id: string;
  fullName: string;
  role: string;
  teamName: string | null;
  totalLeads: number;
  leadsWorked: number;
  conversions: number;
  activitiesLogged: number;
  statusChanges: number;
  comments: number;
  winRate: number;
}

export interface LeaderboardRow {
  rank: number;
  id: string;
  fullName: string;
  teamName: string | null;
  conversions: number;
  leadsWorked: number;
  totalLeads: number;
  winRate: number;
}

export interface ChartDatum {
  name: string;
  value: number;
}

export interface StatusChartDatum extends ChartDatum {
  key: string;
}

export interface FunnelDatum {
  name: string;
  value: number;
  fill: string;
}

export const DATE_PRESETS = [
  { label: "Today", value: "0d" },
  { label: "7 Days", value: "7d" },
  { label: "30 Days", value: "30d" },
  { label: "This Month", value: "mtd" },
];

const STATUS_LABELS: Record<string, string> = {
  fresh_lead: "Fresh Lead",
  hot_lead: "Hot Lead",
  cold_lead: "Cold Lead",
  meeting_scheduled: "Meeting Scheduled",
  did_not_pick: "Did Not Pick",
  follow_up: "Follow Up",
  future_lead: "Future Lead",
  not_interested: "Not Interested",
  not_a_lead: "Not a Lead",
  proposal_sent: "Proposal Sent",
  won: "Won",
  lost: "Lost",
};

const SOURCE_LABELS: Record<string, string> = {
  cold_call: "Cold Call",
  social_media: "Social Media",
  website: "Website",
  referral: "Referral",
  campaign: "Campaign",
  email: "Email",
  event: "Event",
  walk_in: "Walk-in",
  email_marketer: "Email Marketer",
};

const PIPELINE_STAGES = [
  { key: "fresh_lead", label: "Fresh Lead", color: "#3b82f6" },
  { key: "hot_lead", label: "Hot Lead", color: "#ef4444" },
  { key: "cold_lead", label: "Cold Lead", color: "#06b6d4" },
  { key: "meeting_scheduled", label: "Meeting Scheduled", color: "#8b5cf6" },
  { key: "follow_up", label: "Follow Up", color: "#f59e0b" },
  { key: "proposal_sent", label: "Proposal Sent", color: "#f97316" },
  { key: "won", label: "Won", color: "#22c55e" },
  { key: "lost", label: "Lost", color: "#dc2626" },
];

const MAX_CUSTOM_RANGE_DAYS = 365;

function buildPresetDate(preset: string): DateRange {
  const n = nowIST();
  if (preset === "0d") return { from: n, to: n };
  if (preset === "7d") return { from: subDays(n, 7), to: n };
  if (preset === "mtd") return { from: startOfMonth(n), to: n };
  return { from: subDays(n, 30), to: n };
}

function readUrlParam(key: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  return new URLSearchParams(window.location.search).get(key) || fallback;
}

function initDateFromUrl(): DateRange {
  if (typeof window === "undefined") return buildPresetDate("30d");
  const p = new URLSearchParams(window.location.search);
  const from = p.get("from");
  const to = p.get("to");
  if (from) return { from: new Date(from), to: to ? new Date(to) : new Date(from) };
  return buildPresetDate(p.get("preset") || "30d");
}

function toNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function normalizeTeams(input: unknown): TeamOption[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((item) => {
      const row = item as Record<string, unknown>;
      const id = typeof row.id === "string" ? row.id : "";
      const name = typeof row.name === "string" ? row.name : "";
      const departmentId =
        typeof row.departmentId === "string"
          ? row.departmentId
          : typeof row.department_id === "string"
            ? row.department_id
            : null;
      if (!id || !name) return null;
      return { id, name, departmentId };
    })
    .filter((x): x is TeamOption => Boolean(x));
}

function normalizeUsers(input: unknown): UserOption[] {
  const rows = Array.isArray(input)
    ? input
    : input && typeof input === "object" && Array.isArray((input as { data?: unknown[] }).data)
      ? (input as { data: unknown[] }).data
      : [];
  return rows
    .map((item) => {
      const row = item as Record<string, unknown>;
      const id = typeof row.id === "string" ? row.id : "";
      if (!id) return null;
      return {
        id,
        fullName:
          (typeof row.fullName === "string" && row.fullName) ||
          (typeof row.full_name === "string" && row.full_name) ||
          "Unknown",
        email: typeof row.email === "string" ? row.email : "",
        role: typeof row.role === "string" ? row.role : "employee",
        teamId:
          typeof row.teamId === "string"
            ? row.teamId
            : typeof row.team_id === "string"
              ? row.team_id
              : null,
        isActive:
          typeof row.isActive === "boolean"
            ? row.isActive
            : typeof row.is_active === "boolean"
              ? row.is_active
              : true,
      };
    })
    .filter((x): x is UserOption => Boolean(x));
}

function normalizeOverview(input: unknown): OverviewMetrics {
  const row = (input || {}) as Record<string, unknown>;
  const byStatus = ((row.byStatus || row.by_status || {}) as Record<string, unknown>);
  const bySource = ((row.bySource || row.by_source || row.sources || {}) as Record<string, unknown>);
  const lostFromMap = toNumber(byStatus.lost);
  return {
    total: toNumber(row.total),
    wonCount: toNumber(row.wonCount),
    lostCount: toNumber(row.lostCount) || lostFromMap,
    wonValue: toNumber(row.wonValue),
    conversionRate: toNumber(row.conversionRate),
    byStatus: Object.fromEntries(Object.entries(byStatus).map(([k, v]) => [k, toNumber(v)])),
    bySource: Object.fromEntries(Object.entries(bySource).map(([k, v]) => [k, toNumber(v)])),
  };
}

function normalizeActivity(input: unknown): ActivityPoint[] {
  if (!Array.isArray(input)) return [];
  return input.map((item) => {
    const row = item as Record<string, unknown>;
    return {
      date: typeof row.date === "string" ? row.date : "N/A",
      total: toNumber(row.total),
      status_change: toNumber(row.status_change),
      comment: toNumber(row.comment ?? row.comments ?? row.note),
      other: toNumber(row.other),
    };
  });
}

function normalizeUserWise(input: unknown): { users: UserWiseRow[]; leaderboard: LeaderboardRow[] } {
  const row = (input || {}) as Record<string, unknown>;
  const usersRaw = Array.isArray(row.users) ? row.users : [];
  const leaderboardRaw = Array.isArray(row.leaderboard) ? row.leaderboard : [];

  const users = usersRaw.map((item) => {
    const u = item as Record<string, unknown>;
    return {
      id: String(u.id || ""),
      fullName: String(u.fullName || "Unknown"),
      role: String(u.role || "employee"),
      teamName: (u.teamName as string | null) || null,
      totalLeads: toNumber(u.totalLeads),
      leadsWorked: toNumber(u.leadsWorked),
      conversions: toNumber(u.conversions),
      activitiesLogged: toNumber(u.activitiesLogged),
      statusChanges: toNumber(u.statusChanges),
      comments: toNumber(u.comments),
      winRate: toNumber(u.winRate),
    };
  });

  const leaderboard = leaderboardRaw.map((item, idx) => {
    const l = item as Record<string, unknown>;
    return {
      rank: toNumber(l.rank) || idx + 1,
      id: String(l.id || ""),
      fullName: String(l.fullName || "Unknown"),
      teamName: (l.teamName as string | null) || null,
      conversions: toNumber(l.conversions),
      leadsWorked: toNumber(l.leadsWorked),
      totalLeads: toNumber(l.totalLeads),
      winRate: toNumber(l.winRate),
    };
  });

  return { users, leaderboard };
}

export function useSalesAnalytics() {
  const { user } = useAuth();
  const { currentDepartment, isLoading: isDepartmentLoading } = useDepartment();
  const isAdmin = user?.role === "admin";
  const isManager = user?.role === "manager";
  const isManagerOrAbove = isAdmin || isManager;
  const isEmployee = user?.role === "employee";
  const salesDepartmentId = currentDepartment?.id;

  const [date, setDate] = useState<DateRange | undefined>(() => initDateFromUrl());
  const [activePreset, setActivePreset] = useState<string>(() => readUrlParam("preset", "30d"));
  const [interval, setInterval] = useState<Interval>(() => readUrlParam("interval", "daily") as Interval);
  const [teamId, setTeamId] = useState<string>(() => readUrlParam("teamId", "all"));
  const [userId, setUserId] = useState<string>(() => readUrlParam("userId", ""));

  const [teams, setTeams] = useState<TeamOption[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);

  const [overview, setOverview] = useState<OverviewMetrics>({
    total: 0,
    wonCount: 0,
    lostCount: 0,
    wonValue: 0,
    conversionRate: 0,
    byStatus: {},
    bySource: {},
  });
  const [activityData, setActivityData] = useState<ActivityPoint[]>([]);
  const [userWiseRows, setUserWiseRows] = useState<UserWiseRow[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardRow[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDatePopoverOpen, setIsDatePopoverOpen] = useState(false);
  const [draftDate, setDraftDate] = useState<DateRange | undefined>(() => initDateFromUrl());

  useEffect(() => {
    if (isEmployee && user?.id) {
      setUserId(user.id);
    }
  }, [isEmployee, user?.id]);

  useEffect(() => {
    setDraftDate(date);
  }, [date]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams();
    if (activePreset) params.set("preset", activePreset);
    if (date?.from) params.set("from", format(date.from, "yyyy-MM-dd"));
    if (date?.to) params.set("to", format(date.to, "yyyy-MM-dd"));
    if (interval !== "daily") params.set("interval", interval);
    if (teamId !== "all") params.set("teamId", teamId);
    if (userId && !isEmployee) params.set("userId", userId);
    const qs = params.toString();
    window.history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
  }, [activePreset, date, interval, teamId, userId, isEmployee]);

  useEffect(() => {
    if (!user || isDepartmentLoading || !salesDepartmentId) return;
    const loadFilters = async () => {
      try {
        const [teamsData, usersData] = await Promise.all([
          teamsApi.list(),
          usersApi.list({ limit: 1000, departmentId: salesDepartmentId }),
        ]);
        const normalizedTeams = normalizeTeams(teamsData).filter(
          (t) => t.departmentId === salesDepartmentId,
        );
        const normalizedUsers = normalizeUsers(usersData);

        setTeams(normalizedTeams);

        if (isAdmin) {
          setUsers(normalizedUsers);
          return;
        }

        if (isManager && user.teamId) {
          setUsers(
            normalizedUsers.filter(
              (u) => u.id === user.id || (u.teamId && u.teamId === user.teamId),
            ),
          );
          return;
        }

        setUsers(
          normalizedUsers.filter((u) => (user?.id ? u.id === user.id : false)),
        );
      } catch {
        setTeams([]);
        setUsers([]);
      }
    };

    void loadFilters();
  }, [
    user,
    isAdmin,
    isManager,
    isDepartmentLoading,
    salesDepartmentId,
  ]);

  useEffect(() => {
    if (teamId !== "all" && !teams.some((t) => t.id === teamId)) {
      setTeamId("all");
    }
  }, [teamId, teams]);

  useEffect(() => {
    if (isEmployee) return;
    if (userId && !users.some((u) => u.id === userId)) {
      setUserId("");
    }
  }, [isEmployee, userId, users]);

  const fetchAnalytics = useCallback(
    async (quiet = false) => {
      if (!user || !date?.from || !salesDepartmentId) return;
      if (quiet) setIsRefreshing(true);
      else setIsLoading(true);

      const startDate = date.from.toISOString();
      const endDate = (date.to || date.from).toISOString();
      const scopedTeamId = isEmployee ? undefined : teamId === "all" ? undefined : teamId;
      const scopedUserId = isEmployee ? user.id : userId || undefined;

      try {
        const [overviewRes, activityRes, userWiseRes, dashboardRes] = await Promise.all([
          dashboardApi.getLeadAnalytics(
            startDate,
            endDate,
            scopedTeamId,
            scopedUserId,
            salesDepartmentId,
          ),
          activitiesApi.getAnalytics({
            startDate,
            endDate,
            interval,
            teamId: scopedTeamId,
            userId: scopedUserId,
            departmentId: salesDepartmentId,
          }),
          dashboardApi.getUserWiseAnalytics({
            startDate,
            endDate,
            teamId: scopedTeamId,
            userId: scopedUserId,
            departmentId: salesDepartmentId,
          }),
          dashboardApi.get(salesDepartmentId),
        ]);

        const normalizedOverview = normalizeOverview(overviewRes);
        const dashboardLeads = (dashboardRes as { leads?: { total?: unknown } })
          ?.leads;
        const dashboardTotalLeads = toNumber(dashboardLeads?.total);
        setOverview({
          ...normalizedOverview,
          total: dashboardTotalLeads || normalizedOverview.total,
        });
        setActivityData(normalizeActivity(activityRes));
        const userWise = normalizeUserWise(userWiseRes);
        setUserWiseRows(userWise.users);
        setLeaderboard(userWise.leaderboard);
      } catch {
        toast.error("Failed to load sales analytics");
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [
      user,
      date,
      teamId,
      userId,
      interval,
      isEmployee,
      salesDepartmentId,
    ],
  );

  useEffect(() => {
    void fetchAnalytics();
  }, [fetchAnalytics]);

  const sourceData = useMemo(
    () =>
      Object.entries(overview.bySource)
        .map(([key, value]) => ({
          name: SOURCE_LABELS[key] || key.replace(/_/g, " "),
          value: toNumber(value),
        }))
        .filter((d) => d.value > 0)
        .sort((a, b) => b.value - a.value),
    [overview.bySource],
  );

  const statusData = useMemo(
    () =>
      Object.entries(overview.byStatus)
        .map(([key, value]) => ({
          key,
          name: STATUS_LABELS[key] || key.replace(/_/g, " "),
          value: toNumber(value),
        }))
        .filter((d) => d.value > 0)
        .sort((a, b) => b.value - a.value),
    [overview.byStatus],
  );

  const funnelData = useMemo(
    () =>
      PIPELINE_STAGES.map((stage) => ({
        name: stage.label,
        value: toNumber(overview.byStatus[stage.key]),
        fill: stage.color,
      })).filter((s) => s.value > 0),
    [overview.byStatus],
  );

  const totalActivities = useMemo(
    () => activityData.reduce((sum, item) => sum + item.total, 0),
    [activityData],
  );
  const totalStatusChanges = useMemo(
    () => activityData.reduce((sum, item) => sum + item.status_change, 0),
    [activityData],
  );

  const totalNotes = useMemo(
    () => activityData.reduce((sum, item) => sum + item.comment, 0),
    [activityData],
  );

  const draftRange = useMemo(() => {
    if (!draftDate?.from) return undefined;
    return {
      from: draftDate.from,
      to: draftDate.to || draftDate.from,
    };
  }, [draftDate]);

  const isDraftRangeTooLong = useMemo(() => {
    if (!draftRange?.from || !draftRange?.to) return false;
    return differenceInCalendarDays(draftRange.to, draftRange.from) > MAX_CUSTOM_RANGE_DAYS;
  }, [draftRange]);

  const canApplyDraftRange = Boolean(
    draftRange?.from && draftRange?.to && !isDraftRangeTooLong,
  );

  const dateLabel = useMemo(() => {
    if (!date?.from) return "Pick date range";
    if (date.to) {
      return `${format(date.from, "MMM d")} – ${format(date.to, "MMM d, yyyy")}`;
    }
    return format(date.from, "MMM d, yyyy");
  }, [date]);

  const applyPreset = useCallback((preset: string) => {
    setActivePreset(preset);
    setDate(buildPresetDate(preset));
  }, []);

  return {
    user,
    isAdmin,
    isManagerOrAbove,
    isEmployee,
    date,
    setDate,
    activePreset,
    setActivePreset,
    interval,
    setInterval,
    teamId,
    setTeamId,
    userId,
    setUserId,
    teams,
    users,
    overview,
    activityData,
    userWiseRows,
    leaderboard,
    isLoading,
    isRefreshing,
    isDatePopoverOpen,
    setIsDatePopoverOpen,
    draftDate,
    setDraftDate,
    draftRange,
    isDraftRangeTooLong,
    canApplyDraftRange,
    dateLabel,
    applyPreset,
    fetchAnalytics,
    sourceData,
    statusData,
    funnelData,
    totalActivities,
    totalStatusChanges,
    totalNotes,
  };
}
