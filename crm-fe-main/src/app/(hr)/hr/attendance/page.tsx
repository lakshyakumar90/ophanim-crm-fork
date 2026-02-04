"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock, Calendar, Users, AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface AttendanceStats {
  presentToday: number;
  absentToday: number;
  lateToday: number;
  onLeaveToday: number;
}

interface HRAnalytics {
  totalEmployees: number;
  activeEmployees: number;
  attendanceStats: AttendanceStats;
}

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1";

export default function HRAttendancePage() {
  const [analytics, setAnalytics] = useState<HRAnalytics | null>(null);
  const [onLeaveList, setOnLeaveList] = useState<
    { userId: string; userName: string }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      const headers = {
        Authorization: `Bearer ${localStorage.getItem("crm_access_token")}`,
      };

      const [analyticsRes, onLeaveRes] = await Promise.all([
        fetch(`${API_URL}/hr/analytics`, { headers }),
        fetch(`${API_URL}/hr/on-leave-today`, { headers }),
      ]);

      if (analyticsRes.ok) {
        const data = await analyticsRes.json();
        setAnalytics(data.data);
      }

      if (onLeaveRes.ok) {
        const data = await onLeaveRes.json();
        setOnLeaveList(data.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch HR attendance data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchData();
    setIsRefreshing(false);
  };

  const stats = analytics?.attendanceStats || {
    presentToday: 0,
    absentToday: 0,
    lateToday: 0,
    onLeaveToday: 0,
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Attendance Overview
          </h1>
          <p className="text-muted-foreground">
            Monitor and manage employee attendance across all departments.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
          <Button asChild>
            <Link href="/attendance">View Full Attendance</Link>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Present Today</CardTitle>
            <Users className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats.presentToday}
            </div>
            <p className="text-xs text-muted-foreground">
              Employees clocked in on time
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Late Today</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {stats.lateToday}
            </div>
            <p className="text-xs text-muted-foreground">Arrived late today</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Absent</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {stats.absentToday}
            </div>
            <p className="text-xs text-muted-foreground">Not clocked in</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">On Leave</CardTitle>
            <Calendar className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {stats.onLeaveToday}
            </div>
            <p className="text-xs text-muted-foreground">Approved leaves</p>
          </CardContent>
        </Card>
      </div>

      {/* Active Employees Summary */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Workforce Summary</CardTitle>
            <CardDescription>Employee count overview</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Total Employees</span>
                <span className="text-lg font-semibold">
                  {analytics?.totalEmployees || 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Active Employees</span>
                <Badge
                  variant="secondary"
                  className="bg-green-100 text-green-700"
                >
                  {analytics?.activeEmployees || 0}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">
                  Attendance Rate Today
                </span>
                <Badge variant="secondary">
                  {analytics?.totalEmployees
                    ? Math.round(
                        ((stats.presentToday + stats.lateToday) /
                          analytics.totalEmployees) *
                          100,
                      )
                    : 0}
                  %
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Employees On Leave Today</CardTitle>
            <CardDescription>
              {onLeaveList.length} employee(s) on approved leave
            </CardDescription>
          </CardHeader>
          <CardContent>
            {onLeaveList.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">
                No employees on leave today
              </p>
            ) : (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {onLeaveList.map((emp) => (
                  <div
                    key={emp.userId}
                    className="flex items-center gap-2 p-2 rounded-lg bg-muted/50"
                  >
                    <Calendar className="h-4 w-4 text-blue-500" />
                    <span className="text-sm">{emp.userName}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Links */}
      <Card>
        <CardHeader>
          <CardTitle>HR Attendance Management</CardTitle>
          <CardDescription>
            As HR, you can view and edit attendance records for all employees.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-4">
          <Button asChild variant="outline">
            <Link href="/attendance">Manage All Attendance →</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/hr/leaves">Manage Leave Requests →</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
