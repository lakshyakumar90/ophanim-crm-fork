"use client";

import useSWR from "swr";
import { Receipt } from "lucide-react";
import { hrAnalyticsApi } from "@/lib/api";

export function PayrollCard() {
  const { data, isLoading, error } = useSWR(
    "/hr/analytics/payroll",
    () => hrAnalyticsApi.payroll(),
    { revalidateOnFocus: false },
  );

  if (isLoading || error) {
    return (
      <div className="rounded-xl border border-slate-200 bg-muted/30 p-4 animate-pulse min-h-38" />
    );
  }

  const statusColor =
    data?.currentMonthStatus === "disbursed"
      ? "text-green-600"
      : data?.currentMonthStatus === "approved"
        ? "text-blue-600"
        : "text-amber-600";

  return (
    <div className="group rounded-xl border border-slate-200 bg-white p-4 min-h-38 transition-colors hover:bg-slate-50 hover:border-green-200">
      <div className="mb-3 flex items-center justify-between">
        <div className="w-10 h-10 rounded-full bg-green-100 text-green-600 flex items-center justify-center transition-colors group-hover:bg-green-600 group-hover:text-white">
          <Receipt className="w-5 h-5" />
        </div>
        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          Payroll
        </span>
      </div>
      <p className="text-2xl font-bold text-slate-900">
        {data?.pendingApprovals || 0}
      </p>
      <p className="text-sm font-medium text-slate-700">Pending Approvals</p>
      <p className={`text-sm font-medium capitalize ${statusColor}`}>
        {(data?.currentMonthStatus || "not_initiated").replace(/_/g, " ")}
      </p>
    </div>
  );
}
