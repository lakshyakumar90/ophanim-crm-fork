"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import useSWR from "swr";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { StatsCard } from "@/components/dashboard/stats-card";
import {
  Users,
  UserCheck,
  UserPlus,
  Clock,
  Briefcase,
  Receipt,
  Target,
  Bell,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import { useAuth } from "@/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api, attendanceApi, hrAnalyticsApi, usersApi } from "@/lib/api";
import { getHRScopeProfile, isAdminOrDirector } from "@/lib/hr-scope";

// ============================================================
// Independent card fetchers using SWR
// ============================================================

function HeadcountCard() {
  const { data, isLoading, error } = useSWR(
    "/hr/analytics/headcount",
    () => hrAnalyticsApi.headcount(),
    { revalidateOnFocus: false }
  );

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 bg-muted rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="h-24 bg-destructive/10 rounded-lg flex items-center justify-center text-xs text-destructive"
          >
            Failed to load
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatsCard
        title="Total Employees"
        value={data?.totalEmployees || 0}
        icon={Users}
        description="All registered employees"
        accentColor="blue"
      />
      <StatsCard
        title="Active Employees"
        value={data?.activeEmployees || 0}
        icon={UserCheck}
        description="Currently active"
        accentColor="green"
      />
      <StatsCard
        title="On Probation"
        value={data?.onProbation || 0}
        icon={UserPlus}
        description="Recently joined"
        accentColor="purple"
      />
      <StatsCard
        title="Department Breakdown"
        value={data?.departmentBreakdown?.length || 0}
        icon={Clock}
        description="Departments with staff"
        accentColor="orange"
      />
    </div>
  );
}

