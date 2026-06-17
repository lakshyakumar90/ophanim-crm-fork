"use client";

import { useEffect, useState, Component, type ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { ChartCard } from "@/components/charts/chart-card";
import { buildChartConfig, chartAxisProps, chartGridProps } from "@/components/charts/chart-config";
import { fetchPerformanceAnalytics, fetchHRPerformanceAnalytics } from "@/lib/performance-api";
import type { PerformanceAnalytics as PerfAnalyticsType, HRPerformanceAnalytics } from "@/types/performance";
import { Skeleton } from "@/components/ui/skeleton";

class WidgetBoundary extends Component<
  { children: ReactNode; fallback?: ReactNode },
  { err: boolean }
> {
  state = { err: false };
  static getDerivedStateFromError() {
    return { err: true };
  }
  render() {
    if (this.state.err) {
      return this.props.fallback ?? <p className="text-xs text-muted-foreground">Could not load chart.</p>;
    }
    return this.props.children;
  }
}

export function CyclePerformanceAnalytics({ cycleId }: { cycleId: string }) {
  const [data, setData] = useState<PerfAnalyticsType | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const d = await fetchPerformanceAnalytics(cycleId);
        if (!cancelled) setData(d);
      } catch (e: unknown) {
        if (!cancelled) {
          setData(null);
          setErr(e instanceof Error ? e.message : "Failed");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [cycleId]);

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
      </div>
    );
  }
  if (err || !data) {
    return <p className="text-sm text-muted-foreground">Cycle analytics unavailable.</p>;
  }

  const ratingRows = Object.entries(data.ratingDistribution || {}).map(([name, value]) => ({
    name,
    value,
  }));
  const statusRows = Object.entries(data.statusDistribution || {}).map(([name, value]) => ({
    name,
    value,
  }));

  const ratingConfig = buildChartConfig({ value: { label: "Count", colorIndex: 0 } });
  const statusConfig = buildChartConfig({ value: { label: "Count", colorIndex: 1 } });

  return (
    <div className="grid gap-3 md:grid-cols-2">
      <WidgetBoundary>
        <ChartCard title="Rating distribution" height={220}>
          <ChartContainer config={ratingConfig} className="h-full w-full">
            <BarChart data={ratingRows} margin={{ left: 0, right: 8 }}>
              <CartesianGrid {...chartGridProps} />
              <XAxis dataKey="name" {...chartAxisProps} />
              <YAxis allowDecimals={false} {...chartAxisProps} width={28} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="value" fill="var(--color-value)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartContainer>
        </ChartCard>
      </WidgetBoundary>
      <WidgetBoundary>
        <ChartCard title="Review status funnel" height={220}>
          <ChartContainer config={statusConfig} className="h-full w-full">
            <BarChart layout="vertical" data={statusRows} margin={{ left: 0, right: 8 }}>
              <CartesianGrid {...chartGridProps} horizontal={false} vertical />
              <XAxis type="number" allowDecimals={false} {...chartAxisProps} />
              <YAxis type="category" dataKey="name" width={90} {...chartAxisProps} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="value" fill="var(--color-value)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ChartContainer>
        </ChartCard>
      </WidgetBoundary>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Summary</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-1 text-muted-foreground">
          <p>Total reviews: {data.totalReviews}</p>
          <p>PIP flagged: {data.pipTriggered}</p>
          <p>High performers (exceeds + exceptional): {data.highPerformers}</p>
          <p>Completion (calibrated + released): {data.completionRate}%</p>
        </CardContent>
      </Card>
    </div>
  );
}

export function HRPerformanceDashboardWidgets() {
  const [data, setData] = useState<HRPerformanceAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const d = await fetchHRPerformanceAnalytics();
        if (!cancelled) setData(d);
      } catch {
        if (!cancelled) setData(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    );
  }
  if (!data) {
    return (
      <p className="text-sm text-muted-foreground">
        HR performance dashboard metrics are temporarily unavailable.
      </p>
    );
  }

  const pendingApprox = data.pendingManagerReviews;

  return (
    <WidgetBoundary
      fallback={
        <p className="text-xs text-muted-foreground">HR performance widgets unavailable.</p>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground">Active cycles</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{data.activeReviewCycles}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Approx. awaiting manager review
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{pendingApprox}</p>
            <p className="text-[10px] text-muted-foreground mt-1 leading-tight">
              Indicative only; use each cycle&apos;s review list for accurate status filters.
            </p>
          </CardContent>
        </Card>
        <Card className="sm:col-span-2">
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground">Status mix (HR)</CardTitle>
          </CardHeader>
          <CardContent className="h-[120px]">
            <ChartContainer
              config={buildChartConfig({ count: { label: "Reviews", colorIndex: 2 } })}
              className="h-full w-full"
            >
              <BarChart
                data={Array.isArray(data.reviewStatusDistribution) ? data.reviewStatusDistribution : []}
                margin={{ left: 0, right: 8 }}
              >
                <CartesianGrid {...chartGridProps} />
                <XAxis dataKey="status" {...chartAxisProps} />
                <YAxis allowDecimals={false} {...chartAxisProps} width={24} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" fill="var(--color-count)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </WidgetBoundary>
  );
}
