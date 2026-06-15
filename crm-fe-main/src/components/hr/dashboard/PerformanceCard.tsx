"use client";

import useSWR from "swr";
import { Target } from "lucide-react";
import { hrAnalyticsApi } from "@/lib/api";

export function PerformanceCard() {
  const { data, isLoading, error } = useSWR(
    "/hr/analytics/performance",
    () => hrAnalyticsApi.performance(),
    { revalidateOnFocus: false },
  );

  if (isLoading || error) {
    return (
      <div className="rounded-xl border border-slate-200 bg-muted/30 p-4 animate-pulse min-h-38" />
    );
  }

  return (
    <div className="group rounded-xl border border-slate-200 bg-white p-4 min-h-38 transition-colors hover:bg-slate-50 hover:border-purple-200">
      <div className="mb-3 flex items-center justify-between">
        <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center transition-colors group-hover:bg-purple-600 group-hover:text-white">
          <Target className="w-5 h-5" />
        </div>
        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          Performance
        </span>
      </div>
      <p className="text-2xl font-bold text-slate-900">
        {data?.activeReviewCycles || 0}
      </p>
      <p className="text-sm font-medium text-slate-700">Active Cycles</p>
      <p className="mt-1 text-xs text-muted-foreground">
        {data?.pendingManagerReviews || 0} Pending Reviews
      </p>
    </div>
  );
}
