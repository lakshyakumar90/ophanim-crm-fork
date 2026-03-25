"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  BarChart3,
  Users,
  TrendingUp,
  UserMinus,
  RefreshCw,
  UserCheck,
  Calendar,
  Clock,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from "recharts";
import useSWR from "swr";
import { useAuth } from "@/providers/auth-provider";
import { attendanceApi, usersApi } from "@/lib/api";
import { getHRScopeProfile, isAdminOrDirector } from "@/lib/hr-scope";
import { Badge } from "@/components/ui/badge";

interface HRAnalytics {
  totalEmployees: number;
  activeEmployees: number;
  newJoinersThisMonth: number;
  departmentBreakdown: { department: string; count: number }[];
  roleBreakdown: { role: string; count: number }[];
  jobTitleBreakdown: { jobTitle: string; count: number }[];
  leaveUsageByType: {
    leaveType: string;
    totalDays: number;
    requestCount: number;
  }[];
  monthlyHeadcount: { month: string; count: number }[];
  attendanceStats: {
    presentToday: number;
    absentToday: number;
    lateToday: number;
    onLeaveToday: number;
  };
}

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1";

const COLORS = [
  "#8b5cf6",
  "#06b6d4",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#ec4899",
  "#6366f1",
  "#14b8a6",
];

const ROLE_COLORS: Record<string, string> = {
  admin: "#ef4444",
  manager: "#f59e0b",
  employee: "#10b981",
};

