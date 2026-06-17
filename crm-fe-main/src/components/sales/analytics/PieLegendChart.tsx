"use client";

import { Cell, Pie, PieChart } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { buildChartConfig } from "@/components/charts/chart-config";
import { EmptyState } from "./EmptyState";
import { PIE_COLORS } from "./utils";

export function PieLegendChart({ data }: { data: { name: string; value: number }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (!data.length || total === 0) {
    return <EmptyState message="No data for selected filters" />;
  }

  const chartData = data.map((item, i) => ({
    ...item,
    fill: PIE_COLORS[i % PIE_COLORS.length],
  }));

  const pieConfig = buildChartConfig(
    Object.fromEntries(chartData.map((d) => [d.name, { label: d.name }])),
  );

  return (
    <div className="flex min-h-[200px] items-center gap-4">
      <div className="h-[200px] min-w-0 flex-1">
        <ChartContainer config={pieConfig} className="h-full w-full">
          <PieChart>
            <ChartTooltip content={<ChartTooltipContent hideLabel />} />
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              innerRadius="46%"
              outerRadius="72%"
              paddingAngle={2}
            >
              {chartData.map((entry, i) => (
                <Cell key={i} fill={entry.fill} />
              ))}
            </Pie>
          </PieChart>
        </ChartContainer>
      </div>
      <div className="flex max-h-[200px] w-44 shrink-0 flex-col gap-1.5 overflow-y-auto">
        {chartData.map((item, i) => {
          const pct = total > 0 ? ((item.value / total) * 100).toFixed(0) : "0";
          return (
            <div key={i} className="flex min-w-0 items-center gap-1.5 text-xs">
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ background: PIE_COLORS[i % PIE_COLORS.length] }}
              />
              <span className="flex-1 truncate capitalize text-foreground/80">{item.name}</span>
              <span className="font-semibold tabular-nums">{item.value}</span>
              <span className="w-8 text-right text-muted-foreground tabular-nums">{pct}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
