"use client";

import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { ChartCard } from "@/components/charts/chart-card";
import { buildChartConfig, chartAxisProps, chartGridProps } from "@/components/charts/chart-config";

interface PipelineChartProps {
  data: Record<string, number>;
}

const pipelineConfig = buildChartConfig({
  value: { label: "Count" },
});

export function LeadPipelineChart({ data }: PipelineChartProps) {
  const chartData = Object.entries(data).map(([name, value]) => ({
    name: name.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase()),
    value,
  }));

  return (
    <ChartCard title="Lead Pipeline" className="col-span-1 lg:col-span-2" height={220}>
      <ChartContainer config={pipelineConfig} className="h-full w-full">
        <BarChart data={chartData} layout="vertical" margin={{ left: 0, right: 8 }}>
          <CartesianGrid {...chartGridProps} />
          <XAxis type="number" {...chartAxisProps} />
          <YAxis dataKey="name" type="category" width={90} {...chartAxisProps} />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Bar dataKey="value" fill="var(--color-value)" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ChartContainer>
    </ChartCard>
  );
}

interface SourceChartProps {
  data: Record<string, number>;
}

export function LeadSourceChart({ data }: SourceChartProps) {
  const chartData = Object.entries(data).map(([name, value], index) => ({
    name: name.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase()),
    value,
    fill: `var(--chart-${(index % 5) + 1})`,
  }));

  const sourceConfig = buildChartConfig(
    Object.fromEntries(chartData.map((d) => [d.name, { label: d.name }])),
  );

  return (
    <ChartCard title="Lead Sources" height={220}>
      <ChartContainer config={sourceConfig} className="h-full w-full">
        <PieChart>
          <ChartTooltip content={<ChartTooltipContent hideLabel />} />
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={75}
            paddingAngle={2}
            dataKey="value"
            nameKey="name"
            strokeWidth={2}
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
          </Pie>
        </PieChart>
      </ChartContainer>
      <div className="mt-2 flex h-12 flex-wrap justify-center gap-2 overflow-y-auto px-3">
        {chartData.map((item) => (
          <div key={item.name} className="flex items-center gap-1 text-xs">
            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: item.fill }} />
            <span className="text-muted-foreground">{item.name}</span>
          </div>
        ))}
      </div>
    </ChartCard>
  );
}

interface TrendChartProps {
  data: { date: string; value: number }[];
  title: string;
}

const trendConfig = buildChartConfig({ value: { label: "Value" } });

export function TrendChart({ data, title }: TrendChartProps) {
  return (
    <ChartCard title={title} height={200}>
      <ChartContainer config={trendConfig} className="h-full w-full">
        <LineChart data={data} margin={{ left: 0, right: 8 }}>
          <CartesianGrid {...chartGridProps} />
          <XAxis dataKey="date" {...chartAxisProps} />
          <YAxis {...chartAxisProps} width={32} />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Line
            type="monotone"
            dataKey="value"
            stroke="var(--color-value)"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ChartContainer>
    </ChartCard>
  );
}