function LeaveCard() {
  const { data, isLoading, error } = useSWR(
    "/hr/analytics/leaves",
    () => hrAnalyticsApi.leaves(),
    { revalidateOnFocus: false }
  );

  if (isLoading || error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Leave Tracking</CardTitle>
          <CardDescription>Current leave status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-20 bg-muted rounded animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Leave Tracking</CardTitle>
        <CardDescription>Current leave status</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 rounded-md bg-blue-50 border border-blue-100">
            <p className="text-2xl font-bold text-blue-600">
              {data?.employeesOnLeaveToday || 0}
            </p>
            <p className="text-xs text-blue-700">On Leave Today</p>
          </div>
          <div className="p-3 rounded-md bg-amber-50 border border-amber-100">
            <p className="text-2xl font-bold text-amber-600">
              {data?.pendingApprovals || 0}
            </p>
            <p className="text-xs text-amber-700">Pending Approvals</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function RecruitmentCard() {
  const { data, isLoading, error } = useSWR(
    "/hr/analytics/recruitment",
    () => hrAnalyticsApi.recruitment(),
    { revalidateOnFocus: false }
  );

  if (isLoading || error) {
    return (
      <div className="rounded-xl border border-slate-200 bg-muted/30 p-4 animate-pulse min-h-38" />
    );
  }

  return (
    <div className="group rounded-xl border border-slate-200 bg-white p-4 min-h-38 transition-colors hover:bg-slate-50 hover:border-blue-200">
      <div className="mb-3 flex items-center justify-between">
        <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center transition-colors group-hover:bg-blue-600 group-hover:text-white">
          <Briefcase className="w-5 h-5" />
        </div>
        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Recruitment</span>
      </div>
      <p className="text-2xl font-bold text-slate-900">{data?.totalOpenPositions || 0}</p>
      <p className="text-sm font-medium text-slate-700">Open Positions</p>
      <p className="mt-1 text-xs text-muted-foreground">
        {data?.totalCandidatesInPipeline || 0} candidates in pipeline
      </p>
    </div>
  );
}

function PayrollCard() {
  const { data, isLoading, error } = useSWR(
    "/hr/analytics/payroll",
    () => hrAnalyticsApi.payroll(),
    { revalidateOnFocus: false }
  );

  if (isLoading || error) {
    return (
      <div className="rounded-xl border border-slate-200 bg-muted/30 p-4 animate-pulse min-h-38" />
    );
  }

  const statusColor =
    data?.currentMonthStatus === "disbursed"
      ? "text-green-600"
      : data?.currentMonthStatus === "approved"
        ? "text-blue-600"
        : "text-amber-600";

  return (
    <div className="group rounded-xl border border-slate-200 bg-white p-4 min-h-38 transition-colors hover:bg-slate-50 hover:border-green-200">
      <div className="mb-3 flex items-center justify-between">
        <div className="w-10 h-10 rounded-full bg-green-100 text-green-600 flex items-center justify-center transition-colors group-hover:bg-green-600 group-hover:text-white">
          <Receipt className="w-5 h-5" />
        </div>
        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Payroll</span>
      </div>
      <p className="text-2xl font-bold text-slate-900">{data?.pendingApprovals || 0}</p>
      <p className="text-sm font-medium text-slate-700">Pending Approvals</p>
      <p className={`text-sm font-medium capitalize ${statusColor}`}>
        {(data?.currentMonthStatus || "not_initiated").replace(/_/g, " ")}
      </p>
    </div>
  );
}

function PerformanceCard() {
  const { data, isLoading, error } = useSWR(
    "/hr/analytics/performance",
    () => hrAnalyticsApi.performance(),
    { revalidateOnFocus: false }
  );

  if (isLoading || error) {
    return (
      <div className="rounded-xl border border-slate-200 bg-muted/30 p-4 animate-pulse min-h-38" />
    );
  }

  return (
    <div className="group rounded-xl border border-slate-200 bg-white p-4 min-h-38 transition-colors hover:bg-slate-50 hover:border-purple-200">
      <div className="mb-3 flex items-center justify-between">
        <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center transition-colors group-hover:bg-purple-600 group-hover:text-white">
          <Target className="w-5 h-5" />
        </div>
        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Performance</span>
      </div>
      <p className="text-2xl font-bold text-slate-900">{data?.activeReviewCycles || 0}</p>
      <p className="text-sm font-medium text-slate-700">Active Cycles</p>
      <p className="mt-1 text-xs text-muted-foreground">
        {data?.pendingManagerReviews || 0} Pending Reviews
      </p>
    </div>
  );
}

function ComplianceCard() {
  const { data, isLoading, error } = useSWR(
    "/hr/analytics/compliance",
    () => hrAnalyticsApi.compliance(),
    { revalidateOnFocus: false }
  );

  if (isLoading || error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Compliance Status</CardTitle>
          <CardDescription>Documents & requirements</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-20 bg-muted rounded animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-rose-100/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-500" />
          Compliance Status
        </CardTitle>
        <CardDescription>Documents & requirements</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 rounded-md bg-red-50 border border-red-100">
            <p className="text-2xl font-bold text-red-600">
              {data?.expiringDocumentsCount || 0}
            </p>
            <p className="text-xs text-red-700">Expiring Docs (30d)</p>
          </div>
          <div className="p-3 rounded-md bg-orange-50 border border-orange-100">
            <p className="text-2xl font-bold text-orange-600">
              {data?.probationEndingCount || 0}
            </p>
            <p className="text-xs text-orange-700">Probation Ending (30d)</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AlertsCard() {
  const { data, isLoading, error } = useSWR(
    "/hr/analytics/alerts",
    () => hrAnalyticsApi.alerts(),
    { revalidateOnFocus: false, refreshInterval: 30000 }
  );

  const alerts = data?.alerts || [];

  if (error) {
    return (
      <Card className="md:col-span-1 border-rose-100/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-rose-500" />
            Alerts
          </CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-destructive">
          Failed to load alerts
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="md:col-span-1 border-rose-100/50 shadow-sm relative overflow-hidden flex flex-col min-h-67">
    <div className="absolute top-0 w-full h-1 bg-linear-to-r from-orange-400 to-rose-500" />
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-rose-500" />
            Action Required
          </div>
          {alerts.length > 0 && (
            <Badge variant="destructive" className="rounded-full w-6 h-6 flex items-center justify-center p-0">
              {alerts.length}
            </Badge>
          )}
        </CardTitle>
        <CardDescription>System alerts & compliance updates</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto">
        <div className="space-y-4">
          {isLoading ? (
            <div className="h-20 bg-muted rounded animate-pulse" />
          ) : alerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-emerald-100 bg-emerald-50/40 text-muted-foreground py-10 px-4">
              <CheckCircle2 className="w-10 h-10 mb-2 text-emerald-500/60" />
              <p className="text-sm font-semibold text-emerald-700">All caught up!</p>
              <p className="text-xs text-emerald-600">No pending alerts.</p>
            </div>
          ) : (
            alerts.map((alert: any) => (
              <div
                key={alert.id}
                className="relative flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
              >
                <div
                  className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${
                    alert.type === "error"
                      ? "bg-red-500"
                      : alert.type === "warning"
                        ? "bg-amber-500"
                        : "bg-blue-500"
                  }`}
                />
                <div className="flex-1">
                  <p className="text-sm font-medium leading-none mb-1">
                    {alert.title}
                  </p>
                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed mb-2">
                    {alert.message}
                  </p>
                  <p className="text-[10px] text-muted-foreground/50 font-medium">
                    {format(new Date(alert.createdAt), "MMM d, h:mm a")}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 shrink-0 rounded-full"
                >
                  <ArrowRight className="h-3 w-3" />
                </Button>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function ActivityFeedCard() {
  const { data, isLoading, error } = useSWR(
    "/hr/analytics/activity-feed",
    () => hrAnalyticsApi.activityFeed(10),
    { revalidateOnFocus: false, refreshInterval: 30000 }
  );

  const activities = data?.activities || [];

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>HR system activity log</CardDescription>
        </CardHeader>
        <CardContent className="text-xs text-destructive">
          Failed to load activities
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
        <CardDescription>HR system activity log</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-12 bg-muted rounded animate-pulse" />
            ))}
          </div>
        ) : activities.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No recent activities
          </p>
        ) : (
          <div className="space-y-3">
            {activities.map((activity: any) => (
              <div
                key={activity.id}
                className="flex items-start gap-3 p-2 rounded hover:bg-muted/30 transition-colors"
              >
                <div className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium leading-none mb-1 truncate">
                    {activity.description}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(activity.createdAt), "MMM d, h:mm a")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function HRDashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const scopeProfile = getHRScopeProfile(user);
  const isFullView = isAdminOrDirector(user);
  const isManagerView = scopeProfile === "manager";
  const isEmployeeView = scopeProfile === "employee";

  const { data: snapshot } = useSWR("/hr/on-leave-today", async () => {
    const res = await api.get("/hr/on-leave-today");
    return res.data?.data || [];
  });
  const { data: payrollData } = useSWR("/hr/analytics/payroll-summary", () =>
    hrAnalyticsApi.payroll(),
  );

  const { data: teamUsersRaw } = useSWR(
    isManagerView && user?.teamId
      ? ["/users/team-members", user.teamId]
      : null,
    () => usersApi.list({ teamId: user?.teamId, limit: 200 }),
  );

  const { data: selfToday } = useSWR(
    isEmployeeView ? ["/attendance/today/self"] : null,
    () => attendanceApi.getToday(),
  );

  const { data: selfWeekly } = useSWR(
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

  const teamOnLeaveCount = useMemo(() => {
    if (!Array.isArray(snapshot) || teamUsers.length === 0) return 0;
    const ids = new Set(teamUsers.map((member: any) => member.id));
    return snapshot.filter((employee: any) => ids.has(employee.id)).length;
  }, [snapshot, teamUsers]);

  const weeklyTotalHours = useMemo(() => {
    if (!Array.isArray(selfWeekly)) return 0;
    return selfWeekly.reduce((sum: number, day: any) => sum + Number(day?.hours || 0), 0);
  }, [selfWeekly]);

  return (
    <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {isFullView
              ? "HR Control Center"
              : isManagerView
                ? "HR Team Overview"
                : "My HR Dashboard"}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isFullView
              ? `Welcome back, ${user?.fullName}. Here is your department overview.`
              : isManagerView
                ? `Welcome back, ${user?.fullName}. This is your team overview.`
                : `Welcome back, ${user?.fullName}. This is your personal HR overview.`}
          </p>
        </div>
        <div className="flex gap-2">
          {isFullView ? (
            <>
              <Button onClick={() => router.push("/hr/payroll")}>Initiate Payroll</Button>
              <Button variant="outline" onClick={() => router.push("/hr/recruitment/new")}>Create Job Posting</Button>
              <Button variant="outline" onClick={() => router.push("/hr/holidays")}>Add Holiday</Button>
            </>
          ) : isManagerView ? (
            <>
              <Button onClick={() => router.push("/hr/attendance")}>Team Attendance</Button>
              <Button variant="outline" onClick={() => router.push("/hr/leaves")}>Team Leaves</Button>
            </>
          ) : (
            <>
              <Button onClick={() => router.push("/attendance")}>My Attendance</Button>
              <Button variant="outline" onClick={() => router.push("/hr/payroll/my-payslips")}>My Payslips</Button>
            </>
          )}
        </div>
      </div>

      <Card className="border-l-4 border-l-amber-500">
        <CardHeader>
          <CardTitle>Today's Snapshot</CardTitle>
          <CardDescription>
            {isFullView
              ? "Leave, attendance and pending approvals at a glance."
              : isManagerView
                ? "Team leave and roster highlights for today."
                : "Your personal attendance and workload highlights for today."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="p-3 rounded border bg-muted/20">
              <p className="text-muted-foreground">
                {isFullView ? "On Leave Today" : isManagerView ? "My Team On Leave" : "My Attendance Status"}
              </p>
              <p className="text-xl font-semibold">
                {isFullView
                  ? Array.isArray(snapshot)
                    ? snapshot.length
                    : 0
                  : isManagerView
                    ? teamOnLeaveCount
                    : String((selfToday as any)?.status || "not_marked").replace(/_/g, " ")}
              </p>
            </div>
            <div className="p-3 rounded border bg-muted/20">
              <p className="text-muted-foreground">
                {isFullView ? "Current Payroll Status" : isManagerView ? "Team Members" : "Today's Hours"}
              </p>
              <p className="text-xl font-semibold capitalize">
                {isFullView
                  ? payrollData?.currentMonthStatus || "not_initiated"
                  : isManagerView
                    ? teamUsers.length
                    : (selfToday as any)?.totalHours ?? 0}
              </p>
            </div>
            <div className="p-3 rounded border bg-muted/20">
              <p className="text-muted-foreground">
                {isFullView ? "Pending Payroll Approvals" : isManagerView ? "Team Available Today" : "Weekly Hours"}
              </p>
              <p className="text-xl font-semibold">
                {isFullView
                  ? payrollData?.pendingApprovals || 0
                  : isManagerView
                    ? Math.max(teamUsers.length - teamOnLeaveCount, 0)
                    : weeklyTotalHours.toFixed(1)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {isFullView && (
        <>
          <HeadcountCard />

          <div className="grid gap-6 md:grid-cols-2">
            <LeaveCard />
            <ComplianceCard />
          </div>

          <div className="grid gap-6 md:grid-cols-2 items-stretch">
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Module Activity</CardTitle>
                <CardDescription>
                  Quick links to active HR processes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  <RecruitmentCard />
                  <PayrollCard />
                  <PerformanceCard />
                </div>
              </CardContent>
            </Card>

            <AlertsCard />
          </div>

          <ActivityFeedCard />
        </>
      )}

      {isManagerView && (
        <>
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Team Members Overview</CardTitle>
                <CardDescription>Live roster for your managed team</CardDescription>
              </CardHeader>
              <CardContent>
                {teamUsers.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No team members found for your scope.</p>
                ) : (
                  <div className="space-y-2">
                    {teamUsers.slice(0, 10).map((member: any) => (
                      <div key={member.id} className="flex items-center justify-between rounded border p-2 text-sm">
                        <span className="font-medium">{member.fullName || member.full_name || "Unknown"}</span>
                        <Badge variant="outline">{member.role || "employee"}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Manager Action Queue</CardTitle>
                <CardDescription>Fast navigation for team operations</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button className="w-full justify-between" variant="outline" onClick={() => router.push("/hr/leaves")}>Review Team Leaves <ArrowRight className="h-4 w-4" /></Button>
                <Button className="w-full justify-between" variant="outline" onClick={() => router.push("/hr/attendance")}>Review Team Attendance <ArrowRight className="h-4 w-4" /></Button>
                <Button className="w-full justify-between" variant="outline" onClick={() => router.push("/hr/performance")}>Track Team Reviews <ArrowRight className="h-4 w-4" /></Button>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {isEmployeeView && (
        <>
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>My Attendance</CardTitle>
                <CardDescription>Today and weekly progress</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="rounded border p-3">
                  <p className="text-muted-foreground">Current status</p>
                  <p className="text-lg font-semibold capitalize">{String((selfToday as any)?.status || "not_marked").replace(/_/g, " ")}</p>
                </div>
                <div className="rounded border p-3">
                  <p className="text-muted-foreground">Today hours</p>
                  <p className="text-lg font-semibold">{(selfToday as any)?.totalHours ?? 0}</p>
                </div>
                <div className="rounded border p-3">
                  <p className="text-muted-foreground">Weekly total hours</p>
                  <p className="text-lg font-semibold">{weeklyTotalHours.toFixed(1)}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>My HR Quick Actions</CardTitle>
                <CardDescription>Common self-service workflows</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button className="w-full justify-between" variant="outline" onClick={() => router.push("/hr/leaves")}>My Leave Requests <ArrowRight className="h-4 w-4" /></Button>
                <Button className="w-full justify-between" variant="outline" onClick={() => router.push("/hr/payroll/my-payslips")}>My Payslips <ArrowRight className="h-4 w-4" /></Button>
                <Button className="w-full justify-between" variant="outline" onClick={() => router.push("/hr/performance")}>My Performance <ArrowRight className="h-4 w-4" /></Button>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
