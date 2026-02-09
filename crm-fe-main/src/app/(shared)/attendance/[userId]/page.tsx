"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import useSWR, { mutate } from "swr";
import { toast } from "sonner";
import { attendanceApi, usersApi } from "@/lib/api";
import { useIsAdmin, useIsManager } from "@/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  getTodayIST,
  nowIST,
  formatStoredTime,
  formatIST,
} from "@/lib/date-utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ArrowLeft,
  Calendar,
  Clock,
  Timer,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  User,
  LogIn,
  LogOut,
} from "lucide-react";
import { format, subDays } from "date-fns";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

const statusColors: Record<string, string> = {
  present: "bg-green-100 text-green-700",
  late: "bg-amber-100 text-amber-700",
  half_day: "bg-orange-100 text-orange-700",
  absent: "bg-red-100 text-red-700",
  leave: "bg-blue-100 text-blue-700",
};

const statusIcons: Record<string, string> = {
  present: "🟢",
  late: "🟡",
  half_day: "🟠",
  absent: "🔴",
  leave: "🔵",
};

const CHART_COLORS = ["#22c55e", "#eab308", "#f97316", "#ef4444", "#3b82f6"];

export default function UserAttendancePage() {
  const { userId } = useParams();
  const router = useRouter();
  const isAdmin = useIsAdmin();
  const isManager = useIsManager();
  const [isClockingIn, setIsClockingIn] = useState(false);
  const [isClockingOut, setIsClockingOut] = useState(false);

  // Calculate date range (last 30 days)
  const endDate = getTodayIST();
  const startDate = format(subDays(nowIST(), 30), "yyyy-MM-dd");

  // Fetch user info
  const { data: userData, isLoading: loadingUser } = useSWR(
    userId ? ["user-detail", userId] : null,
    () => usersApi.get(userId as string),
  );

  // Fetch user attendance history
  const {
    data: historyData,
    isLoading: loadingHistory,
    mutate: mutateHistory,
  } = useSWR(
    userId ? ["attendance-history", userId, startDate, endDate] : null,
    () =>
      attendanceApi
        .getUserHistory(userId as string, startDate, endDate),
  );

  // Get today's date string for fetching today's attendance
  const today = getTodayIST();

  // Calculate yesterday's date for night shift users
  const yesterday = new Date(nowIST());
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = formatIST(yesterday, "yyyy-MM-dd");

  // Derive today's attendance from history data
  // For night shift users who clock in between 00:00-04:15, their attendance is on yesterday's date
  // Priority: today's record first, then yesterday's (for night shift users)
  const todayRecord = historyData?.records?.find((r: any) => r.date === today);
  const yesterdayRecord = historyData?.records?.find((r: any) => r.date === yesterdayStr);
  
  // Prefer today's record, but if not found and user is night shift, use yesterday's
  const todayAttendance = todayRecord || (userData?.shiftType === "night_shift" ? yesterdayRecord : null);
  const isClockedIn = !!todayAttendance?.clockInTime;
  const isClockedOut = !!todayAttendance?.clockOutTime;

  if (!isAdmin && !isManager) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold">Access Denied</h2>
          <p className="text-muted-foreground">
            You don't have permission to view this page.
          </p>
          <Button onClick={() => router.push("/attendance")} className="mt-4">
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  const user = userData;
  const history = historyData;

  // Admin clock in handler
  const handleAdminClockIn = async () => {
    if (!userId) return;
    setIsClockingIn(true);
    try {
      await attendanceApi.adminClockIn(userId as string, {
        location: "Office",
      });
      toast.success(`✅ Clocked in ${user?.fullName || "user"} successfully!`);
      // Invalidate all relevant cache keys
      mutateHistory();
      mutate((key) => Array.isArray(key) && key[0] === "attendance-users");
      mutate((key) => Array.isArray(key) && key[0] === "attendance-analytics");
      mutate("attendance-today");
      mutate("attendance-summary");
    } catch (error: any) {
      toast.error(
        error.response?.data?.error?.message || "Failed to clock in user",
      );
    } finally {
      setIsClockingIn(false);
    }
  };

  // Admin clock out handler
  const handleAdminClockOut = async () => {
    if (!userId) return;
    setIsClockingOut(true);
    try {
      await attendanceApi.adminClockOut(userId as string, {});
      toast.success(`✅ Clocked out ${user?.fullName || "user"} successfully!`);
      // Invalidate all relevant cache keys
      mutateHistory();
      mutate((key) => Array.isArray(key) && key[0] === "attendance-users");
      mutate((key) => Array.isArray(key) && key[0] === "attendance-analytics");
      mutate("attendance-today");
      mutate("attendance-summary");
    } catch (error: any) {
      toast.error(
        error.response?.data?.error?.message || "Failed to clock out user",
      );
    } finally {
      setIsClockingOut(false);
    }
  };

  const getInitials = (name: string) => {
    return (
      name
        ?.split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2) || "U"
    );
  };

  // Prepare chart data
  const pieData = history?.summary
    ? [
        { name: "Present", value: history.summary.present ?? 0, color: "#22c55e" },
        { name: "Late", value: history.summary.late ?? 0, color: "#eab308" },
        { name: "Half Day", value: history.summary.halfDay ?? 0, color: "#f97316" },
        { name: "Absent", value: history.summary.absent ?? 0, color: "#ef4444" },
        { name: "Leave", value: history.summary.leave ?? 0, color: "#3b82f6" },
      ].filter((item) => item.value > 0)
    : [];

  // Weekly hours bar chart data
  const weeklyData = history?.records
    ? (() => {
        const weeks: Record<
          string,
          { week: string; hours: number; days: number }
        > = {};
        history.records.forEach((record: any) => {
          const weekStart = format(new Date(record.date), "'Week 'w");
          if (!weeks[weekStart]) {
            weeks[weekStart] = { week: weekStart, hours: 0, days: 0 };
          }
          weeks[weekStart].hours += record.totalHours || 0;
          weeks[weekStart].days += 1;
        });
        return Object.values(weeks).slice(-4).reverse();
      })()
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/attendance")}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        {loadingUser ? (
          <Skeleton className="h-16 w-64" />
        ) : user ? (
          <div className="flex items-center gap-4">
            <Avatar className="h-14 w-14">
              <AvatarImage src={user.avatarUrl} />
              <AvatarFallback className="text-lg">
                {getInitials(user.fullName)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl font-bold">{user.fullName}</h1>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="capitalize">
                  {user.role}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {user.email}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div>
            <h1 className="text-2xl font-bold">User Not Found</h1>
            <p className="text-muted-foreground">
              The requested user could not be found.
            </p>
          </div>
        )}
      </div>

      {/* Admin Controls */}
      {isAdmin && user && (
        <Card className="bg-gradient-to-br from-violet-50 to-purple-100 border-purple-200">
          <CardContent className="py-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h3 className="font-semibold text-purple-900">
                  Admin Controls
                </h3>
                <p className="text-sm text-purple-700">
                  {!isClockedIn && "User has not clocked in today"}
                  {isClockedIn && !isClockedOut && (
                    <>
                      Clocked in at{" "}
                      <span className="font-medium">
                        <span className="font-medium">
                          {formatStoredTime(todayAttendance.clockInTime)}
                        </span>
                      </span>
                    </>
                  )}
                  {isClockedIn && isClockedOut && (
                    <>
                      Day complete •{" "}
                      <span className="font-medium">
                        {todayAttendance.totalHours}h worked
                      </span>
                    </>
                  )}
                </p>
              </div>
              <div className="flex gap-3">
                <Button
                  onClick={handleAdminClockIn}
                  disabled={isClockingIn || (isClockedIn && !isClockedOut)}
                  className="bg-green-600 hover:bg-green-700 disabled:opacity-50"
                >
                  <LogIn className="mr-2 h-4 w-4" />
                  {isClockingIn
                    ? "Clocking In..."
                    : isClockedOut
                      ? "Reset Clock In"
                      : "Clock In"}
                </Button>
                <Button
                  onClick={handleAdminClockOut}
                  disabled={isClockingOut || !isClockedIn || isClockedOut}
                  variant="destructive"
                  className="disabled:opacity-50"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  {isClockingOut ? "Clocking Out..." : "Clock Out"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {loadingHistory ? (
        <div className="grid gap-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
          <Skeleton className="h-80" />
        </div>
      ) : history ? (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-green-600">
                      {history.summary?.present ?? 0}
                    </p>
                    <p className="text-xs text-muted-foreground">Present</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-100 rounded-lg">
                    <Clock className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-amber-600">
                      {history.summary?.late ?? 0}
                    </p>
                    <p className="text-xs text-muted-foreground">Late</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <AlertCircle className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-red-600">
                      {history.summary?.absent ?? 0}
                    </p>
                    <p className="text-xs text-muted-foreground">Absent</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Timer className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {history.summary?.totalHours ?? 0}h
                    </p>
                    <p className="text-xs text-muted-foreground">Total Hours</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-teal-100 rounded-lg">
                    <TrendingUp className="h-5 w-5 text-teal-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {history.summary?.avgHours ?? 0}h
                    </p>
                    <p className="text-xs text-muted-foreground">Avg/Day</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Attendance Distribution Pie Chart */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  Attendance Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                {pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, percent }) =>
                          `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                        }
                        labelLine={false}
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[250px] text-muted-foreground">
                    No attendance data available
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Weekly Hours Bar Chart */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Weekly Hours</CardTitle>
              </CardHeader>
              <CardContent>
                {weeklyData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={weeklyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="week" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip
                        formatter={(value: number | undefined) => [
                          `${(value ?? 0).toFixed(1)}h`,
                          "Hours",
                        ]}
                      />
                      <Bar
                        dataKey="hours"
                        fill="#8b5cf6"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[250px] text-muted-foreground">
                    No weekly data available
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Attendance History Table */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Attendance History (Last 30 Days)
                <Badge variant="secondary">
                  {history.records?.length ?? 0} records
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!history.records || history.records.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No attendance records found for this period.</p>
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Clock In</TableHead>
                        <TableHead>Clock Out</TableHead>
                        <TableHead>Hours</TableHead>
                        <TableHead>Location</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {history.records.map((record: any) => (
                        <TableRow key={record.id}>
                          <TableCell className="font-medium">
                            {formatIST(record.date, "EEE, MMM d, yyyy")}
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={
                                statusColors[record.status] ||
                                "bg-gray-100 text-gray-700"
                              }
                            >
                              {statusIcons[record.status]}{" "}
                              {record.status?.replace("_", " ")}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {record.clockInTime
                              ? formatStoredTime(record.clockInTime)
                              : "--:--"}
                          </TableCell>
                          <TableCell>
                            {record.clockOutTime
                              ? formatStoredTime(record.clockOutTime)
                              : "--:--"}
                          </TableCell>
                          <TableCell>
                            {record.totalHours ? `${record.totalHours}h` : "--"}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {record.location || "--"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold">
                Unable to Load Attendance Data
              </h2>
              <p className="text-muted-foreground mt-2">
                There was an error loading attendance history. Please try again
                later.
              </p>
              <Button onClick={() => router.refresh()} className="mt-4">
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
