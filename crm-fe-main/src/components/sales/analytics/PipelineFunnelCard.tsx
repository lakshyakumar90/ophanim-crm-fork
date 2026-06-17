"use client";

import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { ChartCard } from "@/components/charts/chart-card";
import { buildChartConfig, chartAxisProps, chartGridProps } from "@/components/charts/chart-config";
import type { FunnelDatum } from "@/hooks/sales/useSalesAnalytics";
import { EmptyState } from "./EmptyState";

const funnelConfig = buildChartConfig({ value: { label: "Leads" } });

interface PipelineFunnelCardProps {
  funnelData: FunnelDatum[];
}

export function PipelineFunnelCard({ funnelData }: PipelineFunnelCardProps) {
  return (
    <ChartCard
      title="Pipeline Funnel"
      description="Stage distribution from filtered lead dataset"
      className="lg:col-span-3"
      height={220}
    >
      {funnelData.length > 0 ? (
        <ChartContainer config={funnelConfig} className="h-full w-full">
          <BarChart
            data={funnelData}
            layout="vertical"
            margin={{ left: 0, right: 16, top: 4, bottom: 4 }}
          >
            <CartesianGrid {...chartGridProps} horizontal={false} vertical />
            <XAxis type="number" {...chartAxisProps} />
            <YAxis type="category" dataKey="name" width={100} {...chartAxisProps} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
              {funnelData.map((entry, i) => (
                <Cell key={i} fill={entry.fill?.startsWith("var(") ? entry.fill : `var(--chart-${(i % 5) + 1})`} />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      ) : (
        <EmptyState message="No funnel data for selected filters" />
      )}
    </ChartCard>
  );
}
