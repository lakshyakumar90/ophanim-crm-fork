"use client";

import { format } from "date-fns";
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
  Legend,
} from "recharts";
import { formatHoursToReadable, formatStoredTime } from "@/lib/date-utils";
import { PIE_COLORS } from "@/lib/attendance-types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  AlertCircle,
  BarChart as BarChartIcon,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  TrendingUp,
} from "lucide-react";
import type { UsersTodayItem } from "@/lib/attendance-types";

function WeeklyTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: readonly { payload?: Record<string, unknown> }[];
  label?: string | number;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const row = payload[0]?.payload;
  return (
    <div className="rounded-md border bg-background p-2 shadow-md text-xs">
      <p className="font-semibold">{label}</p>
      <p className="text-muted-foreground">
        Date: {row?.date ? format(new Date(row.date as string), "MMM d, yyyy") : "-"}
      </p>
      <p>
        Hours:{" "}
        {typeof row?.hours === "number"
          ? formatHoursToReadable(row.hours, "0m")
          : "0m"}
      </p>
      <p>
        Clock In:{" "}
        {row?.clockInTime ? formatStoredTime(row.clockInTime as string) : "--:--"}
      </p>
      <p>
        Clock Out:{" "}
        {row?.clockOutTime ? formatStoredTime(row.clockOutTime as string) : "--:--"}
      </p>
    </div>
  );
}

type PersonalPieChartProps = {
  summary: Record<string, number> | null | undefined;
};

export function PersonalAttendancePieChart({ summary }: PersonalPieChartProps) {
  const pieData = summary
    ? [
        { name: "Present", value: summary.present || 0, color: PIE_COLORS.present },
        { name: "Late", value: summary.late || 0, color: PIE_COLORS.late },
        { name: "Half Day", value: summary.half_day || 0, color: PIE_COLORS.halfDay },
        { name: "Absent", value: summary.absent || 0, color: PIE_COLORS.absent },
        { name: "Leave", value: summary.leave || 0, color: PIE_COLORS.leave },
      ].filter((item) => item.value > 0)
    : [];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          Your Attendance
        </CardTitle>
      </CardHeader>
      <CardContent>
        {pieData.length > 0 ? (
          <ResponsiveContainer width="100%" height={120}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={25}
                outerRadius={45}
                paddingAngle={3}
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-[120px] text-muted-foreground text-sm">
            No data yet
          </div>
        )}
      </CardContent>
    </Card>
  );
}

type WeeklyHoursChartProps = {
  weeklyHoursData: Record<string, unknown>[] | undefined;
  loadingWeeklyHours: boolean;
  weekStartDate: string;
  weekOffset: number;
  onWeekOffsetChange: (updater: (prev: number) => number) => void;
  canManageTeamAttendance: boolean;
  selectedUserId: string;
  onSelectedUserIdChange: (id: string) => void;
  usersAttendance: UsersTodayItem[];
};

