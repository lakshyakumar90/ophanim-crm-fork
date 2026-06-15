"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Loader2,
  Activity,
  PlusCircle,
  Pencil,
  Trash2,
  RefreshCw,
  Clock,
  CheckCircle,
  User,
  Users,
  Globe,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { activitiesApi } from "@/lib/api";
import { getProjectActivities } from "@/lib/supabase-queries";
import { formatIST, formatDistanceToNowIST } from "@/lib/date-utils";
import { cn } from "@/lib/utils";
import { useHeaderRefresh } from "@/hooks/layout/useHeaderRefresh";
import { useAuth } from "@/providers/auth-provider";
import { subDays, startOfDay, endOfDay } from "date-fns";
import { nowIST } from "@/lib/date-utils";

type TimePreset = "today" | "7d" | "30d";
type ScopeFilter = "all" | "mine" | "team";

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

function getEntityUrl(activity: any, projectId: string): string | null {
  const type = activity.entity_type || activity.resource_type;
  const entityId = activity.entity_id || activity.resource_id;
  if (!entityId) return null;
  if (type === "task") return `/projects/${projectId}/tasks`;
  if (type === "project") return `/projects/${entityId}/overview`;
  if (type === "lead") return `/leads/${entityId}`;
  return null;
}

function extractChanges(metadata: any): { field: string; oldVal?: string; newVal?: string }[] {
  if (!metadata || typeof metadata !== "object") return [];
  const m: any = metadata;
  if (Array.isArray(m.changes)) {
    return m.changes
      .filter((c: any) => c && typeof c === "object")
      .map((c: any) => ({
        field: String(c.field ?? c.key ?? "change"),
        oldVal: c.oldVal != null ? String(c.oldVal) : c.old != null ? String(c.old) : undefined,
        newVal: c.newVal != null ? String(c.newVal) : c.new != null ? String(c.new) : undefined,
      }));
  }
  if (m.before && m.after && typeof m.before === "object" && typeof m.after === "object") {
    const keys = new Set([...Object.keys(m.before), ...Object.keys(m.after)]);
    const out: { field: string; oldVal?: string; newVal?: string }[] = [];
    for (const k of keys) {
      const b = (m.before as any)[k];
      const a = (m.after as any)[k];
      if (JSON.stringify(b) !== JSON.stringify(a)) {
        out.push({ field: k, oldVal: b != null ? String(b) : undefined, newVal: a != null ? String(a) : undefined });
      }
    }
    return out.slice(0, 20);
  }
  return [];
}

function getDateRange(preset: TimePreset): { startDate: string; endDate: string } {
  const now = nowIST();
  if (preset === "today") {
    return { startDate: startOfDay(now).toISOString(), endDate: endOfDay(now).toISOString() };
  }
  if (preset === "7d") {
    return { startDate: subDays(now, 7).toISOString(), endDate: now.toISOString() };
  }
  return { startDate: subDays(now, 30).toISOString(), endDate: now.toISOString() };
}

