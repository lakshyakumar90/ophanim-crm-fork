"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface TodaySnapshotCardProps {
  isFullView: boolean;
  isManagerView: boolean;
  snapshot: unknown;
  payrollData: { currentMonthStatus?: string; pendingApprovals?: number } | undefined;
  teamOnLeaveCount: number;
  teamUsersLength: number;
  selfToday: unknown;
  weeklyTotalHours: number;
}

export function TodaySnapshotCard({
  isFullView,
  isManagerView,
  snapshot,
  payrollData,
  teamOnLeaveCount,
  teamUsersLength,
  selfToday,
  weeklyTotalHours,
}: TodaySnapshotCardProps) {
  return (
    <Card className="border-l-4 border-l-amber-500">
      <CardHeader>
        <CardTitle>Today&apos;s Snapshot</CardTitle>
        <CardDescription>
          {isFullView
            ? "Leave, attendance and pending approvals at a glance."
            : isManagerView
              ? "Team leave and roster highlights for today."
              : "Your personal attendance and workload highlights for today."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="p-3 rounded border bg-muted/20">
            <p className="text-muted-foreground">
              {isFullView
                ? "On Leave Today"
                : isManagerView
                  ? "My Team On Leave"
                  : "My Attendance Status"}
            </p>
            <p className="text-xl font-semibold">
              {isFullView
                ? Array.isArray(snapshot)
                  ? snapshot.length
                  : 0
                : isManagerView
                  ? teamOnLeaveCount
                  : String((selfToday as any)?.status || "not_marked").replace(
                      /_/g,
                      " ",
                    )}
            </p>
          </div>
          <div className="p-3 rounded border bg-muted/20">
            <p className="text-muted-foreground">
              {isFullView
                ? "Current Payroll Status"
                : isManagerView
                  ? "Team Members"
                  : "Today's Hours"}
            </p>
            <p className="text-xl font-semibold capitalize">
              {isFullView
                ? payrollData?.currentMonthStatus || "not_initiated"
                : isManagerView
                  ? teamUsersLength
                  : (selfToday as any)?.totalHours ?? 0}
            </p>
          </div>
          <div className="p-3 rounded border bg-muted/20">
            <p className="text-muted-foreground">
              {isFullView
                ? "Pending Payroll Approvals"
                : isManagerView
                  ? "Team Available Today"
                  : "Weekly Hours"}
            </p>
            <p className="text-xl font-semibold">
              {isFullView
                ? payrollData?.pendingApprovals || 0
                : isManagerView
                  ? Math.max(teamUsersLength - teamOnLeaveCount, 0)
                  : weeklyTotalHours.toFixed(1)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
