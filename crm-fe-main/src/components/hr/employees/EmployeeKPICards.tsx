"use client";

import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { HREmployee } from "@/types/hr.types";
import { employeeMatchesKpiPreset, normalizeHrStatus, type KPIFilterPreset } from "@/lib/employeeHelpers";
import { cn } from "@/lib/utils";

export function EmployeeKPICards({
  employees,
  loading,
  activePreset,
  onPresetChange,
}: {
  employees: HREmployee[];
  loading: boolean;
  activePreset: KPIFilterPreset;
  onPresetChange: (p: KPIFilterPreset) => void;
}) {
  const counts = useMemo(() => {
    let active = 0;
    let onLeave = 0;
    let probation = 0;
    let inactive = 0;
    for (const e of employees) {
      const st = normalizeHrStatus(e);
      if (st === "on_leave") onLeave += 1;
      else if (st === "probation") probation += 1;
      else if (!e.isActive || st === "archived") inactive += 1;
      else if (e.isActive && st !== "archived") active += 1;
    }
    return {
      total: employees.length,
      active,
      onLeave,
      probation,
      inactive,
    };
  }, [employees]);

  if (loading && employees.length === 0) {
    return (
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
    );
  }

  const cards: {
    key: KPIFilterPreset;
    label: string;
    value: number;
    className: string;
  }[] = [
    { key: "all", label: "Total employees", value: counts.total, className: "border-blue-200 bg-blue-50/80 dark:bg-blue-950/20" },
    { key: "active", label: "Active", value: counts.active, className: "border-emerald-200 bg-emerald-50/80 dark:bg-emerald-950/20" },
    { key: "on_leave", label: "On leave", value: counts.onLeave, className: "border-amber-200 bg-amber-50/80 dark:bg-amber-950/20" },
    { key: "probation", label: "Probation", value: counts.probation, className: "border-violet-200 bg-violet-50/80 dark:bg-violet-950/20" },
    {
      key: "inactive_archived",
      label: "Inactive / archived",
      value: counts.inactive,
      className: "border-muted bg-muted/30",
    },
  ];

  return (
    <div className="grid gap-3 grid-cols-2 lg:grid-cols-5">
      {cards.map((c) => (
        <button
          key={c.key}
          type="button"
          onClick={() => onPresetChange(c.key)}
          className={cn(
            "text-left rounded-xl border transition-all hover:shadow-md",
            activePreset === c.key && "ring-2 ring-primary/30",
          )}
        >
          <Card className={cn("h-full", c.className)}>
            <CardContent className="p-4">
              <p className="text-xs font-medium text-muted-foreground">{c.label}</p>
              <p className="text-2xl font-bold tabular-nums">{c.value}</p>
            </CardContent>
          </Card>
        </button>
      ))}
    </div>
  );
}
