"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { differenceInCalendarDays, format, subDays } from "date-fns";
import { DateRange } from "react-day-picker";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
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
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { UserSelector } from "@/components/shared/user-selector";
import { StatsCard } from "@/components/dashboard";
import {
  dashboardApi,
  leadsApi,
  activitiesApi,
  teamsApi,
  usersApi,
} from "@/lib/api";
import { LEAD_STATUS_CONFIG } from "@/config/constants";
import { useAuth } from "@/providers/auth-provider";
import { useDepartment } from "@/providers/department-context";
import { toast } from "sonner";
import {
  nowIST,
  getShiftAwareDateKeyIST,
  getShiftAwareDayBoundsISO,
} from "@/lib/date-utils";
import {
  Target,
  TrendingUp,
  Briefcase,
  CheckSquare,
  AlertTriangle,
  CircleDollarSign,
  DollarSign,
  Percent,
  Clock,
  CalendarClock,
  CheckCircle2,
  Trophy,
  RefreshCw,
  Calendar as CalendarIcon,
  XCircle,
  Bell,
  BellRing,
  ArrowRight,
  Activity,
} from "lucide-react";

const PIPELINE_STAGES = LEAD_STATUS_CONFIG.map((s) => s.value);
const PIPELINE_LABELS: Record<string, string> = LEAD_STATUS_CONFIG.reduce(
  (acc, s) => {
    acc[s.value] = s.label;
    return acc;
  },
  {} as Record<string, string>,
);
const PIPELINE_COLORS: Record<string, string> = {
  fresh_lead: "#3b82f6",
  hot_lead: "#ef4444",
  cold_lead: "#06b6d4",
  meeting_scheduled: "#8b5cf6",
  did_not_pick: "#f59e0b",
  follow_up: "#6366f1",
  future_lead: "#0891b2",
  not_interested: "#64748b",
  not_a_lead: "#6b7280",
  won: "#22c55e",
  proposal_sent: "#f97316",
};

// Priority statuses for Top Deals
const TOP_DEALS_PRIORITY_STATUSES = ["won", "meeting_scheduled", "proposal_sent", "hot_lead"];
const MAX_ACTIVITY_DISPLAY_COUNT = 1000;
const MAX_CUSTOM_RANGE_DAYS = 365;

const DATE_PRESETS = [
  { label: "Today", value: "0d", days: 0 },
  { label: "7 Days", value: "7d", days: 7 },
  { label: "30 Days", value: "30d", days: 30 },
  { label: "90 Days", value: "90d", days: 90 },
];