export function WeeklyHoursChart({
  weeklyHoursData,
  loadingWeeklyHours,
  weekStartDate,
  weekOffset,
  onWeekOffsetChange,
  canManageTeamAttendance,
  selectedUserId,
  onSelectedUserIdChange,
  usersAttendance,
}: WeeklyHoursChartProps) {
  return (
    <Card className="mt-6">
      <CardHeader className="pb-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChartIcon className="h-4 w-4" />
            Weekly Working Hours
          </CardTitle>
          <div className="flex items-center gap-2">
            {canManageTeamAttendance && (
              <select
                value={selectedUserId}
                onChange={(e) => onSelectedUserIdChange(e.target.value)}
                className="h-8 rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                <option value="">My Hours</option>
                {usersAttendance.map((ua) => (
                  <option key={ua.user.id} value={ua.user.id}>
                    {ua.user.fullName}
                  </option>
                ))}
              </select>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => onWeekOffsetChange((prev) => prev - 1)}
            >
              <ChevronLeft className="h-4 w-4 mr-1" /> Previous
            </Button>
            <span className="text-sm text-muted-foreground min-w-[120px] text-center">
              {format(new Date(weekStartDate), "MMM d")} -{" "}
              {format(
                new Date(new Date(weekStartDate).getTime() + 6 * 24 * 60 * 60 * 1000),
                "MMM d, yyyy",
              )}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onWeekOffsetChange((prev) => prev + 1)}
              disabled={weekOffset >= 0}
            >
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loadingWeeklyHours ? (
          <Skeleton className="h-[200px] w-full" />
        ) : weeklyHoursData && weeklyHoursData.length > 0 ? (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={weeklyHoursData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="day"
                stroke="#888888"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="#888888"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `${value}h`}
                domain={[0, 12]}
              />
              <Tooltip content={WeeklyTooltip} />
              <Bar dataKey="hours" radius={[4, 4, 0, 0]} fill="#3b82f6">
                {weeklyHoursData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={(entry as { isWeekend?: boolean }).isWeekend ? "#94a3b8" : "#3b82f6"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">
            No working-hour data for this week
          </div>
        )}
        <div className="flex items-center justify-center gap-4 mt-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-blue-500" />
            Weekday
          </span>
          <span className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-slate-400" />
            Weekend (Office Off)
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

type TeamAnalyticsChartsProps = {
  analytics: Record<string, number> | null | undefined;
  loadingAnalytics: boolean;
};

export function TeamAnalyticsCharts({
  analytics,
  loadingAnalytics,
}: TeamAnalyticsChartsProps) {
  const adminPieData = analytics
    ? [
        { name: "Present", value: analytics.present || 0, color: PIE_COLORS.present },
        { name: "Late", value: analytics.late || 0, color: PIE_COLORS.late },
        { name: "Absent", value: analytics.absent || 0, color: PIE_COLORS.absent },
      ].filter((item) => item.value > 0)
    : [];

  const statusBarData = analytics
    ? [
        { status: "Present", count: analytics.present || 0, fill: PIE_COLORS.present },
        { status: "Late", count: analytics.late || 0, fill: PIE_COLORS.late },
        { status: "Absent", count: analytics.absent || 0, fill: PIE_COLORS.absent },
        { status: "Half Day", count: analytics.half_day || 0, fill: PIE_COLORS.halfDay },
        { status: "Leave", count: analytics.leave || 0, fill: PIE_COLORS.leave },
      ].filter((item) => item.count > 0)
    : [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
      <div className="grid grid-cols-2 gap-4 lg:col-span-2">
        {loadingAnalytics ? (
          [...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)
        ) : analytics ? (
          <>
            <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-200 rounded-lg">
                    <CheckCircle className="h-5 w-5 text-green-700" />
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-green-700">{analytics.present}</p>
                    <p className="text-xs text-green-600">Present</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-200 rounded-lg">
                    <Clock className="h-5 w-5 text-amber-700" />
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-amber-700">{analytics.late}</p>
                    <p className="text-xs text-amber-600">Late</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-200 rounded-lg">
                    <AlertCircle className="h-5 w-5 text-red-700" />
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-red-700">{analytics.absent}</p>
                    <p className="text-xs text-red-600">Absent</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-200 rounded-lg">
                    <TrendingUp className="h-5 w-5 text-purple-700" />
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-purple-700">
                      {analytics.attendanceRate}%
                    </p>
                    <p className="text-xs text-purple-600">Attendance Rate</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        ) : null}
      </div>

      <Card className="lg:col-span-1">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Status Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          {statusBarData.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={statusBarData} layout="vertical">
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="status"
                  tick={{ fontSize: 11 }}
                  width={60}
                />
                <Tooltip />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {statusBarData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[180px] flex items-center justify-center text-muted-foreground text-sm">
              No data
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="lg:col-span-1">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Period Totals</CardTitle>
        </CardHeader>
        <CardContent>
          {adminPieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={adminPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={35}
                  outerRadius={60}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {adminPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend iconSize={8} wrapperStyle={{ fontSize: "10px" }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[180px] flex items-center justify-center text-muted-foreground text-sm">
              No data
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
