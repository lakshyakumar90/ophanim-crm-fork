"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

// Custom Tooltip Component
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
              style={{
                backgroundColor: item.stroke || item.fill || item.color,
              }}
            />
            <span className="text-muted-foreground capitalize">
              {item.name}:
            </span>
            <span className="font-semibold text-foreground">
              {typeof item.value === "number" &&
              item.name?.toLowerCase().includes("revenue")
                ? `₹${item.value.toLocaleString()}`
                : item.value.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
}

interface LeadTrendData {
  month: string;
  leads: number;
  converted: number;
}

interface LeadTrendChartProps {
  data: LeadTrendData[];
}

export function LeadTrendChart({ data }: LeadTrendChartProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">
          Lead Acquisition
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          New leads vs Converted (6 months)
        </p>
      </CardHeader>
      <CardContent>
        <div className="h-[220px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="leadGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CHART_COLORS[0]} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={CHART_COLORS[0]} stopOpacity={0} />
                </linearGradient>
                <linearGradient
                  id="convertedGradient"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="5%" stopColor={CHART_COLORS[1]} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={CHART_COLORS[1]} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(var(--border))"
                vertical={false}
              />
              <XAxis
                dataKey="month"
                stroke="hsl(var(--muted-foreground))"
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="hsl(var(--muted-foreground))"
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="leads"
                name="New Leads"
                stroke={CHART_COLORS[0]}
                fill="url(#leadGradient)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="converted"
                name="Converted"
                stroke={CHART_COLORS[1]}
                fill="url(#convertedGradient)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

interface RevenueTrendData {
  month: string;
  revenue: number;
  expenses: number;
}

interface RevenueTrendChartProps {
  data: RevenueTrendData[];
}

export function RevenueTrendChart({ data }: RevenueTrendChartProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">
          Revenue vs Expenses
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Financial trend (6 months)
        </p>
      </CardHeader>
      <CardContent>
        <div className="h-[220px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(var(--border))"
                vertical={false}
              />
              <XAxis
                dataKey="month"
                stroke="hsl(var(--muted-foreground))"
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="hsl(var(--muted-foreground))"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="revenue"
                name="Revenue"
                stroke={CHART_COLORS[1]}
                strokeWidth={3}
                dot={{ r: 4, strokeWidth: 2 }}
                activeDot={{ r: 6 }}
              />
              <Line
                type="monotone"
                dataKey="expenses"
                name="Expenses"
                stroke={CHART_COLORS[4]}
                strokeWidth={3}
                dot={{ r: 4, strokeWidth: 2 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

interface ProjectStatusData {
  name: string;
  value: number;
  [key: string]: any;
}

interface ProjectStatusChartProps {
  data: ProjectStatusData[];
}

const STATUS_COLORS: Record<string, string> = {
  "In Progress": CHART_COLORS[0],
  Completed: CHART_COLORS[1],
  Planning: CHART_COLORS[2],
  "On Hold": CHART_COLORS[3],
  Cancelled: CHART_COLORS[4],
};

export function ProjectStatusChart({ data }: ProjectStatusChartProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">
          Project Status
        </CardTitle>
        <p className="text-xs text-muted-foreground">Distribution by status</p>
      </CardHeader>
      <CardContent>
        <div className="h-[220px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
                stroke="hsl(var(--background))"
                strokeWidth={2}
              >
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={
                      STATUS_COLORS[entry.name] || CHART_COLORS[index % CHART_COLORS.length]
                    }
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex flex-wrap gap-3 justify-center mt-2">
          {data.map((item, index) => (
            <div key={item.name} className="flex items-center gap-1.5 text-xs">
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{
                  backgroundColor:
                    STATUS_COLORS[item.name] || CHART_COLORS[index % CHART_COLORS.length],
                }}
              />
              <span className="text-muted-foreground">{item.name}</span>
              <span className="font-medium">({item.value})</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

interface DepartmentPerformanceData {
  name: string;
  leads: number;
  tasks: number;
  revenue: number;
}

interface DepartmentPerformanceChartProps {
  data: DepartmentPerformanceData[];
}

export function DepartmentPerformanceChart({
  data,
}: DepartmentPerformanceChartProps) {
  return (
    <Card className="lg:col-span-2">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">
          Department Performance
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Leads, tasks & revenue by department
        </p>
      </CardHeader>
      <CardContent>
        <div className="h-[220px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical">
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(var(--border))"
                horizontal={false}
              />
              <XAxis
                type="number"
                stroke="hsl(var(--muted-foreground))"
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                dataKey="name"
                type="category"
                width={80}
                stroke="hsl(var(--muted-foreground))"
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar
                dataKey="leads"
                name="Leads"
                fill={CHART_COLORS[0]}
                radius={[0, 4, 4, 0]}
              />
              <Bar
                dataKey="tasks"
                name="Tasks"
                fill={CHART_COLORS[3]}
                radius={[0, 4, 4, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
