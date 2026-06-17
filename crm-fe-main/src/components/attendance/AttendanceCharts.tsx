"use client";

import { format } from "date-fns";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { ChartCard } from "@/components/charts/chart-card";
import { buildChartConfig, chartAxisProps, chartGridProps } from "@/components/charts/chart-config";
import { formatHoursToReadable, formatStoredTime } from "@/lib/date-utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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

const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
] as const;

const hoursConfig = buildChartConfig({
  hours: { label: "Hours", colorIndex: 0 },
});

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
        { name: "Present", value: summary.present || 0 },
        { name: "Late", value: summary.late || 0 },
        { name: "Half Day", value: summary.half_day || 0 },
        { name: "Absent", value: summary.absent || 0 },
        { name: "Leave", value: summary.leave || 0 },
      ]
        .filter((item) => item.value > 0)
        .map((item, index) => ({
          ...item,
          fill: CHART_COLORS[index % CHART_COLORS.length],
        }))
    : [];

  const pieConfig = buildChartConfig(
    Object.fromEntries(pieData.map((d) => [d.name, { label: d.name }])),
  );

  return (
    <ChartCard
      title={
        <span className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          Your Attendance
        </span>
      }
      height={220}
    >
      {pieData.length > 0 ? (
        <ChartContainer config={pieConfig} className="h-full w-full">
          <PieChart>
            <ChartTooltip content={<ChartTooltipContent hideLabel />} />
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              innerRadius={40}
              outerRadius={70}
              paddingAngle={3}
              dataKey="value"
              nameKey="name"
            >
              {pieData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Pie>
          </PieChart>
        </ChartContainer>
      ) : (
        <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
          No data yet
        </div>
      )}
    </ChartCard>
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
  const weekControls = (
    <div className="flex flex-wrap items-center gap-2">
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
  );

  return (
    <ChartCard
      title={
        <span className="flex items-center gap-2">
          <BarChartIcon className="h-4 w-4" />
          Weekly Working Hours
        </span>
      }
      action={weekControls}
      className="mt-6"
      height={220}
    >
      {loadingWeeklyHours ? (
        <Skeleton className="mx-(--card-spacing) h-full w-[calc(100%-2*var(--card-spacing))]" />
      ) : weeklyHoursData && weeklyHoursData.length > 0 ? (
        <>
          <ChartContainer config={hoursConfig} className="h-full w-full">
            <BarChart data={weeklyHoursData} margin={{ left: 0, right: 8 }}>
              <CartesianGrid {...chartGridProps} />
              <XAxis dataKey="day" {...chartAxisProps} />
              <YAxis
                {...chartAxisProps}
                width={32}
                tickFormatter={(value) => `${value}h`}
                domain={[0, 12]}
              />
              <ChartTooltip content={<WeeklyTooltip />} />
              <Bar dataKey="hours" radius={[4, 4, 0, 0]}>
                {weeklyHoursData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={
                      (entry as { isWeekend?: boolean }).isWeekend
                        ? "var(--chart-4)"
                        : "var(--color-hours)"
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
          <div className="mt-2 flex items-center justify-center gap-4 px-(--card-spacing) text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <div className="h-3 w-3 rounded bg-[var(--chart-1)]" />
              Weekday
            </span>
            <span className="flex items-center gap-1">
              <div className="h-3 w-3 rounded bg-[var(--chart-4)]" />
              Weekend (Office Off)
            </span>
          </div>
        </>
      ) : (
        <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
          No working-hour data for this week
        </div>
      )}
    </ChartCard>
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
        { name: "Present", value: analytics.present || 0 },
        { name: "Late", value: analytics.late || 0 },
        { name: "Absent", value: analytics.absent || 0 },
      ]
        .filter((item) => item.value > 0)
        .map((item, index) => ({
          ...item,
          fill: CHART_COLORS[index % CHART_COLORS.length],
        }))
    : [];

  const statusBarData = analytics
    ? [
        { status: "Present", count: analytics.present || 0 },
        { status: "Late", count: analytics.late || 0 },
        { status: "Absent", count: analytics.absent || 0 },
        { status: "Half Day", count: analytics.half_day || 0 },
        { status: "Leave", count: analytics.leave || 0 },
      ]
        .filter((item) => item.count > 0)
        .map((item, index) => ({
          ...item,
          fill: CHART_COLORS[index % CHART_COLORS.length],
        }))
    : [];

  const statusBarConfig = buildChartConfig(
    Object.fromEntries(statusBarData.map((d) => [d.status, { label: d.status }])),
  );

  const adminPieConfig = buildChartConfig(
    Object.fromEntries(adminPieData.map((d) => [d.name, { label: d.name }])),
  );

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

      <ChartCard title="Status Distribution" className="lg:col-span-1" height={220}>
        {statusBarData.length > 0 ? (
          <ChartContainer config={statusBarConfig} className="h-full w-full">
            <BarChart data={statusBarData} layout="vertical" margin={{ left: 0, right: 8 }}>
              <CartesianGrid {...chartGridProps} horizontal={false} vertical />
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="status"
                width={60}
                {...chartAxisProps}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                {statusBarData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            No data
          </div>
        )}
      </ChartCard>

      <ChartCard title="Period Totals" className="lg:col-span-1" height={220}>
        {adminPieData.length > 0 ? (
          <ChartContainer config={adminPieConfig} className="h-full w-full">
            <PieChart>
              <ChartTooltip content={<ChartTooltipContent hideLabel />} />
              <Pie
                data={adminPieData}
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={70}
                paddingAngle={3}
                dataKey="value"
                nameKey="name"
              >
                {adminPieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <ChartLegend content={<ChartLegendContent />} />
            </PieChart>
          </ChartContainer>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            No data
          </div>
        )}
      </ChartCard>
    </div>
  );
}
