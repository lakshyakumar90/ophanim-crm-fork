"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { differenceInCalendarDays, format, startOfMonth, subDays } from "date-fns";
import { DateRange } from "react-day-picker";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cn } from "@/lib/utils";
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
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UserSelector } from "@/components/shared/user-selector";
import {
  Calendar as CalendarIcon,
  CheckSquare,
  DollarSign,
  Percent,
  RefreshCw,
  Target,
  TrendingUp,
  Trophy,
  Users,
  XCircle,
} from "lucide-react";

type Interval = "daily" | "weekly" | "monthly";

interface TeamOption {
  id: string;
  name: string;
  departmentId: string | null;
}

interface UserOption {
  id: string;
  fullName: string;
  email: string;
  role: string;
  teamId: string | null;
  isActive: boolean;
}

interface OverviewMetrics {
  total: number;
  wonCount: number;
  lostCount: number;
  wonValue: number;
  conversionRate: number;
  byStatus: Record<string, number>;
  bySource: Record<string, number>;
}

interface ActivityPoint {
  date: string;
  total: number;
  status_change: number;
  comment: number;
  other: number;
}

interface UserWiseRow {
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

interface LeaderboardRow {
  rank: number;
  id: string;
  fullName: string;
  teamName: string | null;
  conversions: number;
  leadsWorked: number;
  totalLeads: number;
  winRate: number;
}

const DATE_PRESETS = [
  { label: "Today", value: "0d" },
  { label: "7 Days", value: "7d" },
  { label: "30 Days", value: "30d" },
  { label: "This Month", value: "mtd" },
];

const PIE_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444", "#06b6d4"];

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

function fmtCurrency(n: number): string {
  if (n >= 1_000_000) return `₹${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `₹${(n / 1_000).toFixed(1)}K`;
  return `₹${Math.round(n)}`;
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

export default function SalesAnalyticsPage() {
  const { user } = useAuth();
  const { currentDepartment, isLoading: isDepartmentLoading } = useDepartment();
  const isAdmin = user?.role === "admin";
  const isManager = user?.role === "manager";
  const isManagerOrAbove = isAdmin || isManager;
  const isEmployee = user?.role === "employee";
  const salesDepartmentId = currentDepartment?.id;

  const router = useRouter();
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

  function applyPreset(preset: string) {
    setActivePreset(preset);
    setDate(buildPresetDate(preset));
  }

  if (isLoading) {
    return <AnalyticsSkeleton />;
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Sales Analytics</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Role-scoped performance insights across overview and individual contributions.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void fetchAnalytics(true)} disabled={isRefreshing} className="gap-2">
          <RefreshCw className={cn("h-3.5 w-3.5", isRefreshing && "animate-spin")} />
          Refresh
        </Button>
      </div>

      <div className="flex flex-wrap gap-2 items-center bg-card border rounded-xl p-3">
        <div className="flex gap-1">
          {DATE_PRESETS.map((p) => (
            <Button
              key={p.value}
              variant={activePreset === p.value ? "default" : "outline"}
              size="sm"
              className="text-xs h-8"
              onClick={() => applyPreset(p.value)}
            >
              {p.label}
            </Button>
          ))}
        </div>

        <div className="h-5 w-px bg-border mx-1" />

        <Popover
          open={isDatePopoverOpen}
          onOpenChange={(open) => {
            setIsDatePopoverOpen(open);
            if (open) {
              setDraftDate(date);
            }
          }}
        >
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2 text-xs h-8" onClick={() => setActivePreset("")}>
              <CalendarIcon className="h-3.5 w-3.5 shrink-0" />
              <span>{dateLabel}</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-3" align="start">
            <div className="space-y-3">
              <Calendar
                mode="range"
                defaultMonth={draftDate?.from || date?.from}
                selected={draftDate}
                onSelect={(d) => setDraftDate(d)}
                numberOfMonths={1}
                captionLayout="dropdown"
                fromYear={2000}
                toYear={nowIST().getFullYear() + 1}
              />
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground">
                  Max custom range: 1 year
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setDraftDate(date);
                      setIsDatePopoverOpen(false);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    disabled={!canApplyDraftRange}
                    onClick={() => {
                      if (!draftRange?.from || !draftRange?.to) return;
                      if (isDraftRangeTooLong) return;
                      setDate({ from: draftRange.from, to: draftRange.to });
                      setActivePreset("");
                      setIsDatePopoverOpen(false);
                    }}
                  >
                    Apply
                  </Button>
                </div>
              </div>
              {isDraftRangeTooLong && (
                <p className="text-xs text-destructive">
                  Date range cannot exceed 1 year.
                </p>
              )}
            </div>
          </PopoverContent>
        </Popover>

        <Select value={interval} onValueChange={(v) => setInterval(v as Interval)}>
          <SelectTrigger className="w-[110px] h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="daily">Daily</SelectItem>
            <SelectItem value="weekly">Weekly</SelectItem>
            <SelectItem value="monthly">Monthly</SelectItem>
          </SelectContent>
        </Select>

        {isManagerOrAbove && (
          <Select value={teamId} onValueChange={setTeamId}>
            <SelectTrigger className="w-[150px] h-8 text-xs">
              <SelectValue placeholder="All Teams" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Teams</SelectItem>
              {teams.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {isManagerOrAbove && (
          <div className="w-[220px]">
            <UserSelector
              users={users.map((u) => ({
                id: u.id,
                fullName: u.fullName,
                email: u.email,
                role: u.role,
                isActive: u.isActive,
              }))}
              value={userId}
              onValueChange={setUserId}
              placeholder="All Users"
              showAllOption
              allOptionLabel="All Users"
            />
          </div>
        )}

        {isEmployee && (
          <span className="text-xs text-muted-foreground ml-auto">
            Showing your personal analytics only
          </span>
        )}
      </div>

      <div className="space-y-6">
          <section>
            <SectionLabel>Overview KPIs</SectionLabel>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <MetricCard label="Total Leads" value={overview.total} icon={Target} tone="blue" />
              <MetricCard label="Deals Won" value={overview.wonCount} icon={CheckSquare} tone="emerald" />
              <MetricCard label="Deals Lost" value={overview.lostCount} icon={XCircle} tone="rose" />
              <MetricCard label="Revenue Won" value={fmtCurrency(overview.wonValue)} icon={DollarSign} tone="violet" />
              <MetricCard label="Win Rate" value={`${overview.conversionRate.toFixed(1)}%`} icon={Percent} tone="amber" />
              <MetricCard
                label="Avg Deal Size"
                value={fmtCurrency(overview.wonCount > 0 ? overview.wonValue / overview.wonCount : 0)}
                icon={TrendingUp}
                tone="cyan"
              />
            </div>
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-7 gap-4">
            <Card className="lg:col-span-4">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Activity Trends</CardTitle>
                <CardDescription className="text-xs">
                  Tracked activity only (status changes, comments, and total actions)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[280px]">
                  {activityData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={activityData} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                        <XAxis dataKey="date" fontSize={10} tickLine={false} axisLine={false} />
                        <YAxis fontSize={10} tickLine={false} axisLine={false} />
                        <Tooltip />
                        <Bar dataKey="total" fill="#334155" name="Total Activities" radius={[3, 3, 0, 0]} />
                        <Bar dataKey="status_change" fill="#3b82f6" name="Status Changes" radius={[3, 3, 0, 0]} />
                        <Bar dataKey="comment" fill="#10b981" name="Comments" radius={[3, 3, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <EmptyState message="No tracked activity for selected filters" />
                  )}
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                  <SummaryBadge label="Total Activities" value={totalActivities} />
                  <SummaryBadge label="Status Changes" value={totalStatusChanges} />
                  <SummaryBadge label="Comments" value={totalNotes} />
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-3">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Pipeline Funnel</CardTitle>
                <CardDescription className="text-xs">
                  Stage distribution from filtered lead dataset
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[280px]">
                  {funnelData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={funnelData} layout="vertical" margin={{ left: 0, right: 16, top: 4, bottom: 4 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                        <XAxis type="number" fontSize={10} tickLine={false} axisLine={false} />
                        <YAxis type="category" dataKey="name" width={120} fontSize={10} tickLine={false} axisLine={false} />
                        <Tooltip formatter={(v) => [v, "Leads"]} />
                        <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                          {funnelData.map((entry, i) => (
                            <Cell key={i} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <EmptyState message="No funnel data for selected filters" />
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Lead Status Distribution</CardTitle>
                <CardDescription className="text-xs">How filtered leads are distributed by status</CardDescription>
              </CardHeader>
              <CardContent>
                <PieLegendChart data={statusData.map((s) => ({ name: s.name, value: s.value }))} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Lead Source Distribution</CardTitle>
                <CardDescription className="text-xs">Lead acquisition mix for selected filters</CardDescription>
              </CardHeader>
              <CardContent>
                <PieLegendChart data={sourceData} />
              </CardContent>
            </Card>
          </div>
        <div className="space-y-4">
          <section>
            <SectionLabel>User-wise Insights</SectionLabel>
            <div className="grid grid-cols-1 gap-4">
              <Card className="lg:col-span-1">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-amber-500" />
                    Leaderboard
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Ranked by conversions, then leads worked
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {leaderboard.length === 0 && (
                    <EmptyState message="No leaderboard data for selected filters" />
                  )}
                  {leaderboard.slice(0, 5).map((row) => (
                    <button
                      key={row.id}
                      type="button"
                      onClick={() => {
                        if (!isManagerOrAbove || !row.id) return;
                        const params = new URLSearchParams();
                        params.set("scope", "member");
                        if (date?.from) params.set("from", format(date.from, "yyyy-MM-dd"));
                        if (date?.to || date?.from)
                          params.set("to", format((date?.to || date?.from)!, "yyyy-MM-dd"));
                        params.set("preset", "custom");
                        if (!isAdmin && user?.teamId) params.set("teamId", user.teamId);
                        else if (teamId !== "all") params.set("teamId", teamId);
                        params.set("userId", row.id);
                        router.push(`/activity?${params.toString()}`);
                      }}
                      className={cn(
                        "w-full cursor-pointer text-left flex items-center justify-between rounded-lg border p-2 transition-colors",
                        row.rank === 1 && "bg-amber-50/70 border-amber-200 hover:bg-amber-100/70",
                        row.rank === 2 && "bg-slate-100/70 border-slate-300 hover:bg-slate-200/70",
                        row.rank === 3 && "bg-orange-50/70 border-orange-200 hover:bg-orange-100/70",
                        row.rank > 3 && "hover:bg-muted/40",
                      )}
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          #{row.rank} {row.fullName}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {row.teamName || "No team"} · {row.conversions} conversions
                        </p>
                      </div>
                      <p className="text-xs font-semibold text-muted-foreground">
                        {row.winRate.toFixed(1)}%
                      </p>
                    </button>
                  ))}
                </CardContent>
              </Card>

              <Card className="lg:col-span-2">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">User Performance Table</CardTitle>
                  <CardDescription className="text-xs">
                    Total leads, leads worked, conversions, and tracked activity summary
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="pl-6">User</TableHead>
                          <TableHead>Team</TableHead>
                          <TableHead className="text-right">Total Leads</TableHead>
                          <TableHead className="text-right">Leads Worked</TableHead>
                          <TableHead className="text-right">Conversions</TableHead>
                          <TableHead className="text-right">Activities</TableHead>
                          <TableHead className="text-right">Status Changes</TableHead>
                          <TableHead className="text-right">Comments</TableHead>
                          <TableHead className="text-right pr-6">Win Rate</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {userWiseRows.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={9} className="py-8 text-center text-sm text-muted-foreground">
                              No user-wise data for selected filters
                            </TableCell>
                          </TableRow>
                        )}
                        {userWiseRows.map((row) => (
                          <TableRow key={row.id}>
                            <TableCell className="pl-6 font-medium">
                              <div className="flex items-center gap-2">
                                <Users className="h-3.5 w-3.5 text-muted-foreground" />
                                {row.fullName}
                              </div>
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">{row.teamName || "—"}</TableCell>
                            <TableCell className="text-right tabular-nums">{row.totalLeads}</TableCell>
                            <TableCell className="text-right tabular-nums">{row.leadsWorked}</TableCell>
                            <TableCell className="text-right tabular-nums">{row.conversions}</TableCell>
                            <TableCell className="text-right tabular-nums">{row.activitiesLogged}</TableCell>
                            <TableCell className="text-right tabular-nums">{row.statusChanges}</TableCell>
                            <TableCell className="text-right tabular-nums">{row.comments}</TableCell>
                            <TableCell className="text-right tabular-nums pr-6">{row.winRate.toFixed(1)}%</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  tone: "blue" | "emerald" | "rose" | "violet" | "amber" | "cyan";
}) {
  const toneClass: Record<string, string> = {
    blue: "bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950/60 dark:border-blue-800 dark:text-blue-300",
    emerald: "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/60 dark:border-emerald-800 dark:text-emerald-300",
    rose: "bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-950/60 dark:border-rose-800 dark:text-rose-300",
    violet: "bg-violet-50 border-violet-200 text-violet-700 dark:bg-violet-950/60 dark:border-violet-800 dark:text-violet-300",
    amber: "bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950/60 dark:border-amber-800 dark:text-amber-300",
    cyan: "bg-cyan-50 border-cyan-200 text-cyan-700 dark:bg-cyan-950/60 dark:border-cyan-800 dark:text-cyan-300",
  };

  return (
    <div className={cn("rounded-xl border p-4 text-center", toneClass[tone])}>
      <div className="flex justify-center mb-1">
        <Icon className="h-4 w-4" />
      </div>
      <p className="text-xl font-bold tabular-nums">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function SummaryBadge({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border px-2 py-1 text-center">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function PieLegendChart({ data }: { data: { name: string; value: number }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (!data.length || total === 0) {
    return <EmptyState message="No data for selected filters" />;
  }

  return (
    <div className="flex items-center gap-4" style={{ minHeight: 240 }}>
      <div className="flex-1 min-w-0 h-[240px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" innerRadius="46%" outerRadius="72%" paddingAngle={2}>
              {data.map((_, i) => (
                <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(v) => [v, "Count"]} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="w-44 shrink-0 flex flex-col gap-1.5 max-h-[240px] overflow-y-auto">
        {data.map((item, i) => {
          const pct = total > 0 ? ((item.value / total) * 100).toFixed(0) : "0";
          return (
            <div key={i} className="flex items-center gap-1.5 text-xs min-w-0">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
              <span className="flex-1 truncate text-foreground/80 capitalize">{item.name}</span>
              <span className="font-semibold tabular-nums">{item.value}</span>
              <span className="text-muted-foreground w-8 text-right tabular-nums">{pct}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">{children}</p>;
}

function EmptyState({ message }: { message: string }) {
  return <div className="flex items-center justify-center h-[220px] text-sm text-muted-foreground">{message}</div>;
}

function AnalyticsSkeleton() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex justify-between">
        <Skeleton className="h-10 w-56" />
        <Skeleton className="h-9 w-24" />
      </div>
      <Skeleton className="h-14 w-full rounded-xl" />
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <div className="grid lg:grid-cols-7 gap-4">
        <Skeleton className="lg:col-span-4 h-72 rounded-xl" />
        <Skeleton className="lg:col-span-3 h-72 rounded-xl" />
      </div>
      <div className="grid lg:grid-cols-2 gap-4">
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    </div>
  );
}
