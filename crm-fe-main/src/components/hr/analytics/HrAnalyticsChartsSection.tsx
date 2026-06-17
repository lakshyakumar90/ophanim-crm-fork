"use client";

import { Calendar, Clock, TrendingUp, Users } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  XAxis,
  YAxis,
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
import { COLORS, type HRAnalytics, type AttendanceDatum, type RoleDatum } from "./constants";

const headcountConfig = buildChartConfig({ count: { label: "Headcount", colorIndex: 2 } });
const leaveConfig = buildChartConfig({
  totalDays: { label: "Total Days", colorIndex: 2 },
  requestCount: { label: "Requests", colorIndex: 3 },
});
const deptConfig = buildChartConfig({ count: { label: "Employees", colorIndex: 0 } });
const jobTitleConfig = buildChartConfig({ count: { label: "Employees", colorIndex: 2 } });

interface HrAnalyticsChartsSectionProps {
  analytics: HRAnalytics;
  attendanceTotal: number;
  attendanceData: AttendanceDatum[];
  roleData: RoleDatum[];
}

export function HrAnalyticsChartsSection({
  analytics,
  attendanceTotal,
  attendanceData,
  roleData,
}: HrAnalyticsChartsSectionProps) {
  const attendanceChartData = attendanceData.map((entry, index) => ({
    ...entry,
    fill: entry.color || COLORS[index % COLORS.length],
  }));

  const attendancePieConfig = buildChartConfig(
    Object.fromEntries(attendanceChartData.map((d) => [d.name, { label: d.name }])),
  );

  const roleChartData = roleData.map((entry, index) => ({
    ...entry,
    fill: entry.color || COLORS[index % COLORS.length],
  }));

  const rolePieConfig = buildChartConfig(
    Object.fromEntries(roleChartData.map((d) => [d.role, { label: d.role }])),
  );

  return (
    <>
      <div className="grid gap-3 md:grid-cols-2">
        <ChartCard
          title={
            <span className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Headcount Trend
            </span>
          }
          description="Last 6 months"
          height={220}
        >
          <ChartContainer config={headcountConfig} className="h-full w-full">
            <LineChart data={analytics.monthlyHeadcount} margin={{ left: 0, right: 8 }}>
              <CartesianGrid {...chartGridProps} />
              <XAxis dataKey="month" {...chartAxisProps} />
              <YAxis {...chartAxisProps} width={32} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line
                type="monotone"
                dataKey="count"
                stroke="var(--color-count)"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ChartContainer>
        </ChartCard>

        <ChartCard
          title={
            <span className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Today&apos;s Attendance
            </span>
          }
          description={`${attendanceTotal} employees tracked today`}
          height={220}
        >
          {attendanceTotal > 0 ? (
            <ChartContainer config={attendancePieConfig} className="h-full w-full">
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                <Pie
                  data={attendanceChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={2}
                  dataKey="value"
                  nameKey="name"
                >
                  {attendanceChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
              No attendance data for today
            </div>
          )}
        </ChartCard>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <ChartCard
          title={
            <span className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Department Distribution
            </span>
          }
          description="Employees per department"
          height={220}
        >
          <ChartContainer config={deptConfig} className="h-full w-full">
            <BarChart data={analytics.departmentBreakdown} layout="vertical" margin={{ left: 0, right: 8 }}>
              <CartesianGrid {...chartGridProps} horizontal={false} vertical />
              <XAxis type="number" {...chartAxisProps} />
              <YAxis dataKey="department" type="category" width={90} {...chartAxisProps} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                {analytics.departmentBreakdown.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        </ChartCard>

        <ChartCard
          title={
            <span className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Leave Usage by Type
            </span>
          }
          description="This year (approved leaves)"
          height={220}
        >
          {analytics.leaveUsageByType.length > 0 ? (
            <ChartContainer config={leaveConfig} className="h-full w-full">
              <BarChart data={analytics.leaveUsageByType} margin={{ left: 0, right: 8 }}>
                <CartesianGrid {...chartGridProps} />
                <XAxis dataKey="leaveType" {...chartAxisProps} />
                <YAxis {...chartAxisProps} width={32} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar dataKey="totalDays" fill="var(--color-totalDays)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="requestCount" fill="var(--color-requestCount)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
              No leave data this year
            </div>
          )}
        </ChartCard>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <ChartCard title="Role Distribution" description="Employees by role" height={220}>
          <ChartContainer config={rolePieConfig} className="h-full w-full">
            <PieChart>
              <ChartTooltip content={<ChartTooltipContent hideLabel />} />
              <Pie
                data={roleChartData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={75}
                paddingAngle={2}
                dataKey="count"
                nameKey="role"
              >
                {roleChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
            </PieChart>
          </ChartContainer>
        </ChartCard>

        <ChartCard title="Job Title Distribution" description="Employees by specialization" height={220}>
          <ChartContainer config={jobTitleConfig} className="h-full w-full">
            <BarChart data={analytics.jobTitleBreakdown} layout="vertical" margin={{ left: 0, right: 8 }}>
              <CartesianGrid {...chartGridProps} horizontal={false} vertical />
              <XAxis type="number" {...chartAxisProps} />
              <YAxis dataKey="jobTitle" type="category" width={100} {...chartAxisProps} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="count" fill="var(--color-count)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ChartContainer>
        </ChartCard>
      </div>
    </>
  );
}
