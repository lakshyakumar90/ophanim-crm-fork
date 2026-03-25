"use client";

import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { CompensationHistory } from "@/types/hr.types";
import { formatINRRange, pctChange } from "@/lib/employeeHelpers";

export function CompensationHistoryExpand({
  rows,
  loading,
  canSeeAmounts,
}: {
  rows: CompensationHistory[] | undefined;
  loading: boolean;
  canSeeAmounts: boolean;
}) {
  if (loading) {
    return (
      <div className="space-y-2 py-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
      </div>
    );
  }

  const list = rows || [];
  if (list.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-2">No compensation history recorded yet.</p>
    );
  }

  return (
    <div className="space-y-3 py-2 border-l-2 border-primary/20 pl-3">
      {list.map((ev, idx) => {
        const p = pctChange(ev.previousCtc, ev.newCtc);
        const isLatest = idx === 0;
        return (
          <div
            key={ev.id}
            className="relative text-sm rounded-md border bg-background/80 p-3 shadow-sm"
          >
            {isLatest ? (
              <Badge className="absolute -top-2 right-2 bg-primary text-primary-foreground">Current</Badge>
            ) : null}
            <div className="font-medium text-xs text-muted-foreground mb-1">
              {ev.effectiveDate
                ? format(new Date(ev.effectiveDate), "dd MMM yyyy")
                : "—"}
            </div>
            <div className="font-mono text-sm">
              {formatINRRange(ev.previousCtc, ev.newCtc, canSeeAmounts)}
            </div>
            {p != null && canSeeAmounts ? (
              <div className={p >= 0 ? "text-emerald-600 text-xs" : "text-red-600 text-xs"}>
                {p >= 0 ? "+" : ""}
                {p.toFixed(1)}%
              </div>
            ) : null}
            <div className="flex flex-wrap gap-1 mt-2">
              {ev.changeReason ? (
                <Badge variant="outline" className="text-xs capitalize">
                  {ev.changeReason.replace(/_/g, " ")}
                </Badge>
              ) : null}
            </div>
            {ev.changedByName ? (
              <p className="text-xs text-muted-foreground mt-1">By {ev.changedByName}</p>
            ) : null}
            {ev.notes ? <p className="text-xs text-muted-foreground mt-1">{ev.notes}</p> : null}
          </div>
        );
      })}
    </div>
  );
}
