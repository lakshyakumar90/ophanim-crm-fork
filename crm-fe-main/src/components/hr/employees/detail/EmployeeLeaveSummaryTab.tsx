"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchLeaveBalances, fetchLeaveRequests } from "@/lib/hr-leave-api";
import type { LeaveBalanceDto, LeaveRequestDto } from "@/types/hr-leaves";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export function EmployeeLeaveSummaryTab({
  userId,
  employeeName,
  active,
}: {
  userId: string;
  employeeName: string;
  active: boolean;
}) {
  const [balances, setBalances] = useState<LeaveBalanceDto[] | null>(null);
  const [recent, setRecent] = useState<LeaveRequestDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setLoaded(false);
    setBalances(null);
    setRecent([]);
  }, [userId]);

  useEffect(() => {
    if (!active || loaded) return;
    setLoading(true);
    void Promise.all([
      fetchLeaveBalances(userId).catch(() => [] as LeaveBalanceDto[]),
      fetchLeaveRequests({ userId }).catch(() => [] as LeaveRequestDto[]),
    ])
      .then(([b, all]) => {
        setBalances(b);
        const sorted = [...all].sort(
          (a, c) => new Date(c.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
        setRecent(sorted.slice(0, 5));
        setLoaded(true);
      })
      .finally(() => setLoading(false));
  }, [active, userId, loaded]);

  if (loading && !loaded) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  if (!balances?.length && !recent.length) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">No leave data available.</p>
        <Link href="/hr/leaves" className="text-sm text-primary underline">
          Open leave module
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold mb-3">Balances</h3>
        <div className="space-y-3">
          {(balances || []).map((b) => {
            const total = b.totalDays || 0;
            const used = b.usedDays || 0;
            const rem = b.remainingDays ?? Math.max(0, total - used);
            const pct = total > 0 ? Math.min(100, (used / total) * 100) : 0;
            return (
              <div key={b.id} className="rounded-lg border p-3">
                <div className="flex justify-between text-sm mb-1">
                  <span>{b.leaveTypeName || "Leave"}</span>
                  <span className="text-muted-foreground">
                    {used} used · {rem} left
                  </span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full",
                      rem / (total || 1) > 0.5 ? "bg-emerald-500" : "bg-amber-500",
                    )}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div>
        <h3 className="text-sm font-semibold mb-2">Recent requests</h3>
        {recent.length === 0 ? (
          <p className="text-sm text-muted-foreground">No requests yet.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {recent.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-2 border rounded-md p-2">
                <span>
                  {format(new Date(r.startDate), "dd MMM")} – {format(new Date(r.endDate), "dd MMM yyyy")}
                </span>
                <Badge variant="secondary">{r.leaveTypeName || "Leave"}</Badge>
                <Badge variant="outline">{r.status}</Badge>
              </li>
            ))}
          </ul>
        )}
      </div>
      <Link href="/hr/leaves" className="text-sm text-primary underline inline-block">
        View full leave history for {employeeName}
      </Link>
    </div>
  );
}
