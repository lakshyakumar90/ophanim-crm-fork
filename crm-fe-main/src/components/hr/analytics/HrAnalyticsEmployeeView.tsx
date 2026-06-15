"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface HrAnalyticsEmployeeViewProps {
  selfTodayRaw: unknown;
  selfWeeklyHours: number;
  teamId?: string | null;
}

export function HrAnalyticsEmployeeView({
  selfTodayRaw,
  selfWeeklyHours,
  teamId,
}: HrAnalyticsEmployeeViewProps) {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My HR Analytics</h1>
          <p className="text-muted-foreground">
            Personal HR work and attendance analytics.
          </p>
        </div>
        <Badge variant="outline">Self Scope</Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Current Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold capitalize">
              {String((selfTodayRaw as any)?.status || "not_marked").replace(
                /_/g,
                " ",
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Today Hours</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(selfTodayRaw as any)?.totalHours ?? 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Weekly Hours</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {selfWeeklyHours.toFixed(1)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Team</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {teamId ? "Assigned" : "-"}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
