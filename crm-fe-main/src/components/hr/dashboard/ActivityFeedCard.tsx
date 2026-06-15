"use client";

import { format } from "date-fns";
import useSWR from "swr";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { hrAnalyticsApi } from "@/lib/api";

export function ActivityFeedCard() {
  const { data, isLoading, error } = useSWR(
    "/hr/analytics/activity-feed",
    () => hrAnalyticsApi.activityFeed(10),
    { revalidateOnFocus: false, refreshInterval: 30000 },
  );

  const activities = data?.activities || [];

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>HR system activity log</CardDescription>
        </CardHeader>
        <CardContent className="text-xs text-destructive">
          Failed to load activities
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
        <CardDescription>HR system activity log</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-12 bg-muted rounded animate-pulse" />
            ))}
          </div>
        ) : activities.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No recent activities
          </p>
        ) : (
          <div className="space-y-3">
            {activities.map((activity: any) => (
              <div
                key={activity.id}
                className="flex items-start gap-3 p-2 rounded hover:bg-muted/30 transition-colors"
              >
                <div className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium leading-none mb-1 truncate">
                    {activity.description}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(activity.createdAt), "MMM d, h:mm a")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
