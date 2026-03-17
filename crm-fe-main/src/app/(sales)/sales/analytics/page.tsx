"use client";

import { useState, useEffect, useCallback } from "react";
import {
  format,
  subDays,
  startOfMonth,
  startOfDay,
  endOfDay,
} from "date-fns";
import { DateRange } from "react-day-picker";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { UserSelector } from "@/components/shared/user-selector";
import {
  dashboardApi,
  leadsApi,
  activitiesApi,
  teamsApi,
  usersApi,
} from "@/lib/api";
import { useAuth } from "@/providers/auth-provider";
import { toast } from "sonner";
import { nowIST } from "@/lib/date-utils";
import {
  Target,
  TrendingUp,
  CheckSquare,
  XCircle,
  DollarSign,
  Percent,
  Zap,
  Calendar as CalendarIcon,
  Phone,
  Mail,
  Users,
  Activity,
  ArrowUpRight,
  ChevronRight,
  RefreshCw,
  X,
} from "lucide-react";

// ─── constants ───────────────────────────────────────────────────────────────

const PIE_COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#8b5cf6",
  "#ef4444",
  "#06b6d4",
  "#ec4899",
  "#6366f1",
  "#84cc16",
  "#f97316",
];

const SOURCE_LABELS: Record<string, string> = {
  website: "Website",
  referral: "Referral",
  cold_call: "Cold Call",
  email_campaign: "Email Camp.",
  social_media: "Social Media",
  trade_show: "Trade Show",
  advertisement: "Ads",
  partner: "Partner",
  organic_search: "Organic",
  paid_search: "Paid Search",
  direct: "Direct",
  other: "Other",
};

const STATUS_LABELS: Record<string, string> = {
  fresh_lead: "Fresh Lead",
  hot_lead: "Hot Lead",
  cold_lead: "Cold Lead",
  meeting_scheduled: "Meeting Sched.",
  did_not_pick: "Did Not Pick",
  follow_up: "Follow Up",
  future_lead: "Future Lead",
  not_interested: "Not Interested",
  not_a_lead: "Not a Lead",
  won: "Won",
  proposal_sent: "Proposal Sent",
  lost: "Lost",
};

const PIPELINE_STAGES = [
  { key: "fresh_lead", label: "Fresh Lead", color: "#3b82f6" },
  { key: "hot_lead", label: "Hot Lead", color: "#ef4444" },
  { key: "cold_lead", label: "Cold Lead", color: "#06b6d4" },
  { key: "meeting_scheduled", label: "Meeting Sched.", color: "#8b5cf6" },
  { key: "follow_up", label: "Follow Up", color: "#f59e0b" },
  { key: "proposal_sent", label: "Proposal Sent", color: "#f97316" },
  { key: "won", label: "Won", color: "#22c55e" },
  { key: "not_interested", label: "Not Interested", color: "#94a3b8" },
  { key: "lost", label: "Lost", color: "#dc2626" },
];

const DATE_PRESETS = [
  { label: "Today", value: "0d" },
  { label: "7 Days", value: "7d" },
  { label: "30 Days", value: "30d" },
  { label: "This Month", value: "mtd" },
];

const ROLE_STYLE: Record<string, string> = {
  admin:
    "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
  manager:
    "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
  employee:
    "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
};

// ─── helpers ──────────────────────────────────────────────────────────────────

