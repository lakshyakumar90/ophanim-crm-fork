"use client";

import { useState, useEffect, useCallback } from "react";
import { format, subDays } from "date-fns";
import { DateRange } from "react-day-picker";
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
import { useAuth } from "@/providers/auth-provider";
import { toast } from "sonner";
import { nowIST } from "@/lib/date-utils";
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
} from "lucide-react";

const PIPELINE_STAGES = [
  "new",
  "contacted",
  "qualified",
  "proposal_sent",
  "negotiation",
  "won",
  "lost",
];

const PIPELINE_LABELS: Record<string, string> = {
  new: "New Lead",
  contacted: "Contacted",
  qualified: "Qualified",
  proposal_sent: "Proposal Sent",
  negotiation: "Negotiation",
  won: "Won",
  lost: "Lost",
  on_hold: "On Hold",
  unqualified: "Unqualified",
};

const PIPELINE_COLORS: Record<string, string> = {
  new: "#3b82f6",
  contacted: "#06b6d4",
  qualified: "#10b981",
  proposal_sent: "#f59e0b",
  negotiation: "#8b5cf6",
  won: "#22c55e",
  lost: "#ef4444",
  on_hold: "#94a3b8",
  unqualified: "#6b7280",
};

const DATE_PRESETS = [
  { label: "Today", value: "0d", days: 0 },
  { label: "7 Days", value: "7d", days: 7 },
  { label: "30 Days", value: "30d", days: 30 },
  { label: "90 Days", value: "90d", days: 90 },
];

