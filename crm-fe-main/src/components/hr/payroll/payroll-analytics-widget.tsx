"use client";

import { useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  BarChart,
  Bar,
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
import type { PayrollAnalytics } from "@/types/payroll";
import { formatINR, formatPayrollMonthLabel, parseNum } from "@/lib/payroll-format";
import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const trendConfig = buildChartConfig({
  gross: { label: "Gross", colorIndex: 0 },
  net: { label: "Net", colorIndex: 1 },
});

const deptConfig = buildChartConfig({
  value: { label: "Gross", colorIndex: 2 },
});

export function PayrollAnalyticsWidget({
  analytics,
  loading,
}: {
  analytics: PayrollAnalytics | null;
  loading: boolean;
}) {
  const trendData = useMemo(() => {
    const rows = analytics?.monthlyTrend || [];
    const sorted = [...rows].sort((a, b) => a.month.localeCompare(b.month));
    const last6 = sorted.slice(-6);
    return last6.map((r) => ({
      label: formatPayrollMonthLabel(r.month),
      month: r.month,
      gross: parseNum(r.total_gross),
      net: parseNum(r.total_net),
    }));
  }, [analytics]);

  const deptBars = useMemo(() => {
    const costs = analytics?.departmentCosts || {};
    return Object.entries(costs)
      .map(([name, value]) => ({ name, value: parseNum(value) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 12);
  }, [analytics]);

  const totalDept = deptBars.reduce((s, x) => s + x.value, 0) || 1;

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-72 w-full" />
        <Skeleton className="h-72 w-full" />
        <Skeleton className="h-48 w-full md:col-span-2" />
      </div>
    );
  }

  if (!analytics) {
    return <p className="text-sm text-muted-foreground">Analytics unavailable.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="Monthly payroll trend"
          description="Last 6 months — gross vs net (₹)"
          height={280}
        >
          {trendData.length === 0 ? (
            <p className="px-(--card-spacing) text-sm text-muted-foreground">Not enough data yet.</p>
          ) : (
            <ChartContainer config={trendConfig} className="h-full w-full">
              <LineChart data={trendData} margin={{ left: 0, right: 8 }}>
                <CartesianGrid {...chartGridProps} />
                <XAxis dataKey="label" {...chartAxisProps} />
                <YAxis
                  {...chartAxisProps}
                  width={40}
                  tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value) => formatINR(Number(value ?? 0))}
                    />
                  }
                />
                <ChartLegend content={<ChartLegendContent />} />
                <Line
                  type="monotone"
                  dataKey="gross"
                  stroke="var(--color-gross)"
                  strokeWidth={2}
                  dot
                />
                <Line
                  type="monotone"
                  dataKey="net"
                  stroke="var(--color-net)"
                  strokeWidth={2}
                  dot
                />
              </LineChart>
            </ChartContainer>
          )}
        </ChartCard>

        <ChartCard
          title="Department cost (gross)"
          description="Allocation from recent payroll records"
          height={280}
        >
          {deptBars.length === 0 ? (
            <p className="px-(--card-spacing) text-sm text-muted-foreground">No department breakdown.</p>
          ) : (
            <ChartContainer config={deptConfig} className="h-full w-full">
              <BarChart data={deptBars} layout="vertical" margin={{ left: 0, right: 16 }}>
                <CartesianGrid {...chartGridProps} horizontal={false} vertical />
                <XAxis
                  type="number"
                  {...chartAxisProps}
                  tickFormatter={(v) => `₹${(v / 100000).toFixed(1)}L`}
                />
                <YAxis type="category" dataKey="name" width={100} {...chartAxisProps} />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value) => formatINR(Number(value ?? 0))}
                    />
                  }
                />
                <Bar dataKey="value" fill="var(--color-value)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ChartContainer>
          )}
        </ChartCard>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Payroll anomalies (&gt;20% MoM gross)</CardTitle>
          <CardDescription>Employees flagged by automated check</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {(analytics.anomalies || []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No anomalies detected in the latest comparison.</p>
          ) : (
            (analytics.anomalies || []).map((a) => (
              <Alert key={`${a.employee_id}-${a.month}`} variant="destructive" className="py-2">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle className="text-sm">Employee {a.employee_id.slice(0, 8)}…</AlertTitle>
                <AlertDescription className="text-xs">
                  {formatPayrollMonthLabel(a.month)}: {formatINR(a.previous_gross)} → {formatINR(a.current_gross)}{" "}
                  ({a.change_pct >= 0 ? "+" : ""}
                  {a.change_pct}%)
                </AlertDescription>
              </Alert>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Department share (gross)</CardTitle>
          <CardDescription>Approximate % of sampled payroll cost</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="py-2 pr-4">Department</th>
                  <th className="py-2 pr-4 text-right">Gross cost</th>
                  <th className="py-2 text-right">Share</th>
                </tr>
              </thead>
              <tbody>
                {deptBars.map((d) => (
                  <tr key={d.name} className="border-b border-border/60">
                    <td className="py-2 pr-4 font-medium">{d.name}</td>
                    <td className="py-2 pr-4 text-right tabular-nums">{formatINR(d.value)}</td>
                    <td className="py-2 text-right tabular-nums">
                      {((d.value / totalDept) * 100).toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
