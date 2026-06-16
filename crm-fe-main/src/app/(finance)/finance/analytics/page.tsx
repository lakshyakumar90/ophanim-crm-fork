"use client";

import { useAuth } from "@/providers/auth-provider";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import useSWR from "swr";
import { financeAnalyticsApi } from "@/lib/finance-api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import { useHeaderRefresh } from "@/hooks/layout/useHeaderRefresh";

const COLORS = [
  "#10b981",
  "#3b82f6",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
];

const STATUS_COLORS: Record<string, string> = {
  draft: "#94a3b8",
  pending_approval: "#f59e0b",
  sent: "#3b82f6",
  paid: "#10b981",
  overdue: "#ef4444",
  cancelled: "#6b7280",
};

import { formatCurrency } from "@/lib/invoice-line-item-math";

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

      {/* Revenue Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-emerald-500" />
            Revenue vs Expenses (12 Months)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {revenueTrend && revenueTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={revenueTrend}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient
                    id="colorExpenses"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="month"
                  tickFormatter={formatMonth}
                  className="text-xs"
                />
                <YAxis tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(value: number | undefined) =>
                    formatCurrency(value || 0, baseCurrency)
                  }
                  labelFormatter={(label) =>
                    new Date(label + "-01").toLocaleDateString("en-IN", {
                      month: "long",
                      year: "numeric",
                    })
                  }
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#10b981"
                  fillOpacity={1}
                  fill="url(#colorRevenue)"
                  name="Revenue"
                />
                <Area
                  type="monotone"
                  dataKey="expenses"
                  stroke="#ef4444"
                  fillOpacity={1}
                  fill="url(#colorExpenses)"
                  name="Expenses"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              No revenue data available
            </p>
          )}
        </CardContent>
      </Card>

      {/* Invoice Status & Outstanding Clients */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Invoice Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <PieChartIcon className="h-4 w-4 text-blue-500" />
              Invoice Status Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            {invoiceStatus && invoiceStatus.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={invoiceStatus}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                    nameKey="status"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {invoiceStatus.map(
                      (entry: { status: string }, index: number) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={
                            STATUS_COLORS[entry.status] ||
                            COLORS[index % COLORS.length]
                          }
                        />
                      ),
                    )}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                No invoice data available
              </p>
            )}
          </CardContent>
        </Card>

        {/* Top Outstanding Clients */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Users className="h-4 w-4 text-amber-500" />
              Top Outstanding Clients
            </CardTitle>
          </CardHeader>
          <CardContent>
            {outstandingClients && outstandingClients.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={outstandingClients} layout="vertical">
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-muted"
                  />
                  <XAxis
                    type="number"
                    tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                  />
                  <YAxis
                    type="category"
                    dataKey="client"
                    width={100}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip
                    formatter={(value: number | undefined) =>
                      formatCurrency(value || 0, baseCurrency)
                    }
                  />
                  <Bar
                    dataKey="outstanding"
                    fill="#f59e0b"
                    name="Outstanding"
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                No outstanding amounts
              </p>
            )}
          </CardContent>
        </Card>
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
