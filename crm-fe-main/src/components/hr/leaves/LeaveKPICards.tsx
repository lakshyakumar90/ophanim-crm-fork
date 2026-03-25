"use client";

import { Card, CardContent } from "@/components/ui/card";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import type { LeaveStatsDto, OnLeaveTodayEntryDto } from "@/types/hr-leaves";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type TabKey = "overview" | "pending" | "all" | "balances" | "settings" | "calendar";

export function LeaveKPICards({
  stats,
  onLeaveToday,
  loading,
  activeTab,
  onTabChange,
}: {
  stats: LeaveStatsDto | null;
  onLeaveToday: OnLeaveTodayEntryDto[];
  loading: boolean;
  activeTab: TabKey;
  onTabChange: (t: TabKey) => void;
}) {
  if (loading && !stats) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
    );
  }

  const pending = stats?.pending ?? 0;
  const approved = stats?.approvedThisMonth ?? 0;
  const rejected = stats?.rejectedThisMonth ?? 0;
  const onLeaveCount = stats?.onLeaveToday ?? onLeaveToday.length;

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <button
          type="button"
          onClick={() => onTabChange("pending")}
          className={cn(
            "cursor-pointer text-left rounded-xl transition-all hover:shadow-md",
            activeTab === "pending" && "ring-2 ring-primary/30",
          )}
        >
          <Card className="border-amber-200 bg-amber-50/80 dark:bg-amber-950/20">
            <CardContent className="p-4">
              <p className="text-xs font-medium text-amber-900 dark:text-amber-100">
                Pending approvals
              </p>
              <p className="text-2xl font-bold text-amber-950 dark:text-amber-50">{pending}</p>
            </CardContent>
          </Card>
        </button>

        <HoverCard openDelay={80}>
          <HoverCardTrigger asChild>
            <button
              type="button"
              className="cursor-pointer text-left rounded-xl transition-all hover:shadow-md"
              onClick={() => onTabChange("all")}
            >
              <Card className="border-blue-200 bg-blue-50/80 dark:bg-blue-950/20">
                <CardContent className="p-4">
                  <p className="text-xs font-medium text-blue-900 dark:text-blue-100">
                    On leave today
                  </p>
                  <p className="text-2xl font-bold text-blue-950 dark:text-blue-50">
                    {onLeaveCount}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-1">Hover for names</p>
                </CardContent>
              </Card>
            </button>
          </HoverCardTrigger>
          <HoverCardContent side="bottom" className="max-w-xs max-h-48 overflow-y-auto">
            {onLeaveToday.length === 0 ? (
              <p className="text-xs">No attendance “leave” records for today.</p>
            ) : (
              <ul className="text-xs space-y-1">
                {onLeaveToday.map((e) => (
                  <li key={e.userId}>
                    <span className="font-medium">{e.userName}</span>
                  </li>
                ))}
              </ul>
            )}
          </HoverCardContent>
        </HoverCard>

        <button
          type="button"
          onClick={() => onTabChange("all")}
          className={cn(
            "cursor-pointer text-left rounded-xl transition-all hover:shadow-md",
            activeTab === "all" && "ring-2 ring-primary/30",
          )}
        >
          <Card>
            <CardContent className="p-4">
              <p className="text-xs font-medium text-muted-foreground">Approved this month</p>
              <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">{approved}</p>
            </CardContent>
          </Card>
        </button>

        <button
          type="button"
          onClick={() => onTabChange("all")}
          className={cn(
            "cursor-pointer text-left rounded-xl transition-all hover:shadow-md",
            activeTab === "all" && "ring-2 ring-primary/30",
          )}
        >
          <Card>
            <CardContent className="p-4">
              <p className="text-xs font-medium text-muted-foreground">Rejected this month</p>
              <p className="text-2xl font-bold text-red-700 dark:text-red-400">{rejected}</p>
            </CardContent>
          </Card>
        </button>
      </div>
  );
}
