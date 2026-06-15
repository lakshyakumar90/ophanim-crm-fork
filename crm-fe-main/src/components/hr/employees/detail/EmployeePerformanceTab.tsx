"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePermission } from "@/hooks/auth/usePermission";
import { fetchPerformanceCycles, fetchCycleReviews } from "@/lib/performance-api";
import type { PerformanceReviewRow } from "@/types/performance";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export function EmployeePerformanceTab({
  employeeId,
  active,
}: {
  employeeId: string;
  active: boolean;
}) {
  const canPerf =
    usePermission("performance:view") ||
    usePermission("performance:manage") ||
    usePermission("performance:review");

  const [rows, setRows] = useState<PerformanceReviewRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setLoaded(false);
    setRows([]);
  }, [employeeId]);

  useEffect(() => {
    if (!active || !canPerf || loaded) return;
    setLoading(true);
    void (async () => {
      try {
        const cycles = await fetchPerformanceCycles();
        const all: PerformanceReviewRow[] = [];
        for (const c of cycles) {
          try {
            const revs = await fetchCycleReviews(c.id);
            for (const r of revs) {
              const rid = r.employee_id || (r as { employeeId?: string }).employeeId;
              if (rid === employeeId) all.push(r);
            }
          } catch {
            /* skip cycle */
          }
        }
        all.sort(
          (a, b) =>
            new Date(b.updated_at || b.created_at || 0).getTime() -
            new Date(a.updated_at || a.created_at || 0).getTime(),
        );
        setRows(all.slice(0, 12));
      } catch {
        setRows([]);
      } finally {
        setLoaded(true);
        setLoading(false);
      }
    })();
  }, [active, canPerf, employeeId, loaded]);

  if (!canPerf) {
    return (
      <p className="text-sm text-muted-foreground">
        Performance data requires <code className="text-xs">performance:view</code> (or manage / review).
      </p>
    );
  }

  if (loading && !loaded) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">No performance reviews found for this employee.</p>
        <Link href="/hr/performance" className="text-sm text-primary underline">
          Open performance module
        </Link>
      </div>
    );
  }

  const pip = rows.find((r) => r.pip_triggered);

  return (
    <div className="space-y-4">
      {pip ? (
        <div className="rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950/30 p-3 text-sm text-amber-900 dark:text-amber-100">
          Currently on PIP (performance improvement plan) for at least one review cycle.
        </div>
      ) : null}
      <ul className="space-y-2 text-sm">
        {rows.slice(0, 3).map((r) => (
          <li key={r.id} className="border rounded-md p-3 space-y-1">
            <div className="font-medium">{r.cycle?.name || "Review cycle"}</div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">{r.status}</Badge>
              {r.status === "released" && r.calibrated_rating ? (
                <Badge>{String(r.calibrated_rating)}</Badge>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
      <Link href="/hr/performance" className="text-sm text-primary underline">
        View full performance history
      </Link>
    </div>
  );
}
