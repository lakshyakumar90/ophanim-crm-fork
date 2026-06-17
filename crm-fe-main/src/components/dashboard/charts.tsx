"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";

const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

// Custom Tooltip Component for cohesive design
function CustomTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background/95 backdrop-blur-sm border border-border shadow-xl rounded-xl p-3 z-50">
        {label && (
          <p className="font-medium text-foreground mb-1.5 text-sm">{label}</p>
        )}
        {payload.map((item: any, index: number) => (
          <div key={index} className="flex items-center gap-2 text-sm">
            <div
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: item.fill || item.color }}
            />
            <span className="text-muted-foreground capitalize">
              {item.name}:
            </span>
            <span className="font-semibold text-foreground">{item.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
}

interface PipelineChartProps {
  data: Record<string, number>;
}

export function LeadPipelineChart({ data }: PipelineChartProps) {
  const chartData = Object.entries(data).map(([name, value]) => ({
    name: name.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase()),
    value,
  }));

  return (
    <Card className="col-span-1 lg:col-span-2">
      <CardHeader>
        <CardTitle className="text-lg">Lead Pipeline</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full min-w-0">
          <ResponsiveContainer width="99%" height="100%">
            <BarChart data={chartData} layout="vertical">
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(var(--border))"
                vertical={false}
              />
              <XAxis
                type="number"
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                dataKey="name"
                type="category"
                width={100}
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                content={<CustomTooltip />}
                cursor={{ fill: "hsl(var(--accent))", opacity: 0.2 }}
              />
              <Bar
                dataKey="value"
                fill="url(#gradient)"
                radius={[0, 4, 4, 0]}
              />
              <defs>
                <linearGradient id="gradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor={CHART_COLORS[0]} />
                  <stop offset="100%" stopColor={CHART_COLORS[1]} />
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

interface SourceChartProps {
  data: Record<string, number>;
}

export function LeadSourceChart({ data }: SourceChartProps) {
  const chartData = Object.entries(data).map(([name, value]) => ({
    name: name.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase()),
    value,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Lead Sources</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full min-w-0">
          <ResponsiveContainer width="99%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey="value"
                stroke="hsl(var(--background))"
                strokeWidth={2}
              >
                {chartData.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={CHART_COLORS[index % CHART_COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex flex-wrap gap-2 justify-center mt-4 h-16 overflow-y-auto">
          {chartData.map((item, index) => (
            <div key={item.name} className="flex items-center gap-1.5 text-xs">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
              />
              <span className="text-muted-foreground">{item.name}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

interface TrendChartProps {
  data: { date: string; value: number }[];
  title: string;
}

export function TrendChart({ data, title }: TrendChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[200px] w-full min-w-0">
          <ResponsiveContainer width="99%" height="100%">
            <LineChart data={data}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(var(--border))"
                vertical={false}
              />
              <XAxis
                dataKey="date"
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="value"
                stroke="url(#lineGradient)"
                strokeWidth={3}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0 }}
              />
              <defs>
                <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor={CHART_COLORS[0]} />
                  <stop offset="100%" stopColor={CHART_COLORS[1]} />
                </linearGradient>
              </defs>
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
