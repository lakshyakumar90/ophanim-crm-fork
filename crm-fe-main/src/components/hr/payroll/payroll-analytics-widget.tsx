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
  Tooltip,
  ResponsiveContainer,
  Legend,
  BarChart,
  Bar,
} from "recharts";
import type { PayrollAnalytics } from "@/types/payroll";
import { formatINR, formatPayrollMonthLabel, parseNum } from "@/lib/payroll-format";
import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

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
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Monthly payroll trend</CardTitle>
            <CardDescription>Last 6 months — gross vs net (₹)</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            {trendData.length === 0 ? (
              <p className="text-sm text-muted-foreground">Not enough data yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    formatter={(value) => formatINR(Number(value ?? 0))}
                    contentStyle={{ borderRadius: 8 }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="gross" name="Gross" stroke="#6366f1" strokeWidth={2} dot />
                  <Line type="monotone" dataKey="net" name="Net" stroke="#10b981" strokeWidth={2} dot />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Department cost (gross)</CardTitle>
            <CardDescription>Allocation from recent payroll records</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            {deptBars.length === 0 ? (
              <p className="text-sm text-muted-foreground">No department breakdown.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={deptBars} layout="vertical" margin={{ left: 8, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" tickFormatter={(v) => `₹${(v / 100000).toFixed(1)}L`} />
                  <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(value) => formatINR(Number(value ?? 0))} />
                  <Bar dataKey="value" fill="#8b5cf6" radius={[0, 4, 4, 0]} name="Gross" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
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