export default function HRAnalyticsPage() {
  const { user } = useAuth();
  const scopeProfile = getHRScopeProfile(user);
  const isFullView = isAdminOrDirector(user);
  const isManagerView = scopeProfile === "manager";
  const isEmployeeView = scopeProfile === "employee";

  const [analytics, setAnalytics] = useState<HRAnalytics | null>(null);
  const [loading, setLoading] = useState(false);
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [month, setMonth] = useState("all");

  const fetchAnalytics = async () => {
    if (!isFullView) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const token = localStorage.getItem("crm_access_token");
      const qs = new URLSearchParams();
      qs.set("year", year);
      if (month !== "all") qs.set("month", month);
      const res = await fetch(`${API_URL}/hr/analytics?${qs.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAnalytics(data.data);
      } else {
        throw new Error("Failed to fetch HR analytics");
      }
    } catch (error: any) {
      console.error("Failed to fetch HR analytics:", error);
      setAnalytics(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isFullView) return;
    fetchAnalytics();
  }, [year, month, isFullView]);

  const { data: teamUsersRaw } = useSWR(
    isManagerView && user?.teamId ? ["/users/team-members", user.teamId] : null,
    () => usersApi.list({ teamId: user?.teamId, limit: 200 }),
  );
  const { data: teamTodayRaw } = useSWR(
    isManagerView ? ["/attendance/users-today/team", user?.departmentId || ""] : null,
    () => attendanceApi.getUsersToday(undefined, user?.departmentId || undefined),
  );
  const { data: teamWeeklyRaw } = useSWR(
    isManagerView ? ["/attendance/analytics/team", user?.departmentId || ""] : null,
    () => attendanceApi.getAnalytics(undefined, undefined, user?.departmentId || undefined),
  );

  const { data: selfTodayRaw } = useSWR(
    isEmployeeView ? ["/attendance/today/self"] : null,
    () => attendanceApi.getToday(),
  );
  const { data: selfWeeklyRaw } = useSWR(
    isEmployeeView && user?.id ? ["/attendance/weekly-hours/self", user.id] : null,
    () => attendanceApi.getWeeklyHours(user?.id),
  );

  const teamUsers = useMemo(() => {
    const payload = teamUsersRaw as any;
    if (!payload) return [] as any[];
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload.data)) return payload.data;
    if (Array.isArray(payload?.data?.data)) return payload.data.data;
    return [] as any[];
  }, [teamUsersRaw]);

  const teamToday = useMemo(() => {
    const payload = teamTodayRaw as any;
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.data)) return payload.data;
    return [] as any[];
  }, [teamTodayRaw]);

  const teamMemberIds = useMemo(
    () => new Set(teamUsers.map((member: any) => member.id)),
    [teamUsers],
  );

  const teamTodayCount = useMemo(() => {
    if (!teamToday.length || !teamMemberIds.size) return 0;
    return teamToday.filter((row: any) => teamMemberIds.has(row.userId || row.user_id)).length;
  }, [teamToday, teamMemberIds]);

  const selfWeeklyHours = useMemo(() => {
    if (!Array.isArray(selfWeeklyRaw)) return 0;
    return selfWeeklyRaw.reduce((sum: number, day: any) => sum + Number(day?.hours || 0), 0);
  }, [selfWeeklyRaw]);

  if (isManagerView) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">HR Team Analytics</h1>
            <p className="text-muted-foreground">Analytics for your team and team members.</p>
          </div>
          <Badge variant="outline">Team Scope</Badge>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Team Members</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold">{teamUsers.length}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Tracked Today</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold">{teamTodayCount}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Department Presence</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold">{(teamWeeklyRaw as any)?.presentToday ?? 0}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Department Leave Today</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold">{(teamWeeklyRaw as any)?.onLeaveToday ?? 0}</div></CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Team Members</CardTitle>
            <CardDescription>Quick visibility into your direct team list.</CardDescription>
          </CardHeader>
          <CardContent>
            {teamUsers.length === 0 ? (
              <p className="text-sm text-muted-foreground">No team users available.</p>
            ) : (
              <div className="grid gap-2 md:grid-cols-2">
                {teamUsers.slice(0, 12).map((member: any) => (
                  <div key={member.id} className="rounded border p-3 text-sm flex items-center justify-between">
                    <span className="font-medium">{member.fullName || member.full_name || "Unknown"}</span>
                    <Badge variant="secondary">{member.role || "employee"}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isEmployeeView) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">My HR Analytics</h1>
            <p className="text-muted-foreground">Personal HR work and attendance analytics.</p>
          </div>
          <Badge variant="outline">Self Scope</Badge>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Current Status</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold capitalize">{String((selfTodayRaw as any)?.status || "not_marked").replace(/_/g, " ")}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Today Hours</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold">{(selfTodayRaw as any)?.totalHours ?? 0}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Weekly Hours</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold">{selfWeeklyHours.toFixed(1)}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Team</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold">{user?.teamId ? "Assigned" : "-"}</div></CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6">
        <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">Failed to load analytics data</p>
        <Button onClick={fetchAnalytics} className="mt-4">
          Retry
        </Button>
      </div>
    );
  }

  const inactiveEmployees =
    analytics.totalEmployees - analytics.activeEmployees;
  const attendanceTotal =
    analytics.attendanceStats.presentToday +
    analytics.attendanceStats.absentToday +
    analytics.attendanceStats.lateToday +
    analytics.attendanceStats.onLeaveToday;

  const attendanceData = [
    {
      name: "Present",
      value: analytics.attendanceStats.presentToday,
      color: "#10b981",
    },
    {
      name: "Late",
      value: analytics.attendanceStats.lateToday,
      color: "#f59e0b",
    },
    {
      name: "Absent",
      value: analytics.attendanceStats.absentToday,
      color: "#ef4444",
    },
    {
      name: "On Leave",
      value: analytics.attendanceStats.onLeaveToday,
      color: "#6366f1",
    },
  ].filter((d) => d.value > 0);

  const roleData = analytics.roleBreakdown.map((r) => ({
    ...r,
    color: ROLE_COLORS[r.role] || "#8b5cf6",
  }));

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">HR Analytics</h1>
          <p className="text-muted-foreground">
            People analytics and workforce insights.
          </p>
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={fetchAnalytics}
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
        <div className="flex items-center gap-2">
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="w-30"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[0, 1, 2, 3].map((n) => {
                const y = String(new Date().getFullYear() - n);
                return <SelectItem key={y} value={y}>{y}</SelectItem>;
              })}
            </SelectContent>
          </Select>
          <Select value={month} onValueChange={setMonth}>
            <SelectTrigger className="w-30"><SelectValue placeholder="Month" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All months</SelectItem>
              {Array.from({ length: 12 }).map((_, idx) => (
                <SelectItem key={idx + 1} value={String(idx + 1)}>{idx + 1}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Employees
            </CardTitle>
            <Users className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalEmployees}</div>
            <p className="text-xs text-muted-foreground">
              {analytics.activeEmployees} active, {inactiveEmployees} inactive
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New Joiners</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics.newJoinersThisMonth}
            </div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Present Today</CardTitle>
            <UserCheck className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics.attendanceStats.presentToday}
            </div>
            <p className="text-xs text-muted-foreground">
              {analytics.attendanceStats.lateToday} late,{" "}
              {analytics.attendanceStats.onLeaveToday} on leave
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Departments</CardTitle>
            <BarChart3 className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics.departmentBreakdown.length}
            </div>
            <p className="text-xs text-muted-foreground">Active departments</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Headcount Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Headcount Trend
            </CardTitle>
            <CardDescription>Last 6 months</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={analytics.monthlyHeadcount}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#8b5cf6"
                    strokeWidth={2}
                    dot={{ fill: "#8b5cf6" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Today's Attendance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Today&apos;s Attendance
            </CardTitle>
            <CardDescription>
              {attendanceTotal} employees tracked today
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {attendanceTotal > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={attendanceData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, percent }) =>
                        `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                      }
                    >
                      {attendanceData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <p>No attendance data for today</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Department Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Department Distribution
            </CardTitle>
            <CardDescription>Employees per department</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={analytics.departmentBreakdown}
                  layout="vertical"
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="department" type="category" width={100} />
                  <Tooltip />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {analytics.departmentBreakdown.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Leave Usage */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Leave Usage by Type
            </CardTitle>
            <CardDescription>This year (approved leaves)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {analytics.leaveUsageByType.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.leaveUsageByType}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="leaveType" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar
                      dataKey="totalDays"
                      name="Total Days"
                      fill="#8b5cf6"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="requestCount"
                      name="Requests"
                      fill="#06b6d4"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <p>No leave data this year</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 3 */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Role Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Role Distribution</CardTitle>
            <CardDescription>Employees by role</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={roleData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="count"
                    label={({ role, percent }) =>
                      `${role} ${((percent ?? 0) * 100).toFixed(0)}%`
                    }
                  >
                    {roleData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Job Title Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Job Title Distribution</CardTitle>
            <CardDescription>Employees by specialization</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.jobTitleBreakdown} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis
                    dataKey="jobTitle"
                    type="category"
                    width={120}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip />
                  <Bar dataKey="count" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