export default function SalesDashboardPage() {
  const now = nowIST();
  const { user } = useAuth();

  const [date, setDate] = useState<DateRange | undefined>({
    from: subDays(now, 30),
    to: now,
  });
  const [activePreset, setActivePreset] = useState("30d");
  const [teamId, setTeamId] = useState("all");
  const [userId, setUserId] = useState("");
  const [teams, setTeams] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [dashData, setDashData] = useState<any>(null);
  const [topDeals, setTopDeals] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Pick activity scope based on role — avoids 403 for managers/employees
  const activityScope =
    user?.role === "admin"
      ? "all-crm"
      : user?.role === "manager"
        ? "team"
        : "self";

  useEffect(() => {
    // Determine the right query params for users based on role
    const isManager = user?.role === "manager";
    const userParams: any = { limit: 1000 };
    
    // Scoping for manager
    if (isManager) {
      if (user?.teamId) {
        userParams.teamId = user.teamId;
      } else if (user?.departmentIds && user.departmentIds.length > 0) {
        userParams.departmentId = user.departmentIds[0];
      }
    }

    Promise.allSettled([
      teamsApi.list(),
      usersApi.list(userParams),
    ]).then(([t, u]) => {
      let fetchedTeams = t.status === "fulfilled" && Array.isArray(t.value) ? t.value : [];
      let fetchedUsers = u.status === "fulfilled" ? u.value?.data || (Array.isArray(u.value) ? u.value : []) : [];

      // Filter teams for managers
      if (isManager && user?.teamId) {
        fetchedTeams = fetchedTeams.filter((team: any) => team.id === user.teamId);
      }

      setTeams(fetchedTeams);
      setUsers(fetchedUsers);
    });
  }, []);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const [dashResult, dealsResult, statsResult, actsResult] =
        await Promise.allSettled([
          dashboardApi.get(),
          leadsApi.list({ limit: 8, sortBy: "lead_value", sortOrder: "desc" }),
          leadsApi.getStatsByUser(),
          activitiesApi.list({ limit: 10, scope: activityScope }),
        ]);

      setDashData(
        dashResult.status === "fulfilled" ? dashResult.value : null,
      );
      setTopDeals(
        dealsResult.status === "fulfilled"
          ? dealsResult.value?.data || []
          : [],
      );
      setLeaderboard(
        statsResult.status === "fulfilled"
          ? (statsResult.value?.users || []).slice(0, 8)
          : [],
      );
      setActivities(
        actsResult.status === "fulfilled"
          ? actsResult.value?.data || []
          : [],
      );

      if (dashResult.status === "rejected") {
        toast.error("Failed to load dashboard data");
      }
    } catch {
      toast.error("Failed to load dashboard data");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [user, activityScope]);

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
  const activeDeals = ["contacted", "qualified", "proposal_sent", "negotiation"].reduce(
    (sum, s) => sum + (pipeline[s] || 0),
    0,
  );
  const convRate =
    totalLeads > 0 ? ((wonLeads / totalLeads) * 100).toFixed(1) : "0.0";
  const avgDeal = wonLeads > 0 ? Math.round(totalRevenue / wonLeads) : 0;
  const tasks = dashData?.tasks || {};

  const pipelineChartData = PIPELINE_STAGES.filter(
    (s) => (pipeline[s] || 0) > 0,
  ).map((s) => ({
    name: PIPELINE_LABELS[s] || s,
    count: pipeline[s] || 0,
    fill: PIPELINE_COLORS[s] || "#94a3b8",
  }));

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
                setActivePreset(p.value);
                setDate({ from: subDays(now, p.days), to: now });
              }}
            >
              {p.label}
            </Button>
          ))}
        </div>

        {/* Date range picker */}
        <Popover>
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
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={date?.from}
              selected={date}
              onSelect={(d) => {
                setDate(d);
                setActivePreset("custom");
              }}
              numberOfMonths={2}
            />
          </PopoverContent>
        </Popover>

        {/* Team filter */}
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

        {/* User filter */}
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
            title="New Leads"
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

      {/* Section 2 + 3: Pipeline Overview + Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-7 gap-6">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Sales Pipeline</CardTitle>
            <CardDescription>
              Deal distribution across pipeline stages
            </CardDescription>
          </CardHeader>
          <CardContent>
            {pipelineChartData.length > 0 ? (
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={pipelineChartData}
                    layout="vertical"
                    margin={{ left: 8, right: 24 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis
                      type="number"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={110}
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      contentStyle={{ borderRadius: "8px" }}
                      formatter={(v) => [v, "Deals"]}
                    />
                    <Bar dataKey="count" name="Deals" radius={[0, 4, 4, 0]}>
                      {pipelineChartData.map((entry, idx) => (
                        <Cell key={idx} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex items-center justify-center h-[260px] text-muted-foreground text-sm">
                No pipeline data available
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Tasks &amp; Follow-ups</CardTitle>
            <CardDescription>Current task status at a glance</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              {
                label: "Overdue Tasks",
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
                label: "Pending Tasks",
                value: tasks.pending || 0,
                icon: CalendarClock,
                bg: "bg-blue-50 dark:bg-blue-950",
                border: "border-blue-200 dark:border-blue-800",
                iconColor: "text-blue-600",
                badgeCls: "bg-blue-100 text-blue-700 border-0",
              },
              {
                label: "Total Tasks",
                value: tasks.total || 0,
                icon: CheckCircle2,
                bg: "bg-emerald-50 dark:bg-emerald-950",
                border: "border-emerald-200 dark:border-emerald-800",
                iconColor: "text-emerald-600",
                badgeCls: "bg-emerald-100 text-emerald-700 border-0",
              },
            ].map(({ label, value, icon: Icon, bg, border, iconColor, badgeCls }) => (
              <div
                key={label}
                className={cn(
                  "flex items-center justify-between p-3 rounded-lg border",
                  bg,
                  border,
                )}
              >
                <div className="flex items-center gap-3">
                  <Icon className={cn("w-5 h-5", iconColor)} />
                  <span className="font-medium text-sm">{label}</span>
                </div>
                <Badge className={badgeCls}>{value}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Section 4 + 6: Recent Activity + Leaderboard */}
      <div className="grid grid-cols-1 lg:grid-cols-7 gap-6">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Recent Sales Activity</CardTitle>
            <CardDescription>
              Latest actions across the sales team
            </CardDescription>
          </CardHeader>
          <CardContent>
            {activities.length > 0 ? (
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                {activities.map((act: any, i) => (
                  <div key={i} className="flex gap-3 items-start text-sm">
                    <div className="w-2 h-2 mt-2 rounded-full bg-primary flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {act.userName ||
                          act.user?.fullName ||
                          act.user?.full_name ||
                          "Someone"}{" "}
                        <span className="font-normal text-muted-foreground">
                          {(act.action || "").replace(/_/g, " ")}
                        </span>
                        {act.resourceType && (
                          <span className="text-muted-foreground">
                            {" "}
                            · {act.resourceType}
                          </span>
                        )}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap flex-shrink-0">
                      {act.createdAt
                        ? format(new Date(act.createdAt), "MMM d, HH:mm")
                        : ""}
                    </span>
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
            <CardDescription>Top performers by total leads</CardDescription>
          </CardHeader>
          <CardContent>
            {leaderboard.length > 0 ? (
              <div className="space-y-3">
                {leaderboard.map((rep: any, i) => (
                  <div key={rep.id || i} className="flex items-center gap-3 py-1">
                    <span
                      className={cn(
                        "w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold flex-shrink-0",
                        i === 0
                          ? "bg-yellow-100 text-yellow-700"
                          : i === 1
                            ? "bg-gray-100 text-gray-600"
                            : i === 2
                              ? "bg-amber-100 text-amber-700"
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
                    <div className="text-right text-xs">
                      <p className="font-semibold text-primary">
                        {rep.leadCount || 0}
                      </p>
                      <p className="text-muted-foreground">leads</p>
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
            Highest-value deals currently in the pipeline
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-muted-foreground text-left">
                  <th className="py-3 px-3 font-medium">Deal Name</th>
                  <th className="py-3 px-3 font-medium">Company</th>
                  <th className="py-3 px-3 font-medium">Stage</th>
                  <th className="py-3 px-3 font-medium text-right">Value</th>
                  <th className="py-3 px-3 font-medium">Owner</th>
                </tr>
              </thead>
              <tbody>
                {topDeals.length > 0 ? (
                  topDeals.map((deal: any, i) => (
                    <tr
                      key={deal.id || i}
                      className="border-b last:border-0 hover:bg-muted/40 transition-colors"
                    >
                      <td className="py-3 px-3 font-medium">
                        {deal.leadName || deal.lead_name || "—"}
                      </td>
                      <td className="py-3 px-3 text-muted-foreground">
                        {deal.companyName || deal.company_name || "—"}
                      </td>
                      <td className="py-3 px-3">
                        <Badge variant="secondary" className="capitalize">
                          {(deal.status || "").replace(/_/g, " ")}
                        </Badge>
                      </td>
                      <td className="py-3 px-3 text-right font-semibold text-emerald-600">
                        {deal.leadValue || deal.lead_value
                          ? `₹${Number(deal.leadValue || deal.lead_value).toLocaleString("en-IN")}`
                          : "—"}
                      </td>
                      <td className="py-3 px-3 text-muted-foreground">
                        {deal.assignedUser?.fullName ||
                          deal.assigned_user?.full_name ||
                          "Unassigned"}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={5}
                      className="py-8 text-center text-muted-foreground"
                    >
                      No deals found
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
