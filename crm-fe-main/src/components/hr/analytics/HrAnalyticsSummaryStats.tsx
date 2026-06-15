"use client";

import {
  BarChart3,
  Users,
  TrendingUp,
  UserCheck,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { HRAnalytics } from "./constants";

interface HrAnalyticsSummaryStatsProps {
  analytics: HRAnalytics;
  inactiveEmployees: number;
}

export function HrAnalyticsSummaryStats({
  analytics,
  inactiveEmployees,
}: HrAnalyticsSummaryStatsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
          <Users className="h-4 w-4 text-purple-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{analytics.totalEmployees}</div>
          <p className="text-xs text-muted-foreground">
            {analytics.activeEmployees} active, {inactiveEmployees} inactive
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">New Joiners</CardTitle>
          <TrendingUp className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {analytics.newJoinersThisMonth}
          </div>
          <p className="text-xs text-muted-foreground">This month</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Present Today</CardTitle>
          <UserCheck className="h-4 w-4 text-emerald-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {analytics.attendanceStats.presentToday}
          </div>
          <p className="text-xs text-muted-foreground">
            {analytics.attendanceStats.lateToday} late,{" "}
            {analytics.attendanceStats.onLeaveToday} on leave
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Departments</CardTitle>
          <BarChart3 className="h-4 w-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {analytics.departmentBreakdown.length}
          </div>
          <p className="text-xs text-muted-foreground">Active departments</p>
        </CardContent>
      </Card>
    </div>
  );
}
