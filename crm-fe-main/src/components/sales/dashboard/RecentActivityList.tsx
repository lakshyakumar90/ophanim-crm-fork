"use client";

import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Activity, ArrowRight } from "lucide-react";

interface RecentActivityListProps {
  activities: any[];
}

export function RecentActivityList({ activities }: RecentActivityListProps) {
  const router = useRouter();

  return (
    <Card className="lg:col-span-4">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Recent Sales Activity</CardTitle>
            <CardDescription>
              Latest actions across the sales team
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/activity")}
          >
            View All
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {activities.length > 0 ? (
          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
            {activities.map((act: any, i) => (
              <div key={i} className="flex gap-3 items-start text-sm border-b last:border-0 pb-3 last:pb-0">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Activity className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground">
                    {act.userName ||
                      act.user?.fullName ||
                      act.user?.full_name ||
                      "Someone"}
                  </p>
                  <p className="text-muted-foreground mt-0.5">
                    {act.title || act.description || (
                      <>
                        {act.action === "created" && "created a"}
                        {act.action === "updated" && "updated a"}
                        {act.action === "deleted" && "deleted a"}
                        {act.action === "status_changed" && "changed status of"}
                        {act.action === "assigned" && "was assigned to"}
                        {act.action === "commented" && "commented on"}
                        {!act.action && "performed action on"}
                        {" "}
                        {act.resourceType === "lead" && "lead"}
                        {act.resourceType === "task" && "task"}
                        {act.resourceType === "contact" && "contact"}
                        {!act.resourceType && "an item"}
                      </>
                    )}
                  </p>
                  {(act.entityName || act.entity_name) && (
                    <p className="text-xs text-primary/80 mt-0.5">
                      {act.entityName || act.entity_name}
                    </p>
                  )}
                  <span className="text-xs text-muted-foreground mt-1 block">
                    {act.createdAt || act.created_at
                      ? format(
                          new Date(act.createdAt || act.created_at),
                          "MMM d, HH:mm",
                        )
                      : ""}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground py-8 text-center">
            No recent activity
          </p>
        )}
      </CardContent>
    </Card>
  );
}
