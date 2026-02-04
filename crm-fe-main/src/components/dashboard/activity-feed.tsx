import { formatDistanceToNowIST, formatDateTimeIST } from "@/lib/date-utils";
import {
  Clock,
  MessageSquare,
  UserPlus,
  CheckCircle,
  ArrowRightLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Activity {
  id: string;
  type: "note" | "task" | "lead_assign" | "status_change" | "completed";
  description: string;
  user: string;
  createdAt: string;
}

interface ActivityFeedProps {
  activities: Activity[];
}

const activityIcons = {
  note: {
    icon: MessageSquare,
    bg: "bg-neutral-100 dark:bg-neutral-800",
    color: "text-neutral-600 dark:text-neutral-400",
  },
  task: {
    icon: Clock,
    bg: "bg-blue-100 dark:bg-blue-950",
    color: "text-blue-600 dark:text-blue-400",
  },
  lead_assign: {
    icon: UserPlus,
    bg: "bg-violet-100 dark:bg-violet-950",
    color: "text-violet-600 dark:text-violet-400",
  },
  status_change: {
    icon: ArrowRightLeft,
    bg: "bg-orange-100 dark:bg-orange-950",
    color: "text-orange-600 dark:text-orange-400",
  },
  completed: {
    icon: CheckCircle,
    bg: "bg-emerald-100 dark:bg-emerald-950",
    color: "text-emerald-600 dark:text-emerald-400",
  },
};

export function ActivityFeed({ activities }: ActivityFeedProps) {
  return (
    <div className="bg-card rounded-xl border border-border p-5">
      <div className="mb-4">
        <h3 className="font-semibold text-foreground">Recent Activity</h3>
        <p className="text-sm text-muted-foreground">Latest updates</p>
      </div>

      <div className="space-y-4">
        {activities.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground">
            No recent activity
          </p>
        ) : (
          activities.slice(0, 6).map((activity) => {
            const config = activityIcons[activity.type] || activityIcons.note;
            const Icon = config.icon;

            return (
              <div key={activity.id} className="flex items-start gap-3">
                <div
                  className={cn(
                    "h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0",
                    config.bg,
                  )}
                >
                  <Icon className={cn("h-4 w-4", config.color)} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground">
                    <span className="font-medium">{activity.user}</span>{" "}
                    {activity.description}
                  </p>
                  <div
                    className="text-xs text-muted-foreground mt-0.5"
                    title={formatDateTimeIST(activity.createdAt)}
                  >
                    {formatDistanceToNowIST(activity.createdAt, {
                      addSuffix: true,
                    })}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