export default function ProjectActivityPage() {
  const params = useParams();
  const id = params.id as string;
  const { user } = useAuth();

  const [preset, setPreset] = useState<TimePreset>(() => {
    if (typeof window === "undefined") return "7d";
    return (new URLSearchParams(window.location.search).get("preset") as TimePreset) || "7d";
  });
  const [scopeFilter, setScopeFilter] = useState<ScopeFilter>("all");
  const [activities, setActivities] = useState<any[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
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
        // Try Supabase direct first
        try {
          const data = await getProjectActivities({ projectId: id, startDate, endDate });
          setActivities(data);
          return;
        } catch {
          // fallback to backend
        }
        const result = await activitiesApi.list({
          resourceType: "project",
          entityId: id,
          scope: "all-crm",
          startDate,
          endDate,
          limit: 500,
        });
        setActivities(result.data || []);
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

  useHeaderRefresh({ onRefresh: () => fetchActivities(true), isRefreshing: isLoading });

  // Client-side scope filtering
  const filteredActivities = useMemo(() => {
    if (scopeFilter === "mine") {
      return activities.filter(
        (a) => a.user?.id === user?.id || a.user_id === user?.id,
      );
    }
    return activities;
  }, [activities, scopeFilter, user?.id]);

  // Group by unique users for team stats
  const uniqueActors = useMemo(() => {
    const seen = new Map<string, { name: string; avatar?: string; count: number }>();
    for (const a of activities) {
      const uid = a.user?.id || a.user_id;
      if (!uid) continue;
      const prev = seen.get(uid);
      if (prev) {
        prev.count++;
      } else {
        seen.set(uid, {
          name: a.user?.full_name || "Unknown",
          avatar: a.user?.avatar_url,
          count: 1,
        });
      }
    }
    return Array.from(seen.entries())
      .map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => b.count - a.count);
  }, [activities]);

  const PRESETS: { label: string; value: TimePreset }[] = [
    { label: "Today", value: "today" },
    { label: "7 Days", value: "7d" },
    { label: "30 Days", value: "30d" },
  ];

  const SCOPE_OPTIONS: { label: string; value: ScopeFilter; icon: React.ElementType }[] = [
    { label: "All", value: "all", icon: Globe },
    { label: "My Activity", value: "mine", icon: User },
  ];

  if (isLoading) {
    return (
      <div className="flex h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-6">
      {/* Filters row */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Time presets */}
        <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
          {PRESETS.map((p) => (
            <button
              key={p.value}
              className={cn(
                "text-xs px-2.5 py-1 rounded-md transition-all",
                preset === p.value
                  ? "bg-background shadow-sm font-medium text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
              onClick={() => setPreset(p.value)}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Scope filter */}
        <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
          {SCOPE_OPTIONS.map((s) => (
            <button
              key={s.value}
              className={cn(
                "flex items-center gap-1 text-xs px-2.5 py-1 rounded-md transition-all",
                scopeFilter === s.value
                  ? "bg-background shadow-sm font-medium text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
              onClick={() => setScopeFilter(s.value)}
            >
              <s.icon className="h-3 w-3" />
              {s.label}
            </button>
          ))}
        </div>

        <span className="ml-auto text-xs text-muted-foreground">
          {filteredActivities.length} event{filteredActivities.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Team overview pills (only in "all" scope) */}
      {scopeFilter === "all" && uniqueActors.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {uniqueActors.slice(0, 8).map((actor) => (
            <button
              key={actor.id}
              onClick={() => {
                /* clicking an actor pill filters to that user */
              }}
              className="flex items-center gap-1.5 bg-muted/60 border rounded-full px-2.5 py-1 text-xs hover:bg-muted transition-colors"
            >
              <Avatar className="h-4 w-4">
                <AvatarImage src={actor.avatar} />
                <AvatarFallback className="text-[8px]">{actor.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <span className="font-medium truncate max-w-[90px]">{actor.name}</span>
              <span className="text-muted-foreground">{actor.count}</span>
            </button>
          ))}
          {uniqueActors.length > 8 && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground px-2">
              <Users className="h-3 w-3" />+{uniqueActors.length - 8} more
            </span>
          )}
        </div>
      )}

      {/* Activity Feed */}
      {filteredActivities.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Activity className="h-10 w-10 mb-3 opacity-20" />
            <p className="text-sm">
              {scopeFilter === "mine"
                ? "You have no activity recorded for this period."
                : "No activity recorded for this period."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-4">
            <div className="space-y-0">
              {filteredActivities.map((activity, i) => {
                const ActionIcon = getActionIcon(activity.activity_type);
                const actionColor = getActionColor(activity.activity_type);
                const isLast = i === filteredActivities.length - 1;
                const entityUrl = getEntityUrl(activity, id);
                const changes = extractChanges(activity.metadata);
                const hasChanges = changes.length > 0;
                const isExpanded = expanded.has(activity.id);

                return (
                  <div
                    key={activity.id}
                    className={cn(
                      "flex items-start gap-3 py-3",
                      !isLast && "border-b",
                    )}
                  >
                    {/* User avatar */}
                    <Avatar className="h-7 w-7 shrink-0 mt-0.5">
                      <AvatarImage src={activity.user?.avatar_url || undefined} />
                      <AvatarFallback className="text-[10px]">
                        {activity.user?.full_name?.charAt(0) || "?"}
                      </AvatarFallback>
                    </Avatar>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <span className="text-sm font-medium">
                            {activity.user?.full_name || "System"}
                          </span>
                          <span className="text-sm text-muted-foreground ml-1">
                            {activity.title || activity.activity_type?.replace(/_/g, " ")}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Badge
                            className={cn("text-[10px] px-1.5 h-5", actionColor)}
                          >
                            <ActionIcon className="h-2.5 w-2.5 mr-0.5" />
                            {activity.activity_type?.replace(/_/g, " ")}
                          </Badge>
                          {hasChanges && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5 opacity-60 hover:opacity-100"
                              onClick={() =>
                                setExpanded((prev) => {
                                  const next = new Set(prev);
                                  if (next.has(activity.id)) next.delete(activity.id);
                                  else next.add(activity.id);
                                  return next;
                                })
                              }
                              title={isExpanded ? "Hide details" : "View details"}
                            >
                              {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                            </Button>
                          )}
                          {entityUrl && (
                            <Link href={entityUrl}>
                              <Button variant="ghost" size="icon" className="h-5 w-5 opacity-60 hover:opacity-100">
                                <ExternalLink className="h-3 w-3" />
                              </Button>
                            </Link>
                          )}
                        </div>
                      </div>
                      {activity.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                          {activity.description}
                        </p>
                      )}
                      {isExpanded && hasChanges && (
                        <div className="mt-2 rounded-lg border bg-muted/30 px-3 py-2">
                          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                            Changes
                          </p>
                          <div className="mt-1 space-y-1">
                            {changes.map((c, idx) => (
                              <div key={idx} className="text-xs flex flex-wrap items-center gap-2">
                                <span className="font-medium">{c.field}</span>
                                {c.oldVal !== undefined && (
                                  <span className="text-muted-foreground line-through">{c.oldVal}</span>
                                )}
                                {c.newVal !== undefined && (
                                  <span className="text-emerald-700">{c.newVal}</span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      <p className="text-[11px] text-muted-foreground/60 mt-1">
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
