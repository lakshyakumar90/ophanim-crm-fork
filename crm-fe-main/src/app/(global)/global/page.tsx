"use client";

import { useState, useCallback } from "react";
import useSWR from "swr";
import { useAuth, useIsAdmin } from "@/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  HighPrioritySection,
  StatsCard,
  LeadTrendChart,
  RevenueTrendChart,
  ProjectStatusChart,
  DepartmentPerformanceChart,
  TopPerformers,
  LeadPipelineChart,
  DashboardPageHeader,
  DashboardSkeleton,
} from "@/components/dashboard";
import { PageShell } from "@/components/shared/page-shell";
import {
  RefreshCw,
  Target,
  TrendingUp,
  FolderKanban,
  Users,
  Percent,
  DollarSign,
} from "lucide-react";
import { TodayReminders } from "@/components/dashboard/today-reminders";
import { useHeaderRefresh } from "@/hooks/layout/useHeaderRefresh";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1";

async function fetchEnhancedDashboard() {
  const token = localStorage.getItem("crm_access_token");
  const res = await fetch(`${API_URL}/dashboard/enhanced`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to fetch dashboard");
  const data = await res.json();
  return data.data;
}

export default function GlobalDashboardPage() {
  const { user } = useAuth();
  const isAdmin = useIsAdmin();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data, isLoading, error, mutate } = useSWR(
    user && isAdmin ? "enhanced-dashboard" : null,
    fetchEnhancedDashboard,
  );

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await mutate();
    setTimeout(() => setIsRefreshing(false), 500);
  }, [mutate]);

  useHeaderRefresh({
    onRefresh: handleRefresh,
    isRefreshing,
    enabled: Boolean(user && isAdmin),
  });

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">
          Admin access required for this dashboard
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <PageShell>
        <DashboardSkeleton kpiCount={6} chartRows={2} />
      </PageShell>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-red-500">Failed to load dashboard data</p>
      </div>
    );
  }

  return (
    <PageShell>
      <DashboardPageHeader
        title="Company Overview"
        actions={
          <>
            <Badge className="bg-gradient-to-r from-blue-500 to-purple-500 text-white border-0">
              Admin Dashboard
            </Badge>
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
          </>
        }
      />

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6 gap-4">
        <StatsCard
          title="Total Leads"
          value={data?.leads?.total || 0}
          icon={Target}
          accentColor="blue"
        />
        <StatsCard
          title="Won This Month"
          value={data?.leads?.wonThisMonth || 0}
          icon={TrendingUp}
          accentColor="green"
        />
        <StatsCard
          title="Active Projects"
          value={data?.activeProjects || 0}
          icon={FolderKanban}
          accentColor="violet"
        />
        <StatsCard
          title="Team Members"
          value={data?.users?.active || 0}
          icon={Users}
          accentColor="cyan"
        />
        <StatsCard
          title="Attendance Rate"
          value={`${data?.attendanceRate || 0}%`}
          icon={Percent}
          accentColor="amber"
        />
        <StatsCard
          title="Monthly Revenue"
          value={`₹${((data?.revenue?.thisMonth || 0) / 1000).toFixed(0)}k`}
          icon={DollarSign}
          accentColor="emerald"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          {/* High Priority Alerts */}
          {data?.highPriority && (
            <div className="mb-6">
              <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
                Needs Attention
              </h2>
              <HighPrioritySection data={data.highPriority} />
            </div>
          )}
        </div>
        <div className="md:col-span-1">
          <TodayReminders />
        </div>
      </div>

      {/* Trend Charts Row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <LeadTrendChart data={data?.trends?.leads || []} />
        <RevenueTrendChart data={data?.trends?.revenue || []} />
      </div>

      {/* Charts and Performance Row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <ProjectStatusChart data={data?.charts?.projectStatus || []} />
        <DepartmentPerformanceChart
          data={data?.charts?.departmentPerformance || []}
        />
      </div>

      {/* Bottom Row - Pipeline + Activity + Performers */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <LeadPipelineChart data={data?.leads?.pipeline || {}} />
        <TopPerformers performers={data?.topPerformers || []} />
      </div>
    </PageShell>
  );
}
