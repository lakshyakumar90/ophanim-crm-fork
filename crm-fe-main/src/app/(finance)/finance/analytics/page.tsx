"use client";

import { useAuth } from "@/providers/auth-provider";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import useSWR from "swr";
import { financeAnalyticsApi } from "@/lib/finance-api";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart3,
  TrendingUp,
  PieChart as PieChartIcon,
  Users,
  RefreshCw,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
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
import { useHeaderRefresh } from "@/hooks/layout/useHeaderRefresh";
import { formatCurrency, formatCompactCurrency } from "@/lib/invoice-line-item-math";

const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
] as const;

const revenueTrendConfig = buildChartConfig({
  revenue: { label: "Revenue", colorIndex: 1 },
  expenses: { label: "Expenses", colorIndex: 4 },
});

const outstandingConfig = buildChartConfig({
  outstanding: { label: "Outstanding", colorIndex: 2 },
});

function formatMonth(month: string): string {
  const date = new Date(month + "-01");
  return date.toLocaleDateString("en-IN", { month: "short" });
}

export default function FinanceAnalyticsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Redirect employees
  useEffect(() => {
    if (user && user.role === "employee") {
      router.replace("/finance");
    }
  }, [user, router]);

  const { data, isLoading, error, mutate } = useSWR(
    user && user.role !== "employee" ? "finance-analytics" : null,
    () => financeAnalyticsApi.get(),
  );

  const baseCurrency = ((data as any)?.base_currency || "INR") as
    | "USD"
    | "CAD"
    | "GBP"
    | "EUR"
    | "INR";

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await mutate();
    setTimeout(() => setIsRefreshing(false), 500);
  }, [mutate]);

  useHeaderRefresh({
    onRefresh: handleRefresh,
    isRefreshing,
    enabled: Boolean(user && user.role !== "employee"),
  });

  if (!user || user.role === "employee") {
    return null;
  }

  if (isLoading) {
    return <AnalyticsSkeleton />;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-red-500">Failed to load analytics data</p>
      </div>
    );
  }

  const { revenueTrend, invoiceStatus, outstandingClients } = data || {};

  const invoiceStatusChartData = (invoiceStatus || []).map(
    (entry: { status: string; count: number }, index: number) => ({
      ...entry,
      fill: CHART_COLORS[index % CHART_COLORS.length],
    }),
  );

  const invoiceStatusConfig = buildChartConfig(
    Object.fromEntries(
      invoiceStatusChartData.map((d: { status: string }) => [d.status, { label: d.status }]),
    ),
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" />
            Finance Analytics
          </h1>
          <p className="text-muted-foreground">
            Revenue trends, invoice insights, and expense analysis
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh}>
          <RefreshCw
            className={`w-4 h-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      <ChartCard
        title={
          <span className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-emerald-500" />
            Revenue vs Expenses (12 Months)
          </span>
        }
        height={280}
      >
        {revenueTrend && revenueTrend.length > 0 ? (
          <ChartContainer config={revenueTrendConfig} className="h-full w-full">
            <AreaChart data={revenueTrend} margin={{ left: 0, right: 8 }}>
              <CartesianGrid {...chartGridProps} />
              <XAxis
                dataKey="month"
                tickFormatter={formatMonth}
                {...chartAxisProps}
              />
              <YAxis
                {...chartAxisProps}
                width={40}
                tickFormatter={(v) => formatCompactCurrency(Number(v), baseCurrency)}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    labelFormatter={(label) =>
                      new Date(String(label) + "-01").toLocaleDateString("en-IN", {
                        month: "long",
                        year: "numeric",
                      })
                    }
                    formatter={(value) => formatCurrency(Number(value ?? 0), baseCurrency)}
                  />
                }
              />
              <ChartLegend content={<ChartLegendContent />} />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="var(--color-revenue)"
                fill="var(--color-revenue)"
                fillOpacity={0.15}
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="expenses"
                stroke="var(--color-expenses)"
                fill="var(--color-expenses)"
                fillOpacity={0.15}
                strokeWidth={2}
              />
            </AreaChart>
          </ChartContainer>
        ) : (
          <p className="px-(--card-spacing) text-sm text-muted-foreground text-center py-8">
            No revenue data available
          </p>
        )}
      </ChartCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard
          title={
            <span className="flex items-center gap-2">
              <PieChartIcon className="h-4 w-4 text-blue-500" />
              Invoice Status Distribution
            </span>
          }
          height={280}
        >
          {invoiceStatusChartData.length > 0 ? (
            <ChartContainer config={invoiceStatusConfig} className="h-full w-full">
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                <Pie
                  data={invoiceStatusChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={90}
                  dataKey="count"
                  nameKey="status"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {invoiceStatusChartData.map(
                    (entry: { fill: string }, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ),
                  )}
                </Pie>
                <ChartLegend content={<ChartLegendContent nameKey="status" />} />
              </PieChart>
            </ChartContainer>
          ) : (
            <p className="px-(--card-spacing) text-sm text-muted-foreground text-center py-8">
              No invoice data available
            </p>
          )}
        </ChartCard>

        <ChartCard
          title={
            <span className="flex items-center gap-2">
              <Users className="h-4 w-4 text-amber-500" />
              Top Outstanding Clients
            </span>
          }
          height={280}
        >
          {outstandingClients && outstandingClients.length > 0 ? (
            <ChartContainer config={outstandingConfig} className="h-full w-full">
              <BarChart data={outstandingClients} layout="vertical" margin={{ left: 0, right: 8 }}>
                <CartesianGrid {...chartGridProps} horizontal={false} vertical />
                <XAxis
                  type="number"
                  {...chartAxisProps}
                  tickFormatter={(v) => formatCompactCurrency(Number(v), baseCurrency)}
                />
                <YAxis
                  type="category"
                  dataKey="client"
                  width={100}
                  {...chartAxisProps}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value) => formatCurrency(Number(value ?? 0), baseCurrency)}
                    />
                  }
                />
                <Bar
                  dataKey="outstanding"
                  fill="var(--color-outstanding)"
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ChartContainer>
          ) : (
            <p className="px-(--card-spacing) text-sm text-muted-foreground text-center py-8">
              No outstanding amounts
            </p>
          )}
        </ChartCard>
      </div>
    </div>
  );
}

function AnalyticsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-9 w-24" />
      </div>
      <Skeleton className="h-80" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Skeleton className="h-72" />
        <Skeleton className="h-72" />
      </div>
    </div>
  );
}
