"use client";

import { formatINR, parseNum } from "@/lib/payroll-format";
import { cn } from "@/lib/utils";

export interface DeptCostSegment {
  department: string;
  employeeCount: number;
  totalNet: number;
}

export function DepartmentCostBar({
  segments,
  className,
}: {
  segments: DeptCostSegment[];
  className?: string;
}) {
  const total = segments.reduce((s, x) => s + x.totalNet, 0) || 1;
  const colors = [
    "bg-violet-500",
    "bg-cyan-500",
    "bg-emerald-500",
    "bg-amber-500",
    "bg-rose-500",
    "bg-indigo-500",
    "bg-teal-500",
  ];

  if (segments.length === 0) {
    return (
      <p className={cn("text-sm text-muted-foreground", className)}>
        No department breakdown available for this run.
      </p>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted">
        {segments.map((seg, i) => {
          const pct = Math.max(0, Math.min(100, (seg.totalNet / total) * 100));
          if (pct <= 0) return null;
          return (
            <div
              key={seg.department}
              className={cn(colors[i % colors.length], "h-full transition-all")}
              style={{ width: `${pct}%` }}
              title={`${seg.department}: ${formatINR(seg.totalNet)}`}
            />
          );
        })}
      </div>
      <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
        {segments.map((seg, i) => (
          <li key={seg.department} className="flex items-center gap-2">
            <span className={cn("h-2 w-2 rounded-full", colors[i % colors.length])} />
            <span className="font-medium">{seg.department}</span>
            <span className="text-muted-foreground">
              {seg.employeeCount} emp · {formatINR(seg.totalNet)} (
              {((parseNum(seg.totalNet) / total) * 100).toFixed(0)}%)
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
