"use client";

import { useState, useCallback } from "react";
import useSWR, { mutate as globalMutate } from "swr";
import { financeDashboardApi, approvalsApi } from "@/lib/finance-api";
import { useAuth } from "@/providers/auth-provider";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Clock,
  Receipt,
  FileText,
  RefreshCw,
  IndianRupee,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import Link from "next/link";
import { useHeaderRefresh } from "@/hooks/layout/useHeaderRefresh";

export default function FinanceDashboardPage() {
  const { user } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data, isLoading, error, mutate } = useSWR(
    user ? "finance-dashboard" : null,
    () => financeDashboardApi.get(),
  );

  const { data: recentActivity } = useSWR(
    user ? "finance-activity" : null,
    () =>
      financeDashboardApi
        .getActivity(undefined, 8),
  );

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await Promise.all([mutate(), globalMutate("finance-activity")]);
    setTimeout(() => setIsRefreshing(false), 500);
  }, [mutate]);

  useHeaderRefresh({
    onRefresh: handleRefresh,
    isRefreshing,
  });

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-red-500">Failed to load finance dashboard</p>
      </div>
    );
  }

  const summary = data?.summary || {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Wallet className="h-6 w-6 text-primary" />
            Finance Dashboard
          </h1>
          <p className="text-muted-foreground">
            Overview of revenue, expenses, and pending approvals
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh}>
          <RefreshCw
            className={`w-4 h-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Revenue"
          value={formatCurrency(summary.total_revenue || 0)}
          icon={TrendingUp}
          trend={{ label: "All time", isPositive: true }}
          color="emerald"
        />
        <StatCard
          title="Outstanding"
          value={formatCurrency(summary.outstanding_amount || 0)}
          icon={Clock}
          trend={{
            label: `${summary.overdue_invoices || 0} overdue`,
            isPositive: false,
          }}
          color="amber"
        />
        <StatCard
          title="This Month Expenses"
          value={formatCurrency(summary.this_month_expenses || 0)}
          icon={Receipt}
          color="rose"
        />
        <StatCard
          title="Net Balance"
          value={formatCurrency(summary.net_balance || 0)}
          icon={Wallet}
          trend={{
            label: "Revenue - Expenses",
            isPositive: (summary.net_balance || 0) >= 0,
          }}
          color="blue"
        />
      </div>

      {/* Pending Approvals Alert */}
      {(summary.pending_approvals || 0) > 0 && (
        <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
          <CardContent className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 dark:bg-amber-900 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="font-medium text-amber-800 dark:text-amber-200">
                  {summary.pending_approvals} pending approval
                  {summary.pending_approvals > 1 ? "s" : ""}
                </p>
                <p className="text-sm text-amber-600 dark:text-amber-400">
                  Invoices, expenses, or emails awaiting your review
                </p>
              </div>
            </div>
            <Link href="/finance/approvals">
              <Button variant="outline" size="sm" className="border-amber-300">
                Review Now
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Overdue Invoices Alert */}
      {(summary.overdue_invoices || 0) > 0 && (
        <Card className="border-rose-200 bg-rose-50 dark:bg-rose-950/20 dark:border-rose-800">
          <CardContent className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-rose-100 dark:bg-rose-900 rounded-lg">
                <FileText className="h-5 w-5 text-rose-600 dark:text-rose-400" />
              </div>
              <div>
                <p className="font-medium text-rose-800 dark:text-rose-200">
                  {summary.overdue_invoices} overdue invoice
                  {summary.overdue_invoices > 1 ? "s" : ""}
                </p>
                <p className="text-sm text-rose-600 dark:text-rose-400">
                  Total overdue: {formatCurrency(summary.overdue_amount || 0)}
                </p>
              </div>
            </div>
            <Link href="/finance/invoices?status=overdue">
              <Button variant="outline" size="sm" className="border-rose-300">
                View Overdue
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Expense Breakdown & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Expense Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium">
              Expense Breakdown (This Month)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {Object.entries(data?.expense_breakdown || {}).length > 0 ? (
              <div className="space-y-3">
                {Object.entries(data?.expense_breakdown || {}).map(
                  ([category, amount]) => (
                    <div
                      key={category}
                      className="flex items-center justify-between"
                    >
                      <span className="text-sm text-muted-foreground">
                        {category}
                      </span>
                      <span className="font-medium">
                        {formatCurrency(amount as number)}
                      </span>
                    </div>
                  ),
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No expenses this month
              </p>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base font-medium">
              Recent Activity
            </CardTitle>
            <Link href="/finance/invoices">
              <Button variant="ghost" size="sm">
                View All
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {recentActivity && recentActivity.length > 0 ? (
              <div className="space-y-3">
                {recentActivity.map((activity: any, index: number) => (
                  <div
                    key={index}
                    className="flex items-start gap-3 text-sm border-b border-border pb-2 last:border-0 last:pb-0"
                  >
                    <div
                      className={`p-1.5 rounded-md ${
                        activity.type === "invoice"
                          ? "bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400"
                          : activity.type === "payment"
                            ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900 dark:text-emerald-400"
                            : "bg-rose-100 text-rose-600 dark:bg-rose-900 dark:text-rose-400"
                      }`}
                    >
                      {activity.type === "invoice" ? (
                        <FileText className="h-3.5 w-3.5" />
                      ) : activity.type === "payment" ? (
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      ) : (
                        <ArrowDownRight className="h-3.5 w-3.5" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-foreground truncate">
                        {activity.description}
                      </p>
                      {activity.amount && (
                        <p className="text-muted-foreground text-xs">
                          {formatCurrency(activity.amount)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No recent activity
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Link href="/finance/invoices/new">
              <Button
                variant="outline"
                className="w-full h-auto py-4 flex flex-col gap-2"
              >
                <FileText className="h-5 w-5" />
                <span>New Invoice</span>
              </Button>
            </Link>
            <Link href="/finance/expenses/new">
              <Button
                variant="outline"
                className="w-full h-auto py-4 flex flex-col gap-2"
              >
                <Receipt className="h-5 w-5" />
                <span>Submit Expense</span>
              </Button>
            </Link>
            <Link href="/finance/approvals">
              <Button
                variant="outline"
                className="w-full h-auto py-4 flex flex-col gap-2"
              >
                <Clock className="h-5 w-5" />
                <span>Approvals</span>
                {(summary.pending_approvals || 0) > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {summary.pending_approvals}
                  </Badge>
                )}
              </Button>
            </Link>
            <Link href="/finance/invoices">
              <Button
                variant="outline"
                className="w-full h-auto py-4 flex flex-col gap-2"
              >
                <Wallet className="h-5 w-5" />
                <span>All Invoices</span>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
  trend,
  color,
}: {
  title: string;
  value: string;
  icon: React.ElementType;
  trend?: { label: string; isPositive: boolean };
  color: "emerald" | "amber" | "rose" | "blue";
}) {
  const colorClasses = {
    emerald:
      "bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400",
    amber: "bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400",
    rose: "bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-400",
    blue: "bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400",
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            {trend && (
              <p
                className={`text-xs mt-1 ${
                  trend.isPositive ? "text-emerald-600" : "text-rose-600"
                }`}
              >
                {trend.label}
              </p>
            )}
          </div>
          <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-9 w-24" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
    </div>
  );
}