export default function SalesDashboardPage() {
  const now = nowIST();
  const router = useRouter();
  const { user } = useAuth();
  const { currentDepartment, isLoading: isDepartmentLoading } = useDepartment();
  const salesDepartmentId = currentDepartment?.id;

  const [date, setDate] = useState<DateRange | undefined>({
    from: subDays(now, 30),
    to: now,
  });
  const [draftDate, setDraftDate] = useState<DateRange | undefined>({
    from: subDays(now, 30),
    to: now,
  });
  const [isDatePopoverOpen, setIsDatePopoverOpen] = useState(false);
  const [activePreset, setActivePreset] = useState("30d");
  const [teamId, setTeamId] = useState("all");
  const [userId, setUserId] = useState("");
  const [teams, setTeams] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [dashData, setDashData] = useState<any>(null);
  const [topDeals, setTopDeals] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [reminders, setReminders] = useState<any>({ overdue: 0, dueToday: 0, pending: 0, total: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isFilterContextReady, setIsFilterContextReady] = useState(false);
  const inFlightFetchRef = useRef<Promise<void> | null>(null);
  const lastFetchKeyRef = useRef<string>("");

  // Pick activity scope based on role — avoids 403 for managers/employees
  const activityScope =
    user?.role === "admin"
      ? "all-crm"
      : user?.role === "manager"
        ? "team"
        : "self";

  const isAdmin = user?.role === "admin";
  const isManager = user?.role === "manager";
  const isEmployee = user?.role === "employee";

  useEffect(() => {
    setDraftDate(date);
  }, [date]);

  useEffect(() => {
    if (!user || isDepartmentLoading || !salesDepartmentId) return;

    const loadScopeContext = async () => {
      const userParams: any = {
        limit: 1000,
        departmentId: salesDepartmentId,
      };

      if (isManager && user.teamId) {
        userParams.teamId = user.teamId;
      }

      const [teamsResult, usersResult] = await Promise.allSettled([
        teamsApi.list(),
        usersApi.list(userParams),
      ]);

      let fetchedTeams =
        teamsResult.status === "fulfilled" && Array.isArray(teamsResult.value)
          ? teamsResult.value.filter(
              (team: any) => team.departmentId === salesDepartmentId,
            )
          : [];

      let fetchedUsers =
        usersResult.status === "fulfilled"
          ? usersResult.value?.data ||
            (Array.isArray(usersResult.value) ? usersResult.value : [])
          : [];

      if (isManager && user.teamId) {
        fetchedTeams = fetchedTeams.filter((team: any) => team.id === user.teamId);
        fetchedUsers = fetchedUsers.filter(
          (member: any) =>
            member.id === user.id ||
            member.teamId === user.teamId ||
            member.team_id === user.teamId,
        );
      }

      if (isEmployee) {
        fetchedUsers = fetchedUsers.filter((member: any) => member.id === user.id);
      }

      setTeams(fetchedTeams);
      setUsers(fetchedUsers);
      setIsFilterContextReady(true);
    };

    setIsFilterContextReady(false);
    void loadScopeContext();
  }, [
    isDepartmentLoading,
    isEmployee,
    isManager,
    salesDepartmentId,
    user,
  ]);

  useEffect(() => {
    if (teamId !== "all" && !teams.some((t: any) => t.id === teamId)) {
      setTeamId("all");
    }
  }, [teamId, teams]);

  useEffect(() => {
    if (isEmployee) return;
    if (userId && !users.some((u: any) => u.id === userId)) {
      setUserId("");
    }
  }, [isEmployee, userId, users]);

  const fetchData = useCallback(async () => {
    if (!user || !date?.from || !salesDepartmentId || !isFilterContextReady) return;
    const shiftType = user.shiftType;
    const fromKey = getShiftAwareDateKeyIST(date.from, shiftType);
    const toKey = getShiftAwareDateKeyIST(date.to || date.from, shiftType);
    const startDate = getShiftAwareDayBoundsISO(fromKey, shiftType).startDate;
    const endDate = getShiftAwareDayBoundsISO(toKey, shiftType).endDate;
    const scopedTeamId =
      isEmployee ? undefined : teamId === "all" ? undefined : teamId;
    const scopedUserId = isEmployee ? user.id : userId || undefined;
    const allowedUserIds = new Set(
      users
        .map((u: any) => u.id)
        .filter((id: unknown): id is string => typeof id === "string" && id.length > 0),
    );

    const fetchKey = JSON.stringify({
      userId: user.id,
      role: user.role,
      startDate,
      endDate,
      scopedTeamId: scopedTeamId || "all",
      scopedUserId: scopedUserId || "all",
      activityScope,
      salesDepartmentId,
    });

    if (inFlightFetchRef.current && lastFetchKeyRef.current === fetchKey) {
      return inFlightFetchRef.current;
    }

    lastFetchKeyRef.current = fetchKey;

    const run = async () => {
      setIsLoading(true);
      try {
        const [dashResult, analyticsResult, dealsResult, userWiseResult, actsResult, remindersResult] =
          await Promise.allSettled([
          dashboardApi.get(salesDepartmentId),
          dashboardApi.getLeadAnalytics(
            startDate,
            endDate,
            scopedTeamId,
            scopedUserId,
            salesDepartmentId,
          ),
          leadsApi.list({
            limit: 1000,
            sortBy: "lead_value",
            sortOrder: "desc",
            startDate,
            endDate,
            // Role scoping:
            // - Admin: all CRM leads (no scoping params)
            // - Manager: entire team including own leads
            // - Employee: only own leads
            ...(scopedUserId && { assignedTo: scopedUserId }),
            ...(scopedTeamId && { teamId: scopedTeamId }),
          }),
          dashboardApi.getUserWiseAnalytics({
            startDate,
            endDate,
            teamId: scopedTeamId,
            userId: scopedUserId,
            departmentId: salesDepartmentId,
          }),
          activitiesApi.list({
            limit: 10,
            scope: activityScope,
            startDate,
            endDate,
            departmentId: salesDepartmentId,
            ...(scopedTeamId && { teamId: scopedTeamId }),
            ...(scopedUserId && { userId: scopedUserId }),
          }),
          leadsApi.getAllReminders({ status: "pending", limit: 100 }),
          ]);

        const baseDash =
          dashResult.status === "fulfilled" ? dashResult.value : null;
        const analytics =
          analyticsResult.status === "fulfilled" ? analyticsResult.value : null;

        setDashData({
          ...(baseDash || {}),
          leads: {
            ...(baseDash?.leads || {}),
            total: baseDash?.leads?.total || analytics?.total || 0,
            newThisMonth: analytics?.total || 0,
            wonThisMonth: analytics?.wonCount || 0,
            pipeline: analytics?.byStatus || {},
          },
          revenue: {
            ...(baseDash?.revenue || {}),
            total: analytics?.totalValue || 0,
          },
        });
      
      // Filter and sort top deals by priority statuses (limit to 10)
        const allDeals = dealsResult.status === "fulfilled"
          ? dealsResult.value?.data || []
          : [];

        const scopedDeals =
          allowedUserIds.size > 0
            ? allDeals.filter((deal: any) => {
                const assigneeId =
                  deal.assignedTo || deal.assigned_to || deal.userId || deal.user_id || null;
                if (!assigneeId) return false;
                return allowedUserIds.has(assigneeId);
              })
            : [];
      
        const priorityDeals = scopedDeals
          .filter((deal: any) => TOP_DEALS_PRIORITY_STATUSES.includes(deal.status))
          .sort((a: any, b: any) => {
            const aIndex = TOP_DEALS_PRIORITY_STATUSES.indexOf(a.status);
            const bIndex = TOP_DEALS_PRIORITY_STATUSES.indexOf(b.status);
            if (aIndex !== bIndex) return aIndex - bIndex;
            return (b.leadValue || b.lead_value || 0) - (a.leadValue || a.lead_value || 0);
          })
          .slice(0, 10);
      
        setTopDeals(priorityDeals);
      
      // Sort leaderboard by activities + leads (date-range aware)
        const userWiseData =
          userWiseResult.status === "fulfilled" ? userWiseResult.value : null;
        let leaderboardData = (userWiseData?.users || []).map((u: any) => ({
          id: u.id,
          fullName: u.fullName || u.full_name || "Unknown",
          teamName: u.teamName || u.team_name || null,
          role: u.role || "",
          activityCount: u.activitiesLogged || 0,
          activityCountCapped: Boolean(u.activityCountCapped),
          leadCount: u.totalLeads || 0,
        }));

        leaderboardData = leaderboardData
          .map((rep: any) => ({
            ...rep,
            activityCount: rep.activityCount || 0,
            activityCountCapped:
              Boolean(rep.activityCountCapped) ||
              Number(rep.activityCount || 0) >= MAX_ACTIVITY_DISPLAY_COUNT,
            leadCount: rep.leadCount || 0,
          }))
          .sort((a: any, b: any) => {
            // Primary sort: activities
            if (b.activityCount !== a.activityCount) {
              return b.activityCount - a.activityCount;
            }
            // Secondary sort: leads
            return b.leadCount - a.leadCount;
          })
          .slice(0, 8);
      
        setLeaderboard(leaderboardData);
      
        setActivities(
          actsResult.status === "fulfilled"
            ? actsResult.value?.data || []
            : [],
        );

      // Calculate reminder counts
        const remindersData = remindersResult.status === "fulfilled"
          ? remindersResult.value?.data || []
          : [];

        const filteredReminders = remindersData.filter((r: any) => {
          const reminderUserId = r.userId || r.user_id || r.user?.id || null;
          if (allowedUserIds.size === 0) {
            return false;
          }
          if (reminderUserId && !allowedUserIds.has(reminderUserId)) {
            return false;
          }
          const reminderTime = new Date(
            r.reminderAt || r.reminder_at || r.createdAt || r.created_at,
          ).getTime();
          return (
            reminderTime >= new Date(startDate).getTime() &&
            reminderTime <= new Date(endDate).getTime()
          );
        });
      
        const nowTime = new Date().getTime();
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);
      
        const overdue = filteredReminders.filter((r: any) => {
          const reminderTime = new Date(r.reminderAt || r.reminder_at).getTime();
          return reminderTime < nowTime;
        }).length;
      
        const dueToday = filteredReminders.filter((r: any) => {
          const reminderTime = new Date(r.reminderAt || r.reminder_at).getTime();
          return reminderTime >= todayStart.getTime() && reminderTime <= todayEnd.getTime();
        }).length;
      
        setReminders({
          overdue,
          dueToday,
          pending: filteredReminders.length,
          total: filteredReminders.length,
        });

        if (dashResult.status === "rejected") {
          toast.error("Failed to load dashboard data");
        }
      } catch {
        toast.error("Failed to load dashboard data");
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
        inFlightFetchRef.current = null;
      }
    };

    inFlightFetchRef.current = run();
    return inFlightFetchRef.current;
  }, [
    user,
    date,
    teamId,
    userId,
    activityScope,
    isAdmin,
    isManager,
    isEmployee,
    isFilterContextReady,
    salesDepartmentId,
    users,
  ]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Derived KPIs
  const pipeline = dashData?.leads?.pipeline || {};
  const totalLeads = dashData?.leads?.total || 0;
  const newLeads = dashData?.leads?.newThisMonth || 0;
  const wonLeads = pipeline.won || 0;
  const lostLeads = pipeline.lost || 0;
  const totalRevenue = dashData?.revenue?.total || 0;
  const activeDeals = ["contacted", "qualified", "hot_lead", "meeting_scheduled", "proposal_sent", "negotiation"].reduce(
    (sum, s) => sum + (pipeline[s] || 0),
    0,
  );
  const convRate =
    totalLeads > 0 ? ((wonLeads / totalLeads) * 100).toFixed(1) : "0.0";
  const avgDeal = wonLeads > 0 ? Math.round(totalRevenue / wonLeads) : 0;
  const tasks = dashData?.tasks || {};

  // Show all pipeline stages and improve readability with explicit counts.
  const pipelineChartData = PIPELINE_STAGES.map((s) => ({
    name: PIPELINE_LABELS[s] || s,
    count: pipeline[s] || 0,
    fill: PIPELINE_COLORS[s] || "#94a3b8",
  }));

  const pipelineMaxCount = Math.max(...pipelineChartData.map((item) => item.count), 0);
  const draftRange = draftDate?.from
    ? { from: draftDate.from, to: draftDate.to || draftDate.from }
    : undefined;
  const isDraftRangeTooLong =
    !!draftRange?.from &&
    !!draftRange?.to &&
    differenceInCalendarDays(draftRange.to, draftRange.from) > MAX_CUSTOM_RANGE_DAYS;
  const canApplyDraftRange = Boolean(
    draftRange?.from && draftRange?.to && !isDraftRangeTooLong,
  );

  if (isLoading) return <PageSkeleton />;

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Sales Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Real-time operational overview of your sales pipeline.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setIsRefreshing(true);
            fetchData();
          }}
          disabled={isRefreshing}
        >
          <RefreshCw
            className={cn("w-4 h-4 mr-2", isRefreshing && "animate-spin")}
          />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center bg-card p-4 rounded-lg border">
        {/* Preset buttons */}
        <div className="flex gap-1.5 flex-wrap">
          {DATE_PRESETS.map((p) => (
            <Button
              key={p.value}
              variant={activePreset === p.value ? "default" : "outline"}
              size="sm"
              onClick={() => {
                const current = nowIST();
                setActivePreset(p.value);
                setDate({ from: subDays(current, p.days), to: current });
              }}
            >
              {p.label}
            </Button>
          ))}
        </div>

        {/* Date range picker */}
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
            <Button
              variant="outline"
              className={cn(
                "w-[260px] justify-start text-left font-normal",
                !date && "text-muted-foreground",
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {date?.from
                ? date.to
                  ? `${format(date.from, "LLL dd, y")} – ${format(date.to, "LLL dd, y")}`
                  : format(date.from, "LLL dd, y")
                : "Pick date range"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-3" align="start">
            <div className="space-y-3">
              <Calendar
                initialFocus
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
                <p className="text-xs text-muted-foreground">Max custom range: 1 year</p>
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
                      setActivePreset("custom");
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

        {/* Team filter - only for admin and manager */}
        {(isAdmin || isManager) && (
          <Select value={teamId} onValueChange={setTeamId}>
            <SelectTrigger className="w-[180px]">
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

        {/* User filter - only for admin and manager */}
        {(isAdmin || isManager) && (
          <>
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
              />
            </div>
            {userId && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setUserId("")}
                className="text-xs text-muted-foreground"
              >
                Clear user
              </Button>
            )}
          </>
        )}
      </div>

      {/* Section 1: KPI Cards */}
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Key Metrics
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatsCard
            title="Total Leads"
            value={totalLeads}
            icon={Target}
            accentColor="blue"
          />
          <StatsCard
            title="Leads Worked on"
            value={newLeads}
            icon={TrendingUp}
            accentColor="green"
            description="This month"
          />
          <StatsCard
            title="Active Deals"
            value={activeDeals}
            icon={Briefcase}
            accentColor="cyan"
          />
          <StatsCard
            title="Deals Won"
            value={wonLeads}
            icon={CheckSquare}
            accentColor="emerald"
          />
          <StatsCard
            title="Deals Lost"
            value={lostLeads}
            icon={XCircle}
            accentColor="rose"
          />
          <StatsCard
            title="Total Revenue"
            value={`₹${Number(totalRevenue).toLocaleString("en-IN")}`}
            icon={CircleDollarSign}
            accentColor="purple"
          />
          <StatsCard
            title="Conversion Rate"
            value={`${convRate}%`}
            icon={Percent}
            accentColor="amber"
          />
          <StatsCard
            title="Avg Deal Value"
            value={`₹${avgDeal.toLocaleString("en-IN")}`}
            icon={DollarSign}
            accentColor="orange"
          />
        </div>
      </div>

      {/* Section 2: Pipeline Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Sales Pipeline</CardTitle>
          <CardDescription>
            Deal distribution across pipeline stages
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pipelineChartData.length > 0 ? (
            <div className="h-[340px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={pipelineChartData}
                  margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="name"
                    interval={0}
                    angle={-20}
                    textAnchor="end"
                    height={70}
                    tickLine={false}
                    axisLine={false}
                    fontSize={11}
                  />
                  <YAxis
                    allowDecimals={false}
                    tickLine={false}
                    axisLine={false}
                    width={28}
                    fontSize={12}
                    domain={[0, Math.max(5, pipelineMaxCount)]}
                  />
                  <Tooltip
                    contentStyle={{ borderRadius: "8px" }}
                    formatter={(v) => [v, "Leads"]}
                  />
                  <Bar dataKey="count" name="Leads" radius={[6, 6, 0, 0]}>
                    {pipelineChartData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-muted-foreground text-sm">
              No pipeline data available
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 3: Tasks/Reminders below pipeline */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Tasks & Follow-ups</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push("/sales/tasks")}
                  className="h-8"
                >
                  View All
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
              <CardDescription className="text-xs">Current task status</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {[
                {
                  label: "Overdue",
                  value: tasks.overdue || 0,
                  icon: AlertTriangle,
                  bg: "bg-rose-50 dark:bg-rose-950",
                  border: "border-rose-200 dark:border-rose-800",
                  iconColor: "text-rose-600",
                  badgeCls: "bg-rose-100 text-rose-700 border-0",
                },
                {
                  label: "Due Today",
                  value: tasks.dueToday || 0,
                  icon: Clock,
                  bg: "bg-orange-50 dark:bg-orange-950",
                  border: "border-orange-200 dark:border-orange-800",
                  iconColor: "text-orange-600",
                  badgeCls: "bg-orange-100 text-orange-700 border-0",
                },
                {
                  label: "Pending",
                  value: tasks.pending || 0,
                  icon: CalendarClock,
                  bg: "bg-blue-50 dark:bg-blue-950",
                  border: "border-blue-200 dark:border-blue-800",
                  iconColor: "text-blue-600",
                  badgeCls: "bg-blue-100 text-blue-700 border-0",
                },
              ].map(({ label, value, icon: Icon, bg, border, iconColor, badgeCls }) => (
                <div
                  key={label}
                  className={cn(
                    "flex items-center justify-between p-2.5 rounded-lg border",
                    bg,
                    border,
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={cn("w-4 h-4", iconColor)} />
                    <span className="font-medium text-sm">{label}</span>
                  </div>
                  <Badge className={badgeCls}>{value}</Badge>
                </div>
              ))}
            </CardContent>
        </Card>

        <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Reminders</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push("/reminders")}
                  className="h-8"
                >
                  View All
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
              <CardDescription className="text-xs">Sales reminders status</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {[
                {
                  label: "Overdue",
                  value: reminders.overdue || 0,
                  icon: BellRing,
                  bg: "bg-rose-50 dark:bg-rose-950",
                  border: "border-rose-200 dark:border-rose-800",
                  iconColor: "text-rose-600",
                  badgeCls: "bg-rose-100 text-rose-700 border-0",
                },
                {
                  label: "Due Today",
                  value: reminders.dueToday || 0,
                  icon: Bell,
                  bg: "bg-amber-50 dark:bg-amber-950",
                  border: "border-amber-200 dark:border-amber-800",
                  iconColor: "text-amber-600",
                  badgeCls: "bg-amber-100 text-amber-700 border-0",
                },
                {
                  label: "Pending",
                  value: reminders.pending || 0,
                  icon: CalendarClock,
                  bg: "bg-blue-50 dark:bg-blue-950",
                  border: "border-blue-200 dark:border-blue-800",
                  iconColor: "text-blue-600",
                  badgeCls: "bg-blue-100 text-blue-700 border-0",
                },
              ].map(({ label, value, icon: Icon, bg, border, iconColor, badgeCls }) => (
                <div
                  key={label}
                  className={cn(
                    "flex items-center justify-between p-2.5 rounded-lg border",
                    bg,
                    border,
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={cn("w-4 h-4", iconColor)} />
                    <span className="font-medium text-sm">{label}</span>
                  </div>
                  <Badge className={badgeCls}>{value}</Badge>
                </div>
              ))}
            </CardContent>
        </Card>
      </div>

      {/* Section 4 + 6: Recent Activity + Leaderboard */}
      <div className="grid grid-cols-1 lg:grid-cols-7 gap-6 ">
        <Card className="lg:col-span-4">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recent Sales Activity</CardTitle>
                <CardDescription>
                  Latest actions across the sales team
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/activity")}
              >
                View All
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {activities.length > 0 ? (
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {activities.map((act: any, i) => (
                  <div key={i} className="flex gap-3 items-start text-sm border-b last:border-0 pb-3 last:pb-0">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Activity className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground">
                        {act.userName ||
                          act.user?.fullName ||
                          act.user?.full_name ||
                          "Someone"}
                      </p>
                      <p className="text-muted-foreground mt-0.5">
                        {act.title || act.description || (
                          <>
                            {act.action === "created" && "created a"}
                            {act.action === "updated" && "updated a"}
                            {act.action === "deleted" && "deleted a"}
                            {act.action === "status_changed" && "changed status of"}
                            {act.action === "assigned" && "was assigned to"}
                            {act.action === "commented" && "commented on"}
                            {!act.action && "performed action on"}
                            {" "}
                            {act.resourceType === "lead" && "lead"}
                            {act.resourceType === "task" && "task"}
                            {act.resourceType === "contact" && "contact"}
                            {!act.resourceType && "an item"}
                          </>
                        )}
                      </p>
                      {(act.entityName || act.entity_name) && (
                        <p className="text-xs text-primary/80 mt-0.5">
                          {act.entityName || act.entity_name}
                        </p>
                      )}
                      <span className="text-xs text-muted-foreground mt-1 block">
                        {act.createdAt || act.created_at
                          ? format(
                              new Date(act.createdAt || act.created_at),
                              "MMM d, HH:mm",
                            )
                          : ""}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-8 text-center">
                No recent activity
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-yellow-500" />
              Sales Leaderboard
            </CardTitle>
            <CardDescription>Top performers by activities & leads</CardDescription>
          </CardHeader>
          <CardContent className="max-h-[500px] overflow-y-auto pr-1">
            {leaderboard.length > 0 ? (
              <div className="space-y-3">
                {leaderboard.map((rep: any, i) => (
                  <div key={rep.id || i} className="flex items-center gap-3 py-1">
                    <span
                      className={cn(
                        "w-7 h-7 flex items-center justify-center rounded-full text-xs font-bold flex-shrink-0",
                        i === 0
                          ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-100"
                          : i === 1
                            ? "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-200"
                            : i === 2
                              ? "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-100"
                              : "bg-muted text-muted-foreground",
                      )}
                    >
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {rep.fullName || "Unknown"}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {rep.teamName || rep.role || ""}
                      </p>
                    </div>
                    <div className="text-right text-xs flex-shrink-0">
                      <div className="flex flex-col gap-0.5">
                        <p className="font-semibold text-primary">
                          {rep.activityCountCapped
                            ? `${MAX_ACTIVITY_DISPLAY_COUNT}+ activities`
                            : `${rep.activityCount || 0} activities`}
                        </p>
                        <p className="text-muted-foreground">
                          {rep.leadCount || 0} leads
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-8 text-center">
                No data available
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Section 5: Top Deals */}
      <Card>
        <CardHeader>
          <CardTitle>Top Deals / Opportunities</CardTitle>
          <CardDescription>
            Top 10 highest-value priority deals (Won → Meeting Scheduled → Proposal Sent → Hot Lead)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground text-left">
                    <th className="py-3 px-3 font-medium">Lead Name</th>
                    <th className="py-3 px-3 font-medium">Website</th>
                    <th className="py-3 px-3 font-medium">Email</th>
                    <th className="py-3 px-3 font-medium">Status</th>
                    <th className="py-3 px-3 font-medium">Owner (assigned to)</th>
                  </tr>
                </thead>
                <tbody>
                {topDeals.length > 0 ? (
                  topDeals.map((deal: any, i) => {
                    const status = deal.status || "";
                    const statusColor = 
                      status === "won" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-100" :
                      status === "meeting_scheduled" ? "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-100" :
                      status === "proposal_sent" ? "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-100" :
                      status === "hot_lead" ? "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-100" :
                      "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200";
                    
                    return (
                      <tr
                        key={deal.id || i}
                        className={cn(
                          "border-b last:border-0 transition-colors",
                          deal.id
                            ? "hover:bg-muted/40 cursor-pointer"
                            : "hover:bg-muted/20",
                        )}
                      >
                        <td className="py-3 px-3 font-medium">
                          {deal.id ? (
                            <Link
                              href={`/sales/leads/${deal.id}`}
                              className="block -my-3 py-3 text-primary hover:underline"
                            >
                              {deal.leadName || deal.lead_name || "—"}
                            </Link>
                          ) : (
                            deal.leadName || deal.lead_name || "—"
                          )}
                        </td>
                        <td className="py-3 px-3 text-muted-foreground">
                          {deal.website ? (
                            <a
                              href={
                                String(deal.website).startsWith("http")
                                  ? deal.website
                                  : `https://${deal.website}`
                              }
                              target="_blank"
                              rel="noreferrer"
                              className="text-primary hover:underline"
                            >
                              {deal.website}
                            </a>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="py-3 px-3 text-muted-foreground">
                          {deal.id ? (
                            <Link
                              href={`/sales/leads/${deal.id}`}
                              className="block -my-3 py-3"
                            >
                              {deal.email || "—"}
                            </Link>
                          ) : (
                            deal.email || "—"
                          )}
                        </td>
                        <td className="py-3 px-3">
                          {deal.id ? (
                            <Link
                              href={`/sales/leads/${deal.id}`}
                              className="block -my-3 py-3"
                            >
                              <Badge className={cn("capitalize border-0", statusColor)}>
                                {status.replace(/_/g, " ")}
                              </Badge>
                            </Link>
                          ) : (
                            <Badge className={cn("capitalize border-0", statusColor)}>
                              {status.replace(/_/g, " ")}
                            </Badge>
                          )}
                        </td>
                        <td className="py-3 px-3 text-muted-foreground">
                          {deal.id ? (
                            <Link
                              href={`/sales/leads/${deal.id}`}
                              className="block -my-3 py-3"
                            >
                              {deal.assignedUser?.fullName ||
                                deal.assigned_user?.full_name ||
                                users.find(
                                  (u: any) =>
                                    u.id === (deal.assignedTo || deal.assigned_to),
                                )?.fullName ||
                                users.find(
                                  (u: any) =>
                                    u.id === (deal.assignedTo || deal.assigned_to),
                                )?.full_name ||
                                "Unassigned"}
                            </Link>
                          ) : (
                            deal.assignedUser?.fullName ||
                            deal.assigned_user?.full_name ||
                            users.find(
                              (u: any) =>
                                u.id === (deal.assignedTo || deal.assigned_to),
                            )?.fullName ||
                            users.find(
                              (u: any) =>
                                u.id === (deal.assignedTo || deal.assigned_to),
                            )?.full_name ||
                            "Unassigned"
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td
                      colSpan={5}
                      className="py-8 text-center text-muted-foreground"
                    >
                      No priority deals found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function PageSkeleton() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-14 w-72" />
        <Skeleton className="h-9 w-24" />
      </div>
      <Skeleton className="h-16 w-full" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
      <div className="grid lg:grid-cols-7 gap-6">
        <Skeleton className="lg:col-span-4 h-72" />
        <Skeleton className="lg:col-span-3 h-72" />
      </div>
      <div className="grid lg:grid-cols-7 gap-6">
        <Skeleton className="lg:col-span-4 h-64" />
        <Skeleton className="lg:col-span-3 h-64" />
      </div>
      <Skeleton className="h-56 w-full" />
    </div>
  );
}
