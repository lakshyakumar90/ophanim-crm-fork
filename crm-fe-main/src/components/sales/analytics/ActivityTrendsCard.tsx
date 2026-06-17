"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { ChartCard } from "@/components/charts/chart-card";
import { buildChartConfig, chartAxisProps, chartGridProps } from "@/components/charts/chart-config";
import type { ActivityPoint } from "@/hooks/sales/useSalesAnalytics";
import { EmptyState } from "./EmptyState";
import { SummaryBadge } from "./SummaryBadge";

const activityConfig = buildChartConfig({
  total: { label: "Total Activities", colorIndex: 4 },
  status_change: { label: "Status Changes", colorIndex: 0 },
  comment: { label: "Comments", colorIndex: 1 },
});

interface ActivityTrendsCardProps {
  activityData: ActivityPoint[];
  totalActivities: number;
  totalStatusChanges: number;
  totalNotes: number;
}

export function ActivityTrendsCard({
  activityData,
  totalActivities,
  totalStatusChanges,
  totalNotes,
}: ActivityTrendsCardProps) {
  return (
    <ChartCard
      title="Activity Trends"
      description="Tracked activity only (status changes, comments, and total actions)"
      className="lg:col-span-4"
      height={220}
    >
      {activityData.length > 0 ? (
        <ChartContainer config={activityConfig} className="h-full w-full">
          <BarChart data={activityData} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
            <CartesianGrid {...chartGridProps} />
            <XAxis dataKey="date" {...chartAxisProps} />
            <YAxis {...chartAxisProps} width={28} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="total" fill="var(--color-total)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="status_change" fill="var(--color-status_change)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="comment" fill="var(--color-comment)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartContainer>
      ) : (
        <EmptyState message="No tracked activity for selected filters" />
      )}

      <div className="mt-3 grid grid-cols-3 gap-2 px-3 text-xs">
        <SummaryBadge label="Total Activities" value={totalActivities} />
        <SummaryBadge label="Status Changes" value={totalStatusChanges} />
        <SummaryBadge label="Comments" value={totalNotes} />
      </div>
    </ChartCard>
  );
}
