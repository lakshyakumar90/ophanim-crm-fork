"use client";

import type { Dispatch, SetStateAction } from "react";
import { Badge } from "@/components/ui/badge";
import { buildTimeSections, getEntityLabel, type ActivityLog } from "@/lib/activity-grouping";
import { TimelineActivityItem } from "@/components/activity/TimelineActivityItem";

export function ActivityTimeSection({
  activities,
  shiftType,
  expandedActivities,
  setExpandedActivities,
  userMap,
}: {
  activities: ActivityLog[];
  shiftType?: "day_shift" | "night_shift" | null;
  expandedActivities: Set<string>;
  setExpandedActivities: Dispatch<SetStateAction<Set<string>>>;
  userMap?: Map<string, string>;
}) {
  return (
    <div className="space-y-8 max-w-4xl pt-4 pb-12 w-full">
      {buildTimeSections(activities, shiftType).map((section) => (
        <div key={section.key} className="relative">
          <div className="bg-background/95 backdrop-blur-sm py-2 px-1 mb-4 my-2 flex items-center gap-3">
            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
              {section.label}
            </h3>
            <Badge variant="secondary" className="text-xs px-2">
              {section.activities.length}
            </Badge>
            <div className="h-px bg-border flex-1" />
          </div>
          <div className="relative pl-1 sm:pl-2">
            <div className="absolute top-4 bottom-0 left-[26px] sm:left-[31px] w-px bg-border" />
            <div className="space-y-4">
              {section.activities.map((act) => (
                <TimelineActivityItem
                  key={act.id}
                  activity={act}
                  entityName={getEntityLabel(act)}
                  expandedActivities={expandedActivities}
                  setExpandedActivities={setExpandedActivities}
                  userMap={userMap}
                />
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
