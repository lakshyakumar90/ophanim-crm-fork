"use client";

import { useState } from "react";
import useSWR from "swr";
import { dashboardApi, leadsApi } from "@/lib/api";
import { useAuth } from "@/providers/auth-provider";
import { useDepartment } from "@/providers/department-context";
import {
  StatsCard,
  MiniStatsCard,
  LeadPipelineChart,
  LeadSourceChart,
  AttendanceWidget,
  RecentLeadsList,
  ActivityFeed,
} from "@/components/dashboard";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Target,
  CheckSquare,
  Users,
  TrendingUp,
  Clock,
  AlertTriangle,
  RefreshCw,
  Flame,
  Phone,
  UserCheck,
  Percent,
  ListTodo,
  FileText,
} from "lucide-react";
import { format } from "date-fns";

export default function DashboardPage() {
  const { user } = useAuth();
  const { currentDepartment } = useDepartment();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data, isLoading, error, mutate } = useSWR(
    user ? ["dashboard", currentDepartment?.id || "sales"] : null,
    () => dashboardApi.get(currentDepartment?.id),
  );

  const { data: recentLeadsData } = useSWR(user ? "recent-leads" : null, () =>
    leadsApi
      .list({ limit: 5, sortBy: "updated_at", sortOrder: "desc" }),
  );

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await mutate();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-red-500">Failed to load dashboard data</p>
      </div>
    );
  }

  // Common header for all dashboards
  const DashboardHeader = ({
    title,
    badge,
  }: {
    title: string;
    badge?: string;
  }) => (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold text-foreground">{title}</h1>
        {badge && (
          <Badge className="bg-rose-100 text-rose-700 border-0">{badge}</Badge>
        )}
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={handleRefresh}
        className="border-border"
      >
        <RefreshCw
          className={`w-4 h-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`}
        />
        Refresh
      </Button>
    </div>
  );

  // Render based on user role
  if (user?.role === "admin") {
    return (
      <div className="space-y-6">
        <DashboardHeader title="Dashboard" badge="Admin View" />
        <p className="text-muted-foreground -mt-4">
          Overview of all leads across the organization
        </p>

        {/* Attendance Widget */}
        <AttendanceWidget />

        {/* Main Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Total Leads"
            value={data?.leads?.total || 0}
            icon={Target}
            accentColor="blue"
          />
          <StatsCard
            title="New Leads"
            value={data?.leads?.newThisMonth || 0}
            icon={TrendingUp}
            accentColor="green"
          />
          <StatsCard
            title="Follow Up"
            value={data?.leads?.pipeline?.follow_up || 0}
            icon={Flame}
            accentColor="orange"
          />
          <StatsCard
            title="Customers"
            value={data?.leads?.pipeline?.won || 0}
            icon={UserCheck}
            accentColor="purple"
          />
        </div>

        {/* Mini Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {/* Project Stats - Dynamic mapping */}
          {data?.projects?.slice(0, 3).map((project: any, index: number) => {
            const colors: any[] = [
              "green",
              "purple",
              "slate",
              "blue",
              "orange",
              "rose",
            ];
            return (
              <MiniStatsCard
                key={project.name}
                label={project.name}
                value={project.value}
                color={colors[index % colors.length]}
              />
            );
          })}

          {/* Fallback if no projects, or fill remaining slots */}
          {(!data?.projects || data.projects.length === 0) && (
            <>
              <MiniStatsCard label="Active Projects" value={0} color="green" />
              <MiniStatsCard label="Completed" value={0} color="purple" />
              <MiniStatsCard label="On Hold" value={0} color="slate" />
            </>
          )}

          <MiniStatsCard
            label="Conversion Rate"
            value={`${calculateConversionRate(data)}%`}
            color="blue"
          />
          <MiniStatsCard
            label="Open Tasks"
            value={data?.tasks?.pending || 0}
            color="orange"
          />
          <MiniStatsCard
            label="Overdue Tasks"
            value={data?.tasks?.overdue || 0}
            color="rose"
          />
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <LeadPipelineChart data={data?.leads?.pipeline || {}} />
          <LeadSourceChart data={data?.leads?.sources || {}} />
        </div>

        {/* Activity Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <RecentLeadsList leads={recentLeadsData?.data || []} />
          <ActivityFeed activities={data?.recentActivity || []} />
        </div>

        {/* Performance Summary */}
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="mb-4">
            <h3 className="font-semibold text-foreground">
              Performance Summary
            </h3>
            <p className="text-sm text-muted-foreground">
              Key metrics for the selected period
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-emerald-50 dark:bg-emerald-950 rounded-xl p-4 text-center">
              <TrendingUp className="h-5 w-5 text-emerald-600 dark:text-emerald-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {calculateConversionRate(data)}%
              </p>
              <p className="text-sm text-muted-foreground">Conversion Rate</p>
            </div>
            <div className="bg-blue-50 dark:bg-blue-950 rounded-xl p-4 text-center">
              <UserCheck className="h-5 w-5 text-blue-600 dark:text-blue-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {data?.leads?.pipeline?.customer || 0}
              </p>
              <p className="text-sm text-muted-foreground">
                New Customers
                <span className="block text-xs text-muted-foreground">
                  From {data?.leads?.total || 0} leads
                </span>
              </p>
            </div>
            <div className="bg-orange-50 dark:bg-orange-950 rounded-xl p-4 text-center">
              <Flame className="h-5 w-5 text-orange-600 dark:text-orange-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                {data?.leads?.pipeline?.follow_up || 0}
              </p>
              <p className="text-sm text-muted-foreground">
                Follow Up
                <span className="block text-xs text-muted-foreground">
                  Needs attention
                </span>
              </p>
            </div>
            <div className="bg-rose-50 dark:bg-rose-950 rounded-xl p-4 text-center">
              <AlertTriangle className="h-5 w-5 text-rose-600 dark:text-rose-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-rose-600 dark:text-rose-400">
                {data?.tasks?.overdue || 0}
              </p>
              <p className="text-sm text-muted-foreground">
                Overdue Tasks
                <span className="block text-xs text-muted-foreground">
                  Need attention
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Determine department type
  const isFinance = currentDepartment?.slug === "finance";

  // Manager Dashboard
  if (user?.role === "manager") {
    return (
      <div className="space-y-6">
        <DashboardHeader
          title={`${currentDepartment?.name || "Team"} Dashboard`}
          badge="Manager"
        />
        <p className="text-muted-foreground -mt-4">
          Overview of your team's performance
        </p>

        {/* Attendance Widget */}
        <AttendanceWidget />

        {/* Finance Manager View */}
        {isFinance ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatsCard
                title="Total Revenue"
                value={`$${(data?.revenue?.total || 0).toLocaleString()}`}
                icon={TrendingUp}
                accentColor="green"
              />
              <StatsCard
                title="Pending Expenses"
                value={data?.expenses?.pendingCount || 0}
                icon={AlertTriangle}
                accentColor="orange"
              />
              <StatsCard
                title="Overdue Invoices"
                value={data?.invoices?.overdueCount || 0}
                icon={Clock}
                accentColor="rose"
              />
              <StatsCard
                title="Team Members"
                value={data?.team?.memberCount || 0}
                icon={Users}
                accentColor="blue"
              />
            </div>
            {/* Add Finance specific charts/lists here if available */}
          </>
        ) : (
          /* Sales Manager View */
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatsCard
                title="Team Members"
                value={data?.team?.memberCount || 0}
                icon={Users}
                accentColor="blue"
              />
              <StatsCard
                title="Team Leads"
                value={data?.leads?.total || 0}
                icon={Target}
                accentColor="green"
              />
              <StatsCard
                title="Pending Tasks"
                value={data?.tasks?.pending || 0}
                icon={CheckSquare}
                accentColor="orange"
              />
              <StatsCard
                title="Overdue Tasks"
                value={data?.tasks?.overdue || 0}
                icon={AlertTriangle}
                accentColor="rose"
              />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <LeadPipelineChart data={data?.leads?.pipeline || {}} />
              <RecentLeadsList leads={recentLeadsData?.data || []} />
            </div>
          </>
        )}
      </div>
    );
  }

  // Employee Dashboard
  return (
    <div className="space-y-6">
      <DashboardHeader title="My Dashboard" />
      <p className="text-muted-foreground -mt-4">
        Your personal performance overview
      </p>

      {/* Attendance Widget */}
      <AttendanceWidget />

      {/* Finance Employee View */}
      {isFinance ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="My Expenses"
            value={`$${(data?.summary?.this_month_expenses || 0).toLocaleString()}`}
            icon={TrendingUp}
            accentColor="blue"
          />
          <StatsCard
            title="Pending Approval"
            value={data?.summary?.pending_approvals || 0} // For employees, this logic might need check in backend if it returns 'my pending'
            icon={Clock}
            accentColor="orange"
          />
          <StatsCard
            title="Assigned Tasks"
            value={data?.tasks?.pending || 0} // Tasks endpoint is separate, assuming it's merged or fetched
            icon={CheckSquare}
            accentColor="purple"
          />
          <StatsCard
            title="My Requests"
            value={data?.summary?.total_requests || 0} // Optional placeholder if backend adds it
            icon={FileText}
            accentColor="green"
            description="Total requests this month"
          />
        </div>
      ) : (
        /* Sales Employee View */
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatsCard
              title="My Leads"
              value={data?.leads?.total || 0}
              icon={Target}
              accentColor="blue"
            />
            <StatsCard
              title="Pending Tasks"
              value={data?.tasks?.pending || 0}
              icon={CheckSquare}
              accentColor="orange"
            />
            <StatsCard
              title="Due Today"
              value={data?.tasks?.dueToday || 0}
              icon={Clock}
              accentColor="purple"
            />
            <StatsCard
              title="Overdue"
              value={data?.tasks?.overdue || 0}
              icon={AlertTriangle}
              accentColor="rose"
            />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <LeadPipelineChart data={data?.leads?.pipeline || {}} />
            <RecentLeadsList leads={recentLeadsData?.data || []} />
          </div>
        </>
      )}
    </div>
  );
}

function calculateConversionRate(data: any): string {
  if (!data?.leads?.total || data.leads.total === 0) return "0.0";
  const customers = data.leads.pipeline?.customer || 0;
  return ((customers / data.leads.total) * 100).toFixed(1);
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-9 w-24" />
      </div>
      <Skeleton className="h-20 w-full" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Skeleton className="h-80 lg:col-span-2" />
        <Skeleton className="h-80" />
      </div>
    </div>
  );
}
