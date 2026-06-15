"use client";

import useSWR from "swr";
import { Briefcase } from "lucide-react";
import { hrAnalyticsApi } from "@/lib/api";

export function RecruitmentCard() {
  const { data, isLoading, error } = useSWR(
    "/hr/analytics/recruitment",
    () => hrAnalyticsApi.recruitment(),
    { revalidateOnFocus: false },
  );

  if (isLoading || error) {
    return (
      <div className="rounded-xl border border-slate-200 bg-muted/30 p-4 animate-pulse min-h-38" />
    );
  }

  return (
    <div className="group rounded-xl border border-slate-200 bg-white p-4 min-h-38 transition-colors hover:bg-slate-50 hover:border-blue-200">
      <div className="mb-3 flex items-center justify-between">
        <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center transition-colors group-hover:bg-blue-600 group-hover:text-white">
          <Briefcase className="w-5 h-5" />
        </div>
        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          Recruitment
        </span>
      </div>
      <p className="text-2xl font-bold text-slate-900">
        {data?.totalOpenPositions || 0}
      </p>
      <p className="text-sm font-medium text-slate-700">Open Positions</p>
      <p className="mt-1 text-xs text-muted-foreground">
        {data?.totalCandidatesInPipeline || 0} candidates in pipeline
      </p>
    </div>
  );
}
