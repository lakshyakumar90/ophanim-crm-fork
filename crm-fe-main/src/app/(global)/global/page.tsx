"use client";

import { useState, useCallback } from "react";
import useSWR from "swr";
import { useAuth, useIsAdmin } from "@/providers/auth-provider";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  HighPrioritySection,
  StatsCard,
  LeadTrendChart,
  RevenueTrendChart,
  ProjectStatusChart,
  DepartmentPerformanceChart,
  TopPerformers,
  ActivityFeed,
  LeadPipelineChart,
} from "@/components/dashboard";
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
    return <DashboardSkeleton />;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-red-500">Failed to load dashboard data</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-1">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-foreground">
            Company Overview
          </h1>
          <Badge className="bg-gradient-to-r from-blue-500 to-purple-500 text-white border-0">
            Admin Dashboard
          </Badge>
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

      {/* High Priority Alerts */}
      {data?.highPriority && (
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
            Needs Attention
          </h2>
          <HighPrioritySection data={data.highPriority} />
        </div>
      )}

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
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6 p-1">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-9 w-24" />
      </div>

      {/* High Priority */}
      <div>
        <Skeleton className="h-4 w-32 mb-3" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Skeleton className="h-72" />
        <Skeleton className="h-72" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Skeleton className="h-72" />
        <Skeleton className="h-72 lg:col-span-2" />
      </div>
    </div>
  );
}
