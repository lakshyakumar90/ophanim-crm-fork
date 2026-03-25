"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { RecruitmentMetrics as Metrics } from "@/types/recruitment";
import { PIPELINE_STAGES } from "@/types/recruitment";

export function RecruitmentMetrics({
  metrics,
  loading,
}: {
  metrics: Metrics | null;
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-lg" />
        ))}
      </div>
    );
  }

  if (!metrics) {
    return (
      <p className="text-sm text-muted-foreground">Metrics unavailable.</p>
    );
  }

  const stageTotal = Object.values(metrics.stageDistribution).reduce(
    (a, b) => a + b,
    0,
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricTile
          label="Open postings"
          value={metrics.openPositions}
        />
        <MetricTile label="Total candidates" value={metrics.totalCandidates} />
        <MetricTile label="Total hired" value={metrics.totalHired} />
        <MetricTile
          label="Avg. time to hire"
          value={
            metrics.avgTimeToHireDays != null
              ? `${metrics.avgTimeToHireDays} days`
              : "—"
          }
        />
        <MetricTile
          label="Offer acceptance"
          value={
            metrics.offerAcceptanceRate != null
              ? `${metrics.offerAcceptanceRate}%`
              : "—"
          }
        />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Stage distribution</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {PIPELINE_STAGES.map(({ id, label }) => {
            const n = metrics.stageDistribution[id] ?? 0;
            const pct = stageTotal ? Math.round((n / stageTotal) * 100) : 0;
            return (
              <div key={id} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span>{label}</span>
                  <span className="text-muted-foreground">
                    {n} ({pct}%)
                  </span>
                </div>
                <Progress value={pct} className="h-2" />
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Source effectiveness</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {Object.keys(metrics.sourceEffectiveness).length === 0 ? (
            <p className="text-sm text-muted-foreground">No source data yet.</p>
          ) : (
            Object.entries(metrics.sourceEffectiveness).map(([src, v]) => (
              <div
                key={src}
                className="flex justify-between text-sm border-b border-border/60 pb-2 last:border-0"
              >
                <span className="capitalize">{src.replace(/_/g, " ")}</span>
                <span className="text-muted-foreground">
                  {v.hired} hired / {v.total} total
                </span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function MetricTile({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <Card>
      <CardHeader className="pb-1 pt-4">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {label}
        </p>
        <p className="text-2xl font-bold tabular-nums">{value}</p>
      </CardHeader>
    </Card>
  );
}
