"use client";

import type { Dispatch, ElementType, SetStateAction } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { getEntityLabel, type ActivityLog } from "@/lib/activity-grouping";
import { ActivityItemCard } from "@/components/activity/ActivityItemCard";

export interface ActivityResourceGroupData {
  key: string;
  label: string;
  icon: ElementType;
  accentClass: string;
  activities: ActivityLog[];
}

export function ActivityResourceGroup({
  resourceGroup,
  isOpen,
  onOpenChange,
  expandedActivities,
  setExpandedActivities,
  userMap,
}: {
  resourceGroup: ActivityResourceGroupData;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  expandedActivities: Set<string>;
  setExpandedActivities: Dispatch<SetStateAction<Set<string>>>;
  userMap?: Map<string, string>;
}) {
  const GroupIcon = resourceGroup.icon;

  return (
    <Collapsible open={isOpen} onOpenChange={onOpenChange}>
      <div
        className={cn(
          "rounded-xl border border-slate-200 shadow-sm overflow-hidden",
          resourceGroup.accentClass,
        )}
      >
        <CollapsibleTrigger className="w-full">
          <div className="flex items-center justify-between gap-4 px-4 py-3 bg-white/50 text-left hover:bg-white/80 transition-colors">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white rounded-lg shadow-sm border border-slate-100">
                <GroupIcon className="h-4 w-4 text-slate-700" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  {resourceGroup.label} (
                  {
                    new Set(
                      resourceGroup.activities.map((a) => a.entity_id || a.lead_id || a.user_id),
                    ).size
                  }
                  )
                </h4>
                <p className="text-xs font-medium text-slate-500">
                  {resourceGroup.activities.length} activities
                </p>
              </div>
            </div>
            <div className="mr-2">
              {isOpen ? (
                <ChevronDown className="h-4 w-4 text-slate-500" />
              ) : (
                <ChevronRight className="h-4 w-4 text-slate-500" />
              )}
            </div>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="border-t border-slate-100 bg-white/70 p-4 space-y-3">
            {resourceGroup.activities.map((act) => (
              <ActivityItemCard
                key={act.id}
                activity={act}
                entityName={getEntityLabel(act)}
                expandedActivities={expandedActivities}
                setExpandedActivities={setExpandedActivities}
                userMap={userMap}
              />
            ))}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
