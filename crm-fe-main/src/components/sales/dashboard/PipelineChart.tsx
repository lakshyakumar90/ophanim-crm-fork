"use client";

import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { ChartCard } from "@/components/charts/chart-card";
import { buildChartConfig, chartAxisProps, chartGridProps } from "@/components/charts/chart-config";

interface PipelineChartDataItem {
  name: string;
  count: number;
  fill: string;
}

interface PipelineChartProps {
  pipelineChartData: PipelineChartDataItem[];
  pipelineMaxCount: number;
}

const pipelineConfig = buildChartConfig({ count: { label: "Leads" } });

export function PipelineChart({
  pipelineChartData,
  pipelineMaxCount,
}: PipelineChartProps) {
  return (
    <ChartCard
      title="Sales Pipeline"
      description="Deal distribution across pipeline stages"
      height={280}
    >
      {pipelineChartData.length > 0 ? (
        <ChartContainer config={pipelineConfig} className="h-full w-full">
          <BarChart data={pipelineChartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid {...chartGridProps} />
            <XAxis
              dataKey="name"
              interval={0}
              angle={-20}
              textAnchor="end"
              height={60}
              {...chartAxisProps}
            />
            <YAxis
              allowDecimals={false}
              width={28}
              domain={[0, Math.max(5, pipelineMaxCount)]}
              {...chartAxisProps}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {pipelineChartData.map((entry, idx) => (
                <Cell key={idx} fill={entry.fill.startsWith("var(") ? entry.fill : "var(--chart-1)"} />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      ) : (
        <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
          No pipeline data available
        </div>
      )}
    </ChartCard>
  );
}
