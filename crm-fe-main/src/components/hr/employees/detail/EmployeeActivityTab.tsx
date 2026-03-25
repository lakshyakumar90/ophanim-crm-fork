"use client";

import { useEffect, useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { fetchEmployeeCompensationHistory } from "@/lib/hr-employee-api";
import { formatINRRange } from "@/lib/employeeHelpers";
import { Skeleton } from "@/components/ui/skeleton";

type ActivityItem = {
  id: string;
  at: string;
  label: string;
  tone: "default" | "money";
};

export function EmployeeActivityTab({
  employeeId,
  canFetchComp,
  canSeeCTC,
  active,
}: {
  employeeId: string;
  canFetchComp: boolean;
  canSeeCTC: boolean;
  active: boolean;
}) {
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<ActivityItem[]>([]);

  useEffect(() => {
    setLoaded(false);
    setItems([]);
  }, [employeeId]);

  useEffect(() => {
    if (!active || loaded) return;
    if (!canFetchComp) {
      setLoaded(true);
      return;
    }
    setLoading(true);
    void fetchEmployeeCompensationHistory(employeeId)
      .then((hist) => {
        const mapped: ActivityItem[] = hist.map((h) => ({
          id: h.id,
          at: h.effectiveDate || h.createdAt,
          label: `Compensation updated: ${formatINRRange(h.previousCtc, h.newCtc, canSeeCTC)}${
            h.changedByName ? ` (${h.changedByName})` : ""
          }`,
          tone: "money",
        }));
        setItems(mapped.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()));
        setLoaded(true);
      })
      .catch(() => setLoaded(true))
      .finally(() => setLoading(false));
  }, [active, canFetchComp, canSeeCTC, employeeId, loaded]);

  const empty = useMemo(() => items.length === 0, [items]);

  if (loading && !loaded) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (!canFetchComp) {
    return (
      <p className="text-sm text-muted-foreground">
        Activity feed uses compensation history when available. Grant compensation view to see entries.
      </p>
    );
  }

  if (empty) {
    return (
      <p className="text-sm text-muted-foreground">
        No activity yet. Additional sources (leave, onboarding) can be wired when APIs expose per-employee feeds.
      </p>
    );
  }

  return (
    <ul className="space-y-3 text-sm">
      {items.map((it) => (
        <li key={it.id} className="flex gap-3 border-b pb-2">
          <div
            className={`mt-0.5 h-8 w-8 rounded-full shrink-0 flex items-center justify-center text-xs font-bold ${
              it.tone === "money" ? "bg-emerald-100 text-emerald-800" : "bg-muted"
            }`}
          >
            ₹
          </div>
          <div>
            <p>{it.label}</p>
            <p className="text-xs text-muted-foreground" title={it.at}>
              {it.at ? formatDistanceToNow(new Date(it.at), { addSuffix: true }) : ""}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
