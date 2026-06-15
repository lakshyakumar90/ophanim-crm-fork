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

export function TimelineActivityItem({
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
  const colorClass = actionColors[activity.activity_type] || "bg-slate-100 text-slate-700 ring-slate-200";
  const changes = getChangesFromMetadata(activity.metadata, activity.activity_type, userMap);
  const commentPreview =
    typeof activity.metadata?.comment_preview === "string" ? activity.metadata.comment_preview : null;
  const isExpanded = expandedActivities.has(activity.id);

  return (
    <div key={activity.id} className="relative flex items-start gap-4 group">
      {/* Timeline Time and Node */}
      <div className="flex flex-col items-center gap-1 w-[50px] sm:w-[60px] shrink-0 pt-0.5">
        <span className="text-[11px] sm:text-xs font-semibold text-slate-500">{formatIST(activity.created_at, "HH:mm")}</span>
        <div className={cn("relative z-10 rounded-full p-1.5 ring-4 ring-white bg-white", colorClass)}>
          <ActionIcon className="h-3.5 w-3.5" />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pb-6 border-b border-slate-100 group-last:border-transparent transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1">
          <p className="text-sm text-slate-700 leading-snug">
            <span className="font-bold text-slate-900">{activity.user?.full_name || "System"}</span>{" "}
            <span className="font-medium text-slate-600">{formatActivityDescription(activity)}</span>{" "}
            {entityName !== "Activity" && (
              <span className="font-semibold text-[10px] tracking-widest uppercase bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded ml-1">
                {entityName}
              </span>
            )}
          </p>
          <span className="text-xs text-slate-400 shrink-0 whitespace-nowrap hidden sm:block">
            {formatDistanceToNowIST(activity.created_at, { addSuffix: true })}
          </span>
        </div>

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
            className="mt-1.5 flex items-center gap-1 text-xs font-medium text-blue-600 transition-colors hover:text-blue-800"
          >
            {isExpanded ? (
              <><ChevronUp className="h-3 w-3" /> Hide changes</>
            ) : (
              <><ChevronDown className="h-3 w-3" /> View changes ({changes.length})</>
            )}
          </button>
        )}

        {commentPreview && (
          <p className="mt-2 text-sm italic text-slate-600 border-l-2 border-slate-300 pl-3 py-1 bg-slate-50/50 rounded-r-md">
            &quot;{commentPreview}&quot;
          </p>
        )}

        {isExpanded && changes.length > 0 && (
          <div className="mt-2 space-y-1.5 rounded-lg border border-slate-200 bg-slate-50/50 p-3">
            {changes.map((change, index) => (
              <div key={`${activity.id}-${index}`} className="grid gap-2 text-sm md:grid-cols-[140px_1fr_1fr]">
                <span className="font-semibold text-slate-500 uppercase tracking-widest text-[10px]">{change.field}</span>
                <span className="text-slate-400 line-through truncate">{change.oldVal || "-"}</span>
                <span className="text-slate-900 font-medium truncate">{change.newVal}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
