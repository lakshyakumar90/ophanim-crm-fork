"use client";

import type { Dispatch, SetStateAction } from "react";
import {
  Activity,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNowIST, formatIST } from "@/lib/date-utils";
import { cn } from "@/lib/utils";
import {
  actionColors,
  actionIcons,
  formatActivityDescription,
  formatFieldName,
  getChangesFromMetadata,
  type ActivityLog,
} from "@/lib/activity-grouping";

export function ActivityItemCard({
  activity,
  entityName,
  expandedActivities,
  setExpandedActivities,
  userMap,
}: {
  activity: ActivityLog;
  entityName: string;
  expandedActivities: Set<string>;
  setExpandedActivities: Dispatch<SetStateAction<Set<string>>>;
  userMap?: Map<string, string>;
}) {
  const ActionIcon = actionIcons[activity.activity_type] || Activity;
  const colorClass =
    actionColors[activity.activity_type] || "bg-slate-100 text-slate-700 ring-slate-200";
  const changes = getChangesFromMetadata(activity.metadata, activity.activity_type, userMap);
  const commentPreview =
    typeof activity.metadata?.comment_preview === "string"
      ? activity.metadata.comment_preview
      : null;
  const isExpanded = expandedActivities.has(activity.id);

  return (
    <div
      key={activity.id}
      className="rounded-xl border border-slate-200 bg-slate-50/70 p-4"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <div className="flex items-start gap-3">
          <div className={cn("rounded-xl p-2 ring-1", colorClass)}>
            <ActionIcon className="h-4 w-4" />
          </div>
          <Avatar className="h-10 w-10 ring-2 ring-white">
            <AvatarImage src={activity.user?.avatar_url || ""} />
            <AvatarFallback className="text-xs">
              {activity.user?.full_name?.[0] || "U"}
            </AvatarFallback>
          </Avatar>
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm leading-6 text-slate-700">
            <span className="font-semibold text-slate-900">
              {activity.user?.full_name || "Unknown User"}
            </span>{" "}
            {formatActivityDescription(activity)}{" "}
            <span className="font-medium text-slate-900">{entityName}</span>
          </p>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="capitalize">
              {formatFieldName(activity.activity_type)}
            </Badge>
            {activity.entity_type && (
              <Badge variant="secondary">
                {formatFieldName(activity.entity_type)}
              </Badge>
            )}
            {changes.length > 0 && (
              <button
                type="button"
                onClick={() =>
                  setExpandedActivities((prev) => {
                    const next = new Set(prev);
                    if (next.has(activity.id)) next.delete(activity.id);
                    else next.add(activity.id);
                    return next;
                  })
                }
                className="flex items-center gap-1 text-xs font-medium text-blue-600 transition-colors hover:text-blue-800"
              >
                {isExpanded ? (
                  <>
                    <ChevronUp className="h-3 w-3" />
                    Hide changes
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-3 w-3" />
                    View changes ({changes.length})
                  </>
                )}
              </button>
            )}
          </div>

          {commentPreview && (
            <p className="mt-3 rounded-lg bg-white px-3 py-2 text-sm italic text-slate-600">
              &quot;{commentPreview}&quot;
            </p>
          )}

          {isExpanded && changes.length > 0 && (
            <div className="mt-3 space-y-2 rounded-lg border border-slate-200 bg-white p-3">
              {changes.map((change, index) => (
                <div
                  key={`${activity.id}-${index}`}
                  className="grid gap-2 text-sm md:grid-cols-[140px_1fr_1fr]"
                >
                  <span className="font-semibold text-slate-500 uppercase tracking-widest text-[10px]">{change.field}</span>
                  <span className="text-slate-400 line-through truncate">{change.oldVal || "-"}</span>
                  <span className="text-slate-900 font-medium truncate">{change.newVal}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="shrink-0 text-sm text-slate-500 lg:text-right">
          <div>{formatDistanceToNowIST(activity.created_at, { addSuffix: true })}</div>
          <div>{formatIST(activity.created_at, "MMM d, HH:mm")}</div>
        </div>
      </div>
    </div>
  );
}
