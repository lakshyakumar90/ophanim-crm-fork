"use client";

import { useState, useCallback, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  Loader2,
  Activity,
  PlusCircle,
  Pencil,
  Trash2,
  RefreshCw,
  Clock,
  CheckCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { activitiesApi } from "@/lib/api";
import { formatIST, formatDistanceToNowIST } from "@/lib/date-utils";
import { cn } from "@/lib/utils";
import { useHeaderRefresh } from "@/hooks/use-header-refresh";
import { subDays, startOfDay, endOfDay } from "date-fns";
import { nowIST } from "@/lib/date-utils";

type TimePreset = "today" | "7d" | "30d";

const ACTION_COLORS: Record<string, string> = {
  create: "bg-emerald-100 text-emerald-700",
  update: "bg-blue-100 text-blue-700",
  delete: "bg-red-100 text-red-700",
  status_change: "bg-violet-100 text-violet-700",
  comment: "bg-indigo-100 text-indigo-700",
  complete: "bg-green-100 text-green-700",
};

const ACTION_ICONS: Record<string, React.ElementType> = {
  create: PlusCircle,
  update: Pencil,
  delete: Trash2,
  status_change: RefreshCw,
  clock_in: Clock,
  clock_out: Clock,
  complete: CheckCircle,
};

function getActionIcon(type: string): React.ElementType {
  return ACTION_ICONS[type] || Activity;
}

function getActionColor(type: string): string {
  return ACTION_COLORS[type] || "bg-slate-100 text-slate-700";
}

function getDateRange(preset: TimePreset): { startDate: string; endDate: string } {
  const now = nowIST();
  if (preset === "today") {
    return {
      startDate: startOfDay(now).toISOString(),
      endDate: endOfDay(now).toISOString(),
    };
  }
  if (preset === "7d") {
    return {
      startDate: subDays(now, 7).toISOString(),
      endDate: now.toISOString(),
    };
  }
  return {
    startDate: subDays(now, 30).toISOString(),
    endDate: now.toISOString(),
  };
}

export default function ProjectActivityPage() {
  const params = useParams();
  const id = params.id as string;

  const [preset, setPreset] = useState<TimePreset>(() => {
    if (typeof window === "undefined") return "7d";
    return (new URLSearchParams(window.location.search).get("preset") as TimePreset) || "7d";
  });
  const [activities, setActivities] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // URL sync
  useEffect(() => {
    if (typeof window === "undefined") return;
    const qs = preset !== "7d" ? `?preset=${preset}` : "";
    window.history.replaceState(null, "", qs || window.location.pathname);
  }, [preset]);

  const fetchActivities = useCallback(
    async (quiet = false) => {
      if (!quiet) setIsLoading(true);
      try {
        const { startDate, endDate } = getDateRange(preset);
        const result = await activitiesApi.list({
          resourceType: "project",
          scope: "all-crm",
          startDate,
          endDate,
          limit: 300,
        });
        const all: any[] = result.data || [];
        // Filter to activities that reference this specific project
        const filtered = all.filter(
          (a) => a.entity_id === id || a.lead_id === id,
        );
        setActivities(filtered);
      } catch (error) {
        console.error("Failed to fetch project activity", error);
      } finally {
        setIsLoading(false);
      }
    },
    [id, preset],
  );

  useEffect(() => {
    if (id) fetchActivities();
  }, [fetchActivities]);

  useHeaderRefresh({
    onRefresh: () => fetchActivities(true),
    isRefreshing: isLoading,
  });

  const PRESETS: { label: string; value: TimePreset }[] = [
    { label: "Today", value: "today" },
    { label: "7 Days", value: "7d" },
    { label: "30 Days", value: "30d" },
  ];

  if (isLoading) {
    return (
      <div className="flex h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-6 max-w-4xl mx-auto">
      {/* Filters */}
      <div className="flex items-center gap-2">
        {PRESETS.map((p) => (
          <Button
            key={p.value}
            variant={preset === p.value ? "default" : "outline"}
            size="sm"
            className="text-xs"
            onClick={() => setPreset(p.value)}
          >
            {p.label}
          </Button>
        ))}
        <span className="ml-auto text-xs text-muted-foreground">
          {activities.length} events
        </span>
      </div>

      {/* Activity Feed */}
      {activities.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Activity className="h-10 w-10 mb-3 opacity-20" />
            <p>No activity recorded for this period.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-4">
            <div className="space-y-4">
              {activities.map((activity, i) => {
                const ActionIcon = getActionIcon(activity.activity_type);
                const actionColor = getActionColor(activity.activity_type);

                return (
                  <div
                    key={activity.id}
                    className={cn(
                      "flex items-start gap-3 pb-4",
                      i < activities.length - 1 && "border-b",
                    )}
                  >
                    {/* User avatar */}
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarImage
                        src={
                          activity.user?.avatar_url || undefined
                        }
                      />
                      <AvatarFallback className="text-xs">
                        {activity.user?.full_name?.charAt(0) || "?"}
                      </AvatarFallback>
                    </Avatar>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <span className="text-sm font-medium">
                            {activity.user?.full_name || "System"}
                          </span>
                          <span className="text-sm text-muted-foreground ml-1">
                            {activity.title || activity.activity_type}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge
                            className={cn(
                              "text-[10px] px-1.5 h-4",
                              actionColor,
                            )}
                          >
                            <ActionIcon className="h-2.5 w-2.5 mr-0.5" />
                            {activity.activity_type.replace(/_/g, " ")}
                          </Badge>
                        </div>
                      </div>
                      {activity.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {activity.description}
                        </p>
                      )}
                      <p className="text-[11px] text-muted-foreground/70 mt-1">
                        {formatDistanceToNowIST(activity.created_at)} ago ·{" "}
                        {formatIST(activity.created_at, "MMM d, h:mm a")}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
