"use client";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Phone as PhoneIcon,
  Mail as MailIcon,
  Users,
  FileText,
  ArrowRightLeft,
  CheckCircle,
  Clock,
  Pencil,
} from "lucide-react";
import type { LeadActivity } from "@/types";
import { toLocaleStringIST } from "@/lib/date-utils";

const activityTypeIcons: Record<
  string,
  { icon: React.ElementType; color: string }
> = {
  call: { icon: PhoneIcon, color: "bg-green-500" },
  email: { icon: MailIcon, color: "bg-blue-500" },
  meeting: { icon: Users, color: "bg-purple-500" },
  note: { icon: FileText, color: "bg-gray-500" },
  status_change: { icon: ArrowRightLeft, color: "bg-primary" },
  assignment: { icon: ArrowRightLeft, color: "bg-cyan-500" },
  assign: { icon: ArrowRightLeft, color: "bg-cyan-500" },
  task_created: { icon: CheckCircle, color: "bg-emerald-500" },
  create: { icon: CheckCircle, color: "bg-emerald-500" },
  update: { icon: Pencil, color: "bg-primary" },
};

// Helper to format status/field values
function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "none";
  if (typeof value === "string") {
    // Convert snake_case to Title Case
    return value
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  }
  return String(value);
}

// Helper to format activity description
function formatActivityDescription(activity: LeadActivity): string | null {
  // Use metadata if available (from lead_activities table)
  if (activity.metadata) {
    const meta = activity.metadata as Record<string, unknown>;
    if (meta.from_status && meta.to_status) {
      return `${formatValue(meta.from_status)} → ${formatValue(meta.to_status)}`;
    }
  }
  return activity.description;
}

export function LeadActivityTimeline({
  activities,
  loading,
}: {
  activities: LeadActivity[];
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-16" />
        ))}
      </div>
    );
  }
  if (activities.length === 0) {
    return (
      <p className="text-slate-500 text-center py-8 text-sm">No activities yet</p>
    );
  }
  return (
    <div className="relative">
      <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-slate-200" />
      <div className="space-y-4">
        {activities.map((activity) => {
          const activityConfig = activityTypeIcons[activity.activityType] || {
            icon: Clock,
            color: "bg-slate-500",
          };
          const ActivityIcon = activityConfig.icon;
          return (
            <div key={activity.id} className="flex gap-3 relative">
              <div
                className={`w-6 h-6 rounded-full ${activityConfig.color} flex items-center justify-center shrink-0 z-10`}
              >
                <ActivityIcon className="w-3 h-3 text-white" />
              </div>
              <div className="flex-1 bg-slate-50 rounded-lg p-3 border min-w-0">
                <div className="flex flex-col sm:flex-row justify-between items-start gap-1">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {activity.user && (
                        <span className="text-xs font-medium text-slate-600">
                          {activity.user.fullName}
                        </span>
                      )}
                    </div>
                    <p className="font-medium text-slate-900 text-sm">{activity.title}</p>
                    <Badge variant="outline" className="text-xs mt-1">
                      {activity.activityType.replace(/_/g, " ")}
                    </Badge>
                  </div>
                  <span className="text-xs text-slate-500">
                    {toLocaleStringIST(activity.createdAt)}
                  </span>
                </div>
                {(activity.metadata || activity.description) && (
                  <p className="text-slate-600 mt-2 text-sm">
                    {formatActivityDescription(activity)}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
