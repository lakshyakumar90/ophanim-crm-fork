"use client";

import useSWR from "swr";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { hrAnalyticsApi } from "@/lib/api";

export function LeaveCard() {
  const { data, isLoading, error } = useSWR(
    "/hr/analytics/leaves",
    () => hrAnalyticsApi.leaves(),
    { revalidateOnFocus: false },
  );

  if (isLoading || error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Leave Tracking</CardTitle>
          <CardDescription>Current leave status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-20 bg-muted rounded animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Leave Tracking</CardTitle>
        <CardDescription>Current leave status</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 rounded-md bg-blue-50 border border-blue-100">
            <p className="text-2xl font-bold text-blue-600">
              {data?.employeesOnLeaveToday || 0}
            </p>
            <p className="text-xs text-blue-700">On Leave Today</p>
          </div>
          <div className="p-3 rounded-md bg-amber-50 border border-amber-100">
            <p className="text-2xl font-bold text-amber-600">
              {data?.pendingApprovals || 0}
            </p>
            <p className="text-xs text-amber-700">Pending Approvals</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
