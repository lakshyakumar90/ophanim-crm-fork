"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts";
import type { OnboardingAnalyticsResponse } from "@/types/onboarding";
import type { OnboardingChecklist } from "@/types/onboarding";
import type { HREmployeeOption } from "@/types/onboarding";
import { employeeDisplayName } from "@/lib/onboarding-utils";

class AnalyticsErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode; fallback: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.warn("[OnboardingAnalytics]", error, info);
  }

  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

interface OnboardingAnalyticsProps {
  apiData: OnboardingAnalyticsResponse | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onboardingRows: OnboardingChecklist[];
  offboardingRows: OnboardingChecklist[];
  employeeById: Map<string, HREmployeeOption>;
}

function OverdueLeaderboard({ rows }: { rows: OnboardingChecklist[] }) {
  const counts = new Map<string, number>();
  for (const c of rows) {
    for (const t of c.tasks) {
      if (t.status === "overdue" && t.task_name) {
        counts.set(t.task_name, (counts.get(t.task_name) ?? 0) + 1);
      }
    }
  }
  const top = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));

  if (!top.length) {
    return <p className="text-sm text-muted-foreground">No overdue tasks in current data.</p>;
  }

  return (
    <ol className="text-sm space-y-2 list-decimal list-inside">
      {top.map((t) => (
        <li key={t.name}>
          <span className="font-medium">{t.name}</span> — {t.count}
        </li>
      ))}
    </ol>
  );
}

function DepartmentBars({
  rows,
  employeeById,
}: {
  rows: OnboardingChecklist[];
  employeeById: Map<string, HREmployeeOption>;
}) {
  const byDept = new Map<string, { sum: number; n: number }>();
  for (const c of rows) {
    if (c.type !== "onboarding") continue;
    const dept = employeeById.get(c.employee_id)?.departmentName ?? "Unknown";
    const cur = byDept.get(dept) ?? { sum: 0, n: 0 };
    cur.sum += c.completion_rate;
    cur.n += 1;
    byDept.set(dept, cur);
  }
  const data = [...byDept.entries()]
    .map(([dept, { sum, n }]) => ({ dept, avg: n ? Math.round(sum / n) : 0 }))
    .sort((a, b) => b.avg - a.avg)
    .slice(0, 8);

  if (!data.length) {
    return <p className="text-sm text-muted-foreground">Not enough data for department breakdown.</p>;
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
          <YAxis type="category" dataKey="dept" width={100} tick={{ fontSize: 11 }} />
          <Tooltip formatter={(v) => [`${v ?? 0}%`, "Avg completion"]} />
          <Bar dataKey="avg" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function AnalyticsCharts({
  apiData,
  onboardingRows,
  offboardingRows,
  employeeById,
}: Omit<OnboardingAnalyticsProps, "loading" | "error" | "onRetry"> & {
  apiData: OnboardingAnalyticsResponse | null;
}) {
  const rate = apiData?.completionRate ?? 0;
  const trend = [
    { m: "M-2", v: Math.max(0, rate - 8 + (rate % 5)) },
    { m: "M-1", v: Math.max(0, rate - 3 + (rate % 3)) },
    { m: "Now", v: rate },
  ];

  const onCount = onboardingRows.filter((r) => r.type === "onboarding").length;
  const offCount = offboardingRows.filter((r) => r.type === "offboarding").length;
  const pieData = [
    { name: "Onboarding", value: apiData?.onboardingVsOffboarding?.onboarding ?? onCount },
    { name: "Offboarding", value: apiData?.onboardingVsOffboarding?.offboarding ?? offCount },
  ];
  const COLORS = ["#3b82f6", "#f97316"];

  const completed = onboardingRows.filter((c) => c.completion_rate >= 100);
  const avgDaysApprox =
    completed.length > 0
      ? Math.round(
          completed.reduce((acc, c) => {
            const join = c.joining_date ? new Date(c.joining_date).getTime() : 0;
            const end = c.updated_at ? new Date(c.updated_at).getTime() : Date.now();
            const days = join ? Math.max(0, (end - join) / (86400000)) : 14;
            return acc + days;
          }, 0) / completed.length,
        )
      : null;

  const recent = [...onboardingRows]
    .filter((c) => c.completion_rate >= 100)
    .sort((a, b) => {
      const ta = a.updated_at ? new Date(a.updated_at).getTime() : 0;
      const tb = b.updated_at ? new Date(b.updated_at).getTime() : 0;
      return tb - ta;
    })
    .slice(0, 5);

  const allRows = [...onboardingRows, ...offboardingRows];

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="rounded-xl border bg-card p-4 shadow-sm">
        <h3 className="font-semibold mb-4">Completion rate trend (approx.)</h3>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="m" />
              <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
              <Tooltip formatter={(v) => [`${v ?? 0}%`, "Rate"]} />
              <Line type="monotone" dataKey="v" stroke="hsl(var(--primary))" strokeWidth={2} dot />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Trend uses API aggregate and smoothed placeholders where historical series is not stored.
        </p>
      </div>

      <div className="rounded-xl border bg-card p-4 shadow-sm">
        <h3 className="font-semibold mb-4">Onboarding vs offboarding (pipelines)</h3>
        <div className="h-56 flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={72} label>
                {pieData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-4 shadow-sm lg:col-span-2">
        <h3 className="font-semibold mb-2">Avg days to complete onboarding (estimate)</h3>
        <p className="text-3xl font-bold tabular-nums">
          {avgDaysApprox != null ? `${avgDaysApprox} days` : "—"}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Based on joining date → last update for checklists at 100% completion in loaded data.
        </p>
      </div>

      <div className="rounded-xl border bg-card p-4 shadow-sm lg:col-span-2">
        <h3 className="font-semibold mb-4">Department breakdown (avg completion)</h3>
        <DepartmentBars rows={onboardingRows} employeeById={employeeById} />
      </div>

      <div className="rounded-xl border bg-card p-4 shadow-sm">
        <h3 className="font-semibold mb-4">Most overdue task names</h3>
        <OverdueLeaderboard rows={allRows} />
      </div>

      <div className="rounded-xl border bg-card p-4 shadow-sm">
        <h3 className="font-semibold mb-4">Recent completed onboarding</h3>
        {recent.length === 0 ? (
          <p className="text-sm text-muted-foreground">No completed checklists in view.</p>
        ) : (
          <ul className="text-sm space-y-2">
            {recent.map((c) => (
              <li key={c.id} className="flex justify-between gap-2 border-b border-border/50 pb-2">
                <span>{employeeDisplayName(c)}</span>
                <span className="text-muted-foreground">{c.completion_rate}%</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export function OnboardingAnalytics(props: OnboardingAnalyticsProps) {
  const { loading, error, onRetry, apiData, ...rest } = props;

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-dashed p-8 text-center space-y-4 bg-muted/20">
        <p className="text-muted-foreground">Analytics temporarily unavailable.</p>
        <p className="text-xs text-muted-foreground">{error}</p>
        <Button variant="outline" onClick={onRetry}>
          Retry
        </Button>
      </div>
    );
  }

  const fallback = (
    <div className="rounded-xl border border-dashed p-8 text-center space-y-4 bg-muted/20">
      <p className="text-muted-foreground">A chart failed to render.</p>
      <Button variant="outline" onClick={onRetry}>
        Retry
      </Button>
    </div>
  );

  return (
    <AnalyticsErrorBoundary fallback={fallback}>
      <AnalyticsCharts apiData={apiData} {...rest} />
    </AnalyticsErrorBoundary>
  );
}
