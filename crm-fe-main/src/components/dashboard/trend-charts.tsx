"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  XAxis,
  YAxis,
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

interface LeadTrendData {
  month: string;
  leads: number;
  converted: number;
}

const leadTrendConfig = buildChartConfig({
  leads: { label: "New Leads", colorIndex: 0 },
  converted: { label: "Converted", colorIndex: 1 },
});

export function LeadTrendChart({ data }: { data: LeadTrendData[] }) {
  return (
    <ChartCard
      title="Lead Acquisition"
      description="New leads vs Converted (6 months)"
      height={220}
    >
      <ChartContainer config={leadTrendConfig} className="h-full w-full">
        <AreaChart data={data} margin={{ left: 0, right: 8 }}>
          <CartesianGrid {...chartGridProps} />
          <XAxis dataKey="month" {...chartAxisProps} />
          <YAxis {...chartAxisProps} width={32} />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Area
            type="monotone"
            dataKey="leads"
            stroke="var(--color-leads)"
            fill="var(--color-leads)"
            fillOpacity={0.15}
            strokeWidth={2}
          />
          <Area
            type="monotone"
            dataKey="converted"
            stroke="var(--color-converted)"
            fill="var(--color-converted)"
            fillOpacity={0.15}
            strokeWidth={2}
          />
        </AreaChart>
      </ChartContainer>
    </ChartCard>
  );
}

interface RevenueTrendData {
  month: string;
  revenue: number;
  expenses: number;
}

const revenueTrendConfig = buildChartConfig({
  revenue: { label: "Revenue", colorIndex: 1 },
  expenses: { label: "Expenses", colorIndex: 4 },
});

export function RevenueTrendChart({ data }: { data: RevenueTrendData[] }) {
  return (
    <ChartCard
      title="Revenue vs Expenses"
      description="Financial trend (6 months)"
      height={220}
    >
      <ChartContainer config={revenueTrendConfig} className="h-full w-full">
        <LineChart data={data} margin={{ left: 0, right: 8 }}>
          <CartesianGrid {...chartGridProps} />
          <XAxis dataKey="month" {...chartAxisProps} />
          <YAxis
            {...chartAxisProps}
            width={40}
            tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`}
          />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Line
            type="monotone"
            dataKey="revenue"
            stroke="var(--color-revenue)"
            strokeWidth={2}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="expenses"
            stroke="var(--color-expenses)"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ChartContainer>
    </ChartCard>
  );
}

interface ProjectStatusData {
  name: string;
  value: number;
}

export function ProjectStatusChart({ data }: { data: ProjectStatusData[] }) {
  const chartData = data.map((item, index) => ({
    ...item,
    fill: `var(--chart-${(index % 5) + 1})`,
  }));

  const statusConfig = buildChartConfig(
    Object.fromEntries(chartData.map((d) => [d.name, { label: d.name }])),
  );

  return (
    <ChartCard title="Project Status" description="Distribution by status" height={220}>
      <ChartContainer config={statusConfig} className="h-full w-full">
        <PieChart>
          <ChartTooltip content={<ChartTooltipContent hideLabel />} />
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={45}
            outerRadius={70}
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
      <div className="mt-2 flex flex-wrap justify-center gap-2 px-3">
        {chartData.map((item) => (
          <div key={item.name} className="flex items-center gap-1 text-xs">
            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: item.fill }} />
            <span className="text-muted-foreground">{item.name}</span>
            <span className="font-medium">({item.value})</span>
          </div>
        ))}
      </div>
    </ChartCard>
  );
}

interface DepartmentPerformanceData {
  name: string;
  leads: number;
  tasks: number;
  revenue: number;
}

const deptConfig = buildChartConfig({
  leads: { label: "Leads", colorIndex: 0 },
  tasks: { label: "Tasks", colorIndex: 3 },
});

export function DepartmentPerformanceChart({
  data,
}: {
  data: DepartmentPerformanceData[];
}) {
  return (
    <ChartCard
      title="Department Performance"
      description="Leads, tasks & revenue by department"
      className="lg:col-span-2"
      height={220}
    >
      <ChartContainer config={deptConfig} className="h-full w-full">
        <BarChart data={data} layout="vertical" margin={{ left: 0, right: 8 }}>
          <CartesianGrid {...chartGridProps} horizontal={false} vertical />
          <XAxis type="number" {...chartAxisProps} />
          <YAxis dataKey="name" type="category" width={72} {...chartAxisProps} />
          <ChartTooltip content={<ChartTooltipContent />} />
          <ChartLegend content={<ChartLegendContent />} />
          <Bar dataKey="leads" fill="var(--color-leads)" radius={[0, 4, 4, 0]} />
          <Bar dataKey="tasks" fill="var(--color-tasks)" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ChartContainer>
    </ChartCard>
  );
}
