"use client";

import { useState, useCallback } from "react";
import useSWR, { mutate as globalMutate } from "swr";
import { financeDashboardApi } from "@/lib/finance-api";
import { useAuth } from "@/providers/auth-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  StatsCard,
  DashboardPageHeader,
  DashboardSkeleton,
} from "@/components/dashboard";
import { PageShell } from "@/components/shared/page-shell";
import { formatCurrency } from "@/lib/invoice-line-item-math";
import {
  Wallet,
  TrendingUp,
  AlertTriangle,
  Clock,
  Receipt,
  FileText,
  RefreshCw,
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
    return (
      <PageShell variant="canvas">
        <DashboardSkeleton />
      </PageShell>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-red-500">Failed to load finance dashboard</p>
      </div>
    );
  }

  const summary = data?.summary || {};
  const byCurrency = (summary.by_currency || {}) as Record<string, number>;
  const currencyKeys = Object.keys(byCurrency);
  const primaryCurrency = (
    currencyKeys.length === 1
      ? currencyKeys[0]
      : currencyKeys.includes("USD")
        ? "USD"
        : summary.base_currency || "INR"
  ) as "USD" | "CAD" | "GBP" | "EUR" | "INR";
  const baseCurrency = (summary.base_currency || "INR") as
    | "USD"
    | "CAD"
    | "GBP"
    | "EUR"
    | "INR";
  const displayCurrency = currencyKeys.length > 0 ? primaryCurrency : baseCurrency;
  const displayRevenue =
    currencyKeys.length > 0 ? byCurrency[displayCurrency] ?? summary.total_revenue : summary.total_revenue;
  const currencyNote =
    currencyKeys.length > 1
      ? `Totals shown in ${displayCurrency}; also: ${currencyKeys.filter((c) => c !== displayCurrency).join(", ")}`
      : currencyKeys.length === 1
        ? `All amounts in ${displayCurrency}`
        : undefined;

  return (
    <PageShell variant="canvas">
      <DashboardPageHeader
        title="Finance Dashboard"
        description="Overview of revenue, expenses, and pending approvals"
        icon={<Wallet className="h-6 w-6 text-primary" />}
        actions={
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw
              className={`w-4 h-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        <StatsCard
          title="Total Revenue"
          value={formatCurrency(displayRevenue || 0, displayCurrency)}
          icon={TrendingUp}
          description={currencyNote || "All time"}
          accentColor="emerald"
        />
        <StatsCard
          title="Outstanding"
          value={formatCurrency(summary.outstanding_amount || 0, displayCurrency)}
          icon={Clock}
          description={`${summary.overdue_invoices || 0} overdue`}
          accentColor="amber"
        />
        <StatsCard
          title="This Month Expenses"
          value={formatCurrency(summary.this_month_expenses || 0, displayCurrency)}
          icon={Receipt}
          accentColor="rose"
        />
        <StatsCard
          title="Net Balance"
          value={formatCurrency(summary.net_balance || 0, displayCurrency)}
          icon={Wallet}
          description="Revenue - Expenses"
          accentColor="blue"
        />
      </div>

      {/* Pending Approvals Alert */}
      {(summary.pending_approvals || 0) > 0 && (
        <Card className="border-border bg-muted/50">
          <CardContent className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-muted rounded-lg">
                <AlertTriangle className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium text-foreground">
                  {summary.pending_approvals} pending approval
                  {summary.pending_approvals > 1 ? "s" : ""}
                </p>
                <p className="text-sm text-muted-foreground">
                  Invoices, expenses, or emails awaiting your review
                </p>
              </div>
            </div>
            <Link href="/finance/approvals">
              <Button variant="outline" size="sm">
                Review Now
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Overdue Invoices Alert */}
      {(summary.overdue_invoices || 0) > 0 && (
        <Card className="border-destructive/50 bg-destructive/10">
          <CardContent className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-destructive/10 rounded-lg">
                <FileText className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="font-medium text-destructive">
                  {summary.overdue_invoices} overdue invoice
                  {summary.overdue_invoices > 1 ? "s" : ""}
                </p>
                <p className="text-sm text-muted-foreground">
                  Total overdue: {formatCurrency(summary.overdue_amount || 0, displayCurrency)}
                </p>
              </div>
            </div>
            <Link href="/finance/invoices?status=overdue">
              <Button variant="outline" size="sm">
                View Overdue
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Expense Breakdown & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
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
                        {formatCurrency(amount as number, displayCurrency)}
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
                          {formatCurrency(
                            activity.amount,
                            (activity.currency || displayCurrency) as typeof displayCurrency,
                          )}
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
            <Link href="/finance/expenses?create=1">
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
    </PageShell>
  );
}