function fmtCurrency(n: number) {
  if (n >= 1_000_000) return `₹${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `₹${(n / 1_000).toFixed(1)}K`;
  return `₹${n}`;
}

// ─── DonutWithLegend ─────────────────────────────────────────────────────────

interface DonutProps {
  data: { name: string; value: number }[];
  height?: number;
  emptyMessage?: string;
}

function DonutWithLegend({ data, height = 240, emptyMessage }: DonutProps) {
  const total = data.reduce((s, d) => s + d.value, 0);

  if (!data.length || total === 0) {
    return (
      <div
        className="flex items-center justify-center text-sm text-muted-foreground"
        style={{ height }}
      >
        {emptyMessage ?? "No data for this period"}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3" style={{ minHeight: height }}>
      <div className="flex-1 min-w-0" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius="46%"
              outerRadius="74%"
              dataKey="value"
              paddingAngle={2}
              startAngle={90}
              endAngle={-270}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                borderRadius: "8px",
                fontSize: 12,
                border: "1px solid hsl(var(--border))",
                background: "hsl(var(--card))",
              }}
              formatter={(v: number | undefined, n: string | undefined) => [
                v != null
                  ? `${v} (${total > 0 ? ((v / total) * 100).toFixed(1) : 0}%)`
                  : "0",
                n ?? "",
              ]}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Legend list */}
      <div className="w-44 shrink-0 flex flex-col gap-1.5 max-h-[240px] overflow-y-auto">
        {data.map((item, i) => {
          const pct =
            total > 0 ? ((item.value / total) * 100).toFixed(0) : "0";
          return (
            <div key={i} className="flex items-center gap-1.5 text-xs min-w-0">
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ background: PIE_COLORS[i % PIE_COLORS.length] }}
              />
              <span className="flex-1 truncate text-foreground/75 capitalize">
                {item.name}
              </span>
              <span className="font-semibold tabular-nums text-foreground shrink-0">
                {item.value}
              </span>
              <span className="text-muted-foreground w-8 text-right shrink-0 tabular-nums">
                {pct}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── URL filter helpers ───────────────────────────────────────────────────────

function readUrlParam(key: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  return new URLSearchParams(window.location.search).get(key) || fallback;
}

function buildPresetDate(preset: string): DateRange {
  const n = nowIST();
  if (preset === "0d") return { from: n, to: n };
  if (preset === "7d") return { from: subDays(n, 7), to: n };
  if (preset === "mtd") return { from: startOfMonth(n), to: n };
  return { from: subDays(n, 30), to: n };
}

function initDateFromUrl(): DateRange {
  if (typeof window === "undefined") return buildPresetDate("30d");
  const p = new URLSearchParams(window.location.search);
  const from = p.get("from");
  const to = p.get("to");
  if (from) return { from: new Date(from), to: to ? new Date(to) : new Date(from) };
  return buildPresetDate(p.get("preset") || "30d");
}

// ─── page ────────────────────────────────────────────────────────────────────

export default function SalesAnalyticsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const isManagerOrAbove = user?.role === "admin" || user?.role === "manager";
  const isEmployee = user?.role === "employee";

  const [date, setDate] = useState<DateRange | undefined>(() => initDateFromUrl());
  const [activePreset, setActivePreset] = useState<string>(() =>
    readUrlParam("preset", "30d"),
  );
  const [interval, setInterval] = useState<"daily" | "weekly" | "monthly">(
    () => readUrlParam("interval", "daily") as "daily" | "weekly" | "monthly",
  );
  const [teamId, setTeamId] = useState<string>(() => readUrlParam("teamId", "all"));
  // userId: empty = all (for manager/admin), locked to self for employee
  const [userId, setUserId] = useState<string>(() => readUrlParam("userId", ""));
  const [tableTab, setTableTab] = useState<"reps" | "teams">(
    () => readUrlParam("tab", "reps") as "reps" | "teams",
  );

  const [teams, setTeams] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);

  // Analytics data
  const [kpiData, setKpiData] = useState<any>(null);
  const [activityData, setActivityData] = useState<any[]>([]);
  const [pipeline, setPipeline] = useState<Record<string, number>>({});
  const [userStats, setUserStats] = useState<any[]>([]);
  const [activityCounts, setActivityCounts] = useState<Record<string, number>>(
    {},
  );
  const [leadsWorked, setLeadsWorked] = useState<Record<string, number>>({});
  const [leadsToday, setLeadsToday] = useState<Record<string, number>>({});

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // ── Sync filter state to URL (without triggering re-render)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams();
    if (activePreset) params.set("preset", activePreset);
    if (date?.from) params.set("from", format(date.from, "yyyy-MM-dd"));
    if (date?.to) params.set("to", format(date.to, "yyyy-MM-dd"));
    if (interval !== "daily") params.set("interval", interval);
    if (teamId !== "all") params.set("teamId", teamId);
    if (userId && !isEmployee) params.set("userId", userId);
    if (tableTab !== "reps") params.set("tab", tableTab);
    const qs = params.toString();
    window.history.replaceState(
      null,
      "",
      qs ? `?${qs}` : window.location.pathname,
    );
  }, [activePreset, date, interval, teamId, userId, tableTab, isEmployee]);

  // ── Lock employee to their own ID
  useEffect(() => {
    if (isEmployee && user?.id) {
      setUserId(user.id);
    }
  }, [isEmployee, user?.id]);

  // ── Load teams + role-scoped user list
  useEffect(() => {
    if (!user) return;

    const load = async () => {
      const t = await teamsApi.list();
      setTeams(Array.isArray(t) ? t : []);

      if (isAdmin) {
        const u = await usersApi.list({ limit: 1000 });
        setUsers(u?.data || u || []);
      } else if (isManagerOrAbove && user.teamId) {
        const members = await teamsApi.getMembers(user.teamId);
        const memberList = Array.isArray(members) ? members : [];
        // Put current manager first, then teammates
        const all = [
          user,
          ...memberList.filter((m: any) => m.id !== user.id),
        ];
        setUsers(all);
      } else {
        // Employee: only themselves
        setUsers([user]);
      }
    };

    load().catch(() => {});
  }, [user, isAdmin, isManagerOrAbove]);

  // ── Main data fetch
  const fetchAnalytics = useCallback(
    async (quiet = false) => {
      if (!date?.from || !user) return;
      if (quiet) setIsRefreshing(true);
      else setIsLoading(true);

      try {
        const startDate = date.from.toISOString();
        const endDate = (date.to || date.from).toISOString();
        const todayStart = startOfDay(nowIST()).toISOString();
        const todayEnd = endOfDay(nowIST()).toISOString();

        // Choose the right KPI call per role / selected user
        let kpiCall: Promise<any>;
        if (isEmployee) {
          kpiCall = dashboardApi.getMyPerformance(startDate, endDate);
        } else if (userId) {
          kpiCall = dashboardApi.getUserPerformance(userId, startDate, endDate);
        } else {
          kpiCall = dashboardApi.getLeadAnalytics(startDate, endDate);
        }

        const [kpi, acts, pipe, stats, actCounts, lwCounts, todayRes] =
          await Promise.all([
            kpiCall,
            activitiesApi.getAnalytics({
              startDate,
              endDate,
              interval,
              teamId: teamId === "all" ? undefined : teamId,
              userId: userId || undefined,
            }),
            leadsApi.getPipeline(),
            isManagerOrAbove
              ? leadsApi.getStatsByUser()
              : Promise.resolve({ users: [] }),
            leadsApi.getActivityCountsByUser(),
            leadsApi.getLeadsWorkedByUser(),
            leadsApi.list({ limit: 500, startDate: todayStart, endDate: todayEnd }),
          ]);

        setKpiData(kpi);
        setActivityData(Array.isArray(acts) ? acts : []);
        setPipeline(
          typeof pipe === "object" && pipe !== null
            ? (pipe as Record<string, number>)
            : {},
        );
        // Employee sees only themselves in the table
        const allUsers: any[] = stats?.users || [];
        setUserStats(isEmployee ? allUsers.filter((u) => u.id === user.id) : allUsers);
        setActivityCounts(actCounts || {});
        setLeadsWorked(lwCounts || {});

        // Group today's leads by assigned user
        const todayList: any[] = todayRes?.data || [];
        const todayCounts: Record<string, number> = {};
        for (const lead of todayList) {
          const uid = lead.assignedTo ?? lead.assigned_to;
          if (uid) todayCounts[uid] = (todayCounts[uid] || 0) + 1;
        }
        setLeadsToday(todayCounts);
      } catch {
        toast.error("Failed to load analytics data");
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [date, interval, teamId, userId, user, isEmployee, isManagerOrAbove],
  );

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  // ── Date preset handler
  function applyPreset(value: string) {
    setActivePreset(value);
    const n = nowIST();
    if (value === "0d") setDate({ from: n, to: n });
    else if (value === "7d") setDate({ from: subDays(n, 7), to: n });
    else if (value === "30d") setDate({ from: subDays(n, 30), to: n });
    else if (value === "mtd") setDate({ from: startOfMonth(n), to: n });
  }

  // ── KPI values — works for both getLeadAnalytics and getMyPerformance shapes
  const total = kpiData?.total ?? kpiData?.leadsAssigned ?? 0;
  const wonCount = kpiData?.wonCount ?? kpiData?.leadsWon ?? 0;
  const lostCount = kpiData?.byStatus?.lost ?? 0;
  const totalRevenue = kpiData?.wonValue ?? 0;
  const convRate = kpiData?.conversionRate?.toFixed(1) ?? "0.0";
  const avgDeal = wonCount > 0 && totalRevenue > 0 ? Math.round(totalRevenue / wonCount) : 0;

  // ── Activity totals
  const totalActivities = activityData.reduce((s, d) => s + (d.total || 0), 0);
  const totalCalls = activityData.reduce((s, d) => s + (d.call || 0), 0);
  const totalEmails = activityData.reduce((s, d) => s + (d.email || 0), 0);
  const totalMeetings = activityData.reduce((s, d) => s + (d.meeting || 0), 0);
  const totalStatusChanges = activityData.reduce(
    (s, d) => s + (d.status_change || 0),
    0,
  );

  // ── Donut chart data (only available from getLeadAnalytics — no userId)
  const sourceData = Object.entries(kpiData?.bySource || {})
    .map(([k, v]: [string, any]) => ({
      name: SOURCE_LABELS[k] || k,
      value: v as number,
    }))
    .filter((d) => d.value > 0)
    .sort((a, b) => b.value - a.value);

  const statusBreakdown = Object.entries(kpiData?.byStatus || {})
    .map(([k, v]: [string, any]) => ({
      name: STATUS_LABELS[k] || k.replace(/_/g, " "),
      value: v as number,
    }))
    .filter((d) => d.value > 0)
    .sort((a, b) => b.value - a.value);

  const funnelData = PIPELINE_STAGES.map((s) => ({
    name: s.label,
    count: pipeline[s.key] || 0,
    fill: s.color,
  })).filter((d) => d.count > 0);

  // ── Table row filtering
  const filteredUserStats = userStats.filter((u) => {
    if (userId) return u.id === userId;
    if (teamId !== "all") return u.teamId === teamId;
    return true;
  });

  // ── Team aggregation for team tab
  const teamTable = teams
    .map((t) => {
      const members = userStats.filter((u) => u.teamId === t.id);
      return {
        id: t.id,
        name: t.name,
        memberCount: members.length,
        leadCount: members.reduce((s: number, u: any) => s + (u.leadCount || 0), 0),
        actCount: members.reduce(
          (s: number, u: any) => s + (activityCounts[u.id] || 0),
          0,
        ),
        leadsWorkedCount: members.reduce(
          (s: number, u: any) => s + (leadsWorked[u.id] || 0),
          0,
        ),
        leadsTodayCount: members.reduce(
          (s: number, u: any) => s + (leadsToday[u.id] || 0),
          0,
        ),
      };
    })
    .filter((t) => t.memberCount > 0)
    .sort((a, b) => b.leadCount - a.leadCount);

  const dateLabel =
    date?.from
      ? date.to
        ? `${format(date.from, "MMM d")} – ${format(date.to, "MMM d, yyyy")}`
        : format(date.from, "MMM d, yyyy")
      : "Pick date range";

  if (isLoading) return <AnalyticsSkeleton />;

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Sales Analytics
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isEmployee
              ? "Your personal performance and activity breakdown."
              : "Pipeline health, team performance & trend analysis."}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchAnalytics(true)}
          disabled={isRefreshing}
          className="gap-2 shrink-0"
        >
          <RefreshCw
            className={cn("h-3.5 w-3.5", isRefreshing && "animate-spin")}
          />
          Refresh
        </Button>
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-wrap gap-2 items-center bg-card border rounded-xl p-3">
        {/* Date presets */}
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

        {/* Custom date range */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn("gap-2 text-xs h-8", !date && "text-muted-foreground")}
              onClick={() => setActivePreset("")}
            >
              <CalendarIcon className="h-3.5 w-3.5 shrink-0" />
              <span className="hidden sm:inline">{dateLabel}</span>
              <span className="sm:hidden">Custom</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="range"
              defaultMonth={date?.from}
              selected={date}
              onSelect={(d) => {
                setDate(d);
                setActivePreset("");
              }}
              numberOfMonths={2}
            />
          </PopoverContent>
        </Popover>

        <div className="h-5 w-px bg-border mx-1" />

        {/* Interval */}
        <Select value={interval} onValueChange={(v: any) => setInterval(v)}>
          <SelectTrigger className="w-[110px] h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="daily">Daily</SelectItem>
            <SelectItem value="weekly">Weekly</SelectItem>
            <SelectItem value="monthly">Monthly</SelectItem>
          </SelectContent>
        </Select>

        {/* Team filter — only for manager/admin */}
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

        {/* User filter — role-gated */}
        {isManagerOrAbove && (
          <div className="w-[200px]">
            <UserSelector
              users={users.map((u) => ({
                id: u.id,
                fullName: u.fullName ?? u.full_name ?? "",
                email: u.email ?? "",
                role: u.role,
                isActive: u.isActive ?? u.is_active ?? true,
              }))}
              value={userId}
              onValueChange={setUserId}
              placeholder="All Users"
            />
          </div>
        )}

        {/* Clear user — only if a user is selected and not locked */}
        {userId && isManagerOrAbove && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs text-muted-foreground gap-1"
            onClick={() => setUserId("")}
          >
            <X className="h-3 w-3" />
            Clear user
          </Button>
        )}

        {/* Employee label */}
        {isEmployee && (
          <span className="text-xs text-muted-foreground ml-auto">
            Showing your analytics only
          </span>
        )}
      </div>

      {/* ── Section 1: KPI Overview ── */}
      <section>
        <SectionLabel>KPI Overview</SectionLabel>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            {
              label: "Total Leads",
              value: total,
              icon: Target,
              color: "text-blue-600 dark:text-blue-400",
              bg: "bg-blue-50 dark:bg-blue-950/60",
              border: "border-blue-200 dark:border-blue-800",
            },
            {
              label: "Deals Won",
              value: wonCount,
              icon: CheckSquare,
              color: "text-emerald-600 dark:text-emerald-400",
              bg: "bg-emerald-50 dark:bg-emerald-950/60",
              border: "border-emerald-200 dark:border-emerald-800",
            },
            {
              label: "Deals Lost",
              value: lostCount,
              icon: XCircle,
              color: "text-rose-600 dark:text-rose-400",
              bg: "bg-rose-50 dark:bg-rose-950/60",
              border: "border-rose-200 dark:border-rose-800",
            },
            {
              label: "Revenue Won",
              value: fmtCurrency(totalRevenue),
              icon: DollarSign,
              color: "text-violet-600 dark:text-violet-400",
              bg: "bg-violet-50 dark:bg-violet-950/60",
              border: "border-violet-200 dark:border-violet-800",
            },
            {
              label: "Win Rate",
              value: `${convRate}%`,
              icon: Percent,
              color: "text-amber-600 dark:text-amber-400",
              bg: "bg-amber-50 dark:bg-amber-950/60",
              border: "border-amber-200 dark:border-amber-800",
            },
            {
              label: "Avg Deal Size",
              value: fmtCurrency(avgDeal),
              icon: TrendingUp,
              color: "text-cyan-600 dark:text-cyan-400",
              bg: "bg-cyan-50 dark:bg-cyan-950/60",
              border: "border-cyan-200 dark:border-cyan-800",
            },
          ].map(({ label, value, icon: Icon, color, bg, border }) => (
            <div
              key={label}
              className={cn(
                "rounded-xl border p-4 flex flex-col items-center text-center gap-1",
                bg,
                border,
              )}
            >
              <div className={cn("p-1.5 rounded-lg bg-white/50 dark:bg-black/20 mb-0.5", color)}>
                <Icon className="w-4 h-4" />
              </div>
              <p className={cn("text-xl font-bold tabular-nums", color)}>
                {value}
              </p>
              <p className="text-xs text-muted-foreground leading-tight">
                {label}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Section 2: Activity Strip ── */}
      <section>
        <SectionLabel>Activity Summary</SectionLabel>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {[
            {
              label: "Total Activities",
              value: totalActivities,
              icon: Activity,
              color: "text-primary",
              cls: "bg-primary/5 border-primary/20",
            },
            {
              label: "Calls Made",
              value: totalCalls,
              icon: Phone,
              color: "text-emerald-600 dark:text-emerald-400",
              cls: "bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800",
            },
            {
              label: "Emails Sent",
              value: totalEmails,
              icon: Mail,
              color: "text-amber-600 dark:text-amber-400",
              cls: "bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800",
            },
            {
              label: "Meetings",
              value: totalMeetings,
              icon: Users,
              color: "text-violet-600 dark:text-violet-400",
              cls: "bg-violet-50 dark:bg-violet-950/60 border-violet-200 dark:border-violet-800",
            },
            {
              label: "Status Changes",
              value: totalStatusChanges,
              icon: ArrowUpRight,
              color: "text-blue-600 dark:text-blue-400",
              cls: "bg-blue-50 dark:bg-blue-950/60 border-blue-200 dark:border-blue-800",
            },
          ].map(({ label, value, icon: Icon, color, cls }) => (
            <div
              key={label}
              className={cn("rounded-xl border p-4 flex items-center gap-3", cls)}
            >
              <Icon className={cn("w-5 h-5 shrink-0", color)} />
              <div>
                <p className={cn("text-2xl font-bold tabular-nums", color)}>
                  {value}
                </p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Section 3: Activity Trend + Pipeline Funnel ── */}
      <div className="grid grid-cols-1 lg:grid-cols-7 gap-4">
        <Card className="lg:col-span-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Activity Trends</CardTitle>
            <CardDescription className="text-xs">
              Activity volume over time — {interval}
              {userId
                ? ` · ${users.find((u) => u.id === userId)?.fullName ?? "Selected user"}`
                : ""}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              {activityData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={activityData}
                    margin={{ top: 4, right: 4, left: -10, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="hsl(var(--border))"
                    />
                    <XAxis
                      dataKey="date"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: "hsl(var(--muted-foreground))" }}
                    />
                    <YAxis
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: "hsl(var(--muted-foreground))" }}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: "8px",
                        fontSize: 12,
                        border: "1px solid hsl(var(--border))",
                        background: "#ffffff",
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                    <Bar
                      dataKey="status_change"
                      stackId="a"
                      fill="#3b82f6"
                      name="Status Changes"
                    />
                    <Bar
                      dataKey="call"
                      stackId="a"
                      fill="#10b981"
                      name="Calls"
                    />
                    <Bar
                      dataKey="email"
                      stackId="a"
                      fill="#f59e0b"
                      name="Emails"
                    />
                    <Bar
                      dataKey="meeting"
                      stackId="a"
                      fill="#8b5cf6"
                      name="Meetings"
                      radius={[3, 3, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState message="No activity data for this period" />
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Pipeline Funnel</CardTitle>
            <CardDescription className="text-xs">
              Current lead count by pipeline stage
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              {funnelData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={funnelData}
                    layout="vertical"
                    margin={{ left: 0, right: 32, top: 4, bottom: 4 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      horizontal={false}
                      stroke="hsl(var(--border))"
                    />
                    <XAxis
                      type="number"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: "hsl(var(--muted-foreground))" }}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={115}
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: "hsl(var(--muted-foreground))" }}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: "8px",
                        fontSize: 12,
                        border: "1px solid hsl(var(--border))",
                        background: "#ffffff",
                      }}
                      formatter={(v) => [v, "Leads"]}
                    />
                    <Bar dataKey="count" name="Leads" radius={[0, 4, 4, 0]}>
                      {funnelData.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState message="No pipeline data available" />
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Section 4: Lead Source + Deal Status donuts ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Lead Source Breakdown</CardTitle>
            <CardDescription className="text-xs">
              {sourceData.length
                ? "Distribution of lead origins for the period"
                : "Available when viewing aggregate data (no user filter)"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DonutWithLegend
              data={sourceData}
              height={240}
              emptyMessage="No source data — remove user filter for aggregate view"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Deal Status Breakdown</CardTitle>
            <CardDescription className="text-xs">
              {statusBreakdown.length
                ? "Status distribution across all leads"
                : "Available when viewing aggregate data (no user filter)"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DonutWithLegend
              data={statusBreakdown}
              height={240}
              emptyMessage="No status data — remove user filter for aggregate view"
            />
          </CardContent>
        </Card>
      </div>

      {/* ── Section 5: Team & Rep Comparison Table ── */}
      {isManagerOrAbove && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <CardTitle className="text-base">
                  Team &amp; Rep Performance
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  Click a rep to filter all charts to their activity.
                  {userId && (
                    <button
                      onClick={() => setUserId("")}
                      className="ml-2 text-primary underline-offset-2 hover:underline"
                    >
                      Clear filter
                    </button>
                  )}
                </CardDescription>
              </div>
              <Tabs
                value={tableTab}
                onValueChange={(v) => setTableTab(v as "reps" | "teams")}
              >
                <TabsList className="h-8">
                  <TabsTrigger value="reps" className="text-xs px-3">
                    By Rep
                  </TabsTrigger>
                  <TabsTrigger value="teams" className="text-xs px-3">
                    By Team
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {tableTab === "reps" ? (
              <RepTable
                rows={filteredUserStats}
                activityCounts={activityCounts}
                leadsWorked={leadsWorked}
                leadsToday={leadsToday}
                selectedUserId={userId}
                onRowClick={(id) =>
                  setUserId((prev) => (prev === id ? "" : id))
                }
              />
            ) : (
              <TeamTable rows={teamTable} />
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Section 6: Sales Velocity ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-500" />
            Sales Velocity Snapshot
          </CardTitle>
          <CardDescription className="text-xs">
            Pipeline summary for the selected period
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              {
                label: "Leads Created",
                value: total,
                color: "text-blue-600 dark:text-blue-400",
                bg: "bg-blue-50 dark:bg-blue-950/60 border-blue-200 dark:border-blue-800",
              },
              {
                label: "Deals Won",
                value: wonCount,
                color: "text-emerald-600 dark:text-emerald-400",
                bg: "bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800",
              },
              {
                label: "Leads Lost",
                value: lostCount,
                color: "text-rose-600 dark:text-rose-400",
                bg: "bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800",
              },
              {
                label: "Win Rate",
                value: `${convRate}%`,
                color: "text-violet-600 dark:text-violet-400",
                bg: "bg-violet-50 dark:bg-violet-950/60 border-violet-200 dark:border-violet-800",
              },
            ].map(({ label, value, color, bg }) => (
              <div
                key={label}
                className={cn("rounded-xl border p-5 text-center", bg)}
              >
                <p className={cn("text-3xl font-bold tabular-nums", color)}>
                  {value}
                </p>
                <p className="text-sm text-muted-foreground mt-1">{label}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── RepTable ─────────────────────────────────────────────────────────────────

function RepTable({
  rows,
  activityCounts,
  leadsWorked,
  leadsToday,
  selectedUserId,
  onRowClick,
}: {
  rows: any[];
  activityCounts: Record<string, number>;
  leadsWorked: Record<string, number>;
  leadsToday: Record<string, number>;
  selectedUserId: string;
  onRowClick: (id: string) => void;
}) {
  const sorted = [...rows].sort(
    (a, b) => (b.leadCount || 0) - (a.leadCount || 0),
  );

  if (!sorted.length) {
    return (
      <div className="py-10 text-center text-sm text-muted-foreground">
        No rep data available
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="pl-6 w-[200px]">Rep</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Team</TableHead>
            <TableHead className="text-right">Leads Today</TableHead>
            <TableHead className="text-right">Total Leads</TableHead>
            <TableHead className="text-right">Leads Worked</TableHead>
            <TableHead className="text-right pr-6">Activities</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((u) => {
            const isSelected = selectedUserId === u.id;
            return (
              <TableRow
                key={u.id}
                className={cn(
                  "cursor-pointer transition-colors",
                  isSelected && "bg-primary/5 border-l-2 border-l-primary",
                )}
                onClick={() => onRowClick(u.id)}
              >
                <TableCell className="pl-6 font-medium">
                  <div className="flex items-center gap-2">
                    {isSelected && (
                      <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                    )}
                    {u.fullName || "—"}
                  </div>
                </TableCell>
                <TableCell>
                  <span
                    className={cn(
                      "text-xs font-medium px-2 py-0.5 rounded-full",
                      ROLE_STYLE[u.role] ??
                        "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
                    )}
                  >
                    {u.role}
                  </span>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {u.teamName || "—"}
                </TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground">
                  {leadsToday[u.id] ?? 0}
                </TableCell>
                <TableCell className="text-right tabular-nums font-semibold">
                  {u.leadCount ?? 0}
                </TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground">
                  {leadsWorked[u.id] ?? 0}
                </TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground pr-6">
                  {activityCounts[u.id] ?? 0}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

// ─── TeamTable ────────────────────────────────────────────────────────────────

function TeamTable({
  rows,
}: {
  rows: {
    id: string;
    name: string;
    memberCount: number;
    leadCount: number;
    actCount: number;
    leadsWorkedCount: number;
    leadsTodayCount: number;
  }[];
}) {
  if (!rows.length) {
    return (
      <div className="py-10 text-center text-sm text-muted-foreground">
        No team data available
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="pl-6">Team</TableHead>
            <TableHead className="text-right">Members</TableHead>
            <TableHead className="text-right">Leads Today</TableHead>
            <TableHead className="text-right">Total Leads</TableHead>
            <TableHead className="text-right">Leads Worked</TableHead>
            <TableHead className="text-right pr-6">Activities</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((t) => (
            <TableRow key={t.id}>
              <TableCell className="pl-6 font-medium">{t.name}</TableCell>
              <TableCell className="text-right tabular-nums text-muted-foreground">
                {t.memberCount}
              </TableCell>
              <TableCell className="text-right tabular-nums text-muted-foreground">
                {t.leadsTodayCount}
              </TableCell>
              <TableCell className="text-right tabular-nums font-semibold">
                {t.leadCount}
              </TableCell>
              <TableCell className="text-right tabular-nums text-muted-foreground">
                {t.leadsWorkedCount}
              </TableCell>
              <TableCell className="text-right tabular-nums text-muted-foreground pr-6">
                {t.actCount}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
      {children}
    </p>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
      {message}
    </div>
  );
}

// ─── skeleton ─────────────────────────────────────────────────────────────────

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
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-xl" />
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
      <Skeleton className="h-64 rounded-xl" />
      <Skeleton className="h-40 rounded-xl" />
    </div>
  );
}
