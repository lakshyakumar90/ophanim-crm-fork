"use client";

import useSWR from "swr";
import { Users, UserCheck, UserPlus, Clock } from "lucide-react";
import { StatsCard } from "@/components/dashboard/stats-card";
import { hrAnalyticsApi } from "@/lib/api";

export function HeadcountCard() {
  const { data, isLoading, error } = useSWR(
    "/hr/analytics/headcount",
    () => hrAnalyticsApi.headcount(),
    { revalidateOnFocus: false },
  );

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 bg-muted rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="h-24 bg-destructive/10 rounded-lg flex items-center justify-center text-xs text-destructive"
          >
            Failed to load
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatsCard
        title="Total Employees"
        value={data?.totalEmployees || 0}
        icon={Users}
        description="All registered employees"
        accentColor="blue"
      />
      <StatsCard
        title="Active Employees"
        value={data?.activeEmployees || 0}
        icon={UserCheck}
        description="Currently active"
        accentColor="green"
      />
      <StatsCard
        title="On Probation"
        value={data?.onProbation || 0}
        icon={UserPlus}
        description="Recently joined"
        accentColor="purple"
      />
      <StatsCard
        title="Department Breakdown"
        value={data?.departmentBreakdown?.length || 0}
        icon={Clock}
        description="Departments with staff"
        accentColor="orange"
      />
    </div>
  );
}
