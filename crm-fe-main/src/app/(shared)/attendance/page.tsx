"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import useSWR, { mutate } from "swr";
import { attendanceApi } from "@/lib/api";
import { getInitials } from "@/lib/utils";
import { toast } from "sonner";
import { useAuth, useIsAdmin, useIsManager } from "@/providers/auth-provider";
import { useDepartment } from "@/providers/department-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Clock,
  LogIn,
  LogOut,
  Calendar as CalendarIcon,
  Timer,
  CheckCircle,
  Users,
  TrendingUp,
  CalendarDays,
  ChevronDown,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import {
  format,
  subDays,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfQuarter,
  endOfQuarter,
  subMonths,
  subYears,
  differenceInDays,
  addWeeks,
} from "date-fns";
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
import {
  nowIST,
  formatIST,
  formatStoredTime,
  nowISTAsUTC,
  parseStoredIST,
} from "@/lib/date-utils";

type DateRangeType =
  | "today"
  | "yesterday"
  | "thisWeek"
  | "lastWeek"
  | "thisMonth"
  | "lastMonth"
  | "thisQuarter"
  | "halfYear"
  | "custom";

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

export default function AttendancePage() {
  const router = useRouter();
  const { user } = useAuth();
  const isAdmin = useIsAdmin();
  const isManager = useIsManager();
  const [isClockingIn, setIsClockingIn] = useState(false);
  const [isClockingOut, setIsClockingOut] = useState(false);
  const [workingTime, setWorkingTime] = useState<string>("");
  const [dateRange, setDateRange] = useState<DateRangeType>("today");
  const [customDateRange, setCustomDateRange] = useState<{
    from: Date;
    to: Date;
  }>({
    from: nowIST(),
    to: nowIST(),
  });
  const [customDateMode, setCustomDateMode] = useState<"single" | "range">(
    "single",
  );
  const [activeRangeField, setActiveRangeField] = useState<"from" | "to">(
    "from",
  );
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const oneYearAgo = useMemo(() => subYears(new Date(), 1), []);

  const weekStartDate = useMemo(() => {
    const today = new Date();
    const targetDate = addWeeks(today, weekOffset);
    return startOfWeek(targetDate, { weekStartsOn: 1 }).toISOString();
  }, [weekOffset]);

  const { data: weeklyHoursData, isLoading: loadingWeeklyHours } = useSWR(
    ["attendance-weekly", weekStartDate, selectedUserId],
    () =>
      attendanceApi
        .getWeeklyHours(selectedUserId || undefined, weekStartDate)
        .then((res) => res.data.data),
  );

  const { startDate, endDate } = useMemo(() => {
    const now = nowIST();
    let start = now;
    let end = now;

    switch (dateRange) {
      case "today":
        start = now;
        end = now;
        break;
      case "yesterday":
        start = subDays(now, 1);
        end = subDays(now, 1);
        break;
      case "thisWeek":
        start = startOfWeek(now, { weekStartsOn: 1 });
        end = endOfWeek(now, { weekStartsOn: 1 });
        break;
      case "lastWeek":
        const lastWeek = subDays(now, 7);
        start = startOfWeek(lastWeek, { weekStartsOn: 1 });
        end = endOfWeek(lastWeek, { weekStartsOn: 1 });
        break;
      case "thisMonth":
        start = startOfMonth(now);
        end = endOfMonth(now);
        break;
      case "lastMonth":
        const lastMonth = subMonths(now, 1);
        start = startOfMonth(lastMonth);
        end = endOfMonth(lastMonth);
        break;
      case "thisQuarter":
        start = startOfQuarter(now);
        end = endOfQuarter(now);
        break;
      case "halfYear":
        start = subMonths(now, 6);
        end = now;
        break;
      case "custom":
        start = customDateRange.from;
        end = customDateRange.to;
        break;
    }

    return {
      startDate: format(start, "yyyy-MM-dd"),
      endDate: format(end, "yyyy-MM-dd"),
    };
  }, [dateRange, customDateRange]);

  // Fetch data
  const { data: todayData, isLoading: loadingToday } = useSWR(
    "attendance-today",
    () => attendanceApi.getToday().then((res) => res.data.data),
  );

  const { data: summaryData, isLoading: loadingSummary } = useSWR(
    "attendance-summary",
    () => attendanceApi.getSummary().then((res) => res.data.data),
  );

  const { currentDepartment } = useDepartment();

  const { data: analyticsData, isLoading: loadingAnalytics } = useSWR(
    isAdmin
      ? ["attendance-analytics", startDate, endDate, currentDepartment?.id]
      : null,
    () =>
      attendanceApi
        .getAnalytics(startDate, endDate, currentDepartment?.id)
        .then((res) => res.data.data),
  );

  const { data: usersAttendanceData, isLoading: loadingUsers } = useSWR(
    isAdmin ? ["attendance-users", startDate, currentDepartment?.id] : null,
    () =>
      attendanceApi
        .getUsersToday(startDate, currentDepartment?.id)
        .then((res) => res.data.data),
  );

  useEffect(() => {
    if (todayData?.clockInTime && !todayData.clockOutTime) {
      const startTime = parseStoredIST(todayData.clockInTime);
      const updateTimer = () => {
        const now = nowISTAsUTC();
        const diff = now - startTime;

        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        setWorkingTime(
          `${hours.toString().padStart(2, "0")}:${minutes
            .toString()
            .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`,
        );
      };

      updateTimer(); // Initial call
      const interval = setInterval(updateTimer, 1000);

      return () => clearInterval(interval);
    } else {
      setWorkingTime("");
    }
  }, [todayData]);

  const handleClockIn = async () => {
    setIsClockingIn(true);
    try {
      await attendanceApi.clockIn({ location: "Office" });
      toast.success("🕐 Clocked in successfully! Have a productive day!");
      mutate("attendance-today");
    } catch (error: any) {
      toast.error(
        error.response?.data?.error?.message ||
          "Failed to clock in. Please try again.",
      );
    } finally {
      setIsClockingIn(false);
    }
  };

  const handleClockOut = async () => {
    setIsClockingOut(true);
    try {
      await attendanceApi.clockOut({});
      toast.success("👋 Clocked out successfully! See you tomorrow!");
      mutate("attendance-today");
      mutate("attendance-summary");
    } catch (error: any) {
      toast.error(
        error.response?.data?.error?.message ||
          "Failed to clock out. Please try again.",
      );
    } finally {
      setIsClockingOut(false);
    }
  };

  const today = todayData;
  const summary = summaryData;
  const analytics = analyticsData;
  const usersAttendance = usersAttendanceData || [];

  const pieData = summary
    ? [
        { name: "Present", value: summary.present || 0, color: "#22c55e" }, // green-500
        { name: "Late", value: summary.late || 0, color: "#f59e0b" }, // amber-500
        { name: "Half Day", value: summary.half_day || 0, color: "#f97316" }, // orange-500
        { name: "Absent", value: summary.absent || 0, color: "#ef4444" }, // red-500
        { name: "Leave", value: summary.leave || 0, color: "#3b82f6" }, // blue-500
      ].filter((item) => item.value > 0)
    : [];

  const adminPieData = analytics
    ? [
        { name: "Present", value: analytics.present || 0, color: "#22c55e" },
        { name: "Late", value: analytics.late || 0, color: "#f59e0b" },
        { name: "Absent", value: analytics.absent || 0, color: "#ef4444" },
      ].filter((item) => item.value > 0)
    : [];

  const statusBarData = analytics
    ? [
        { status: "Present", count: analytics.present || 0, fill: "#22c55e" },
        { status: "Late", count: analytics.late || 0, fill: "#f59e0b" },
        { status: "Absent", count: analytics.absent || 0, fill: "#ef4444" },
        { status: "Half Day", count: analytics.half_day || 0, fill: "#f97316" },
        { status: "Leave", count: analytics.leave || 0, fill: "#3b82f6" },
      ].filter((item) => item.count > 0)
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Attendance</h1>
        <p className="text-muted-foreground">
          {isAdmin
            ? "Monitor team attendance and track your own"
            : "Track your daily attendance and view your analytics"}
        </p>
      </div>

      {/* Your Attendance Card */}
      <Card className="bg-gradient-to-br from-blue-500 to-violet-600 text-white overflow-hidden">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="text-center md:text-left">
              <p className="text-blue-100">
                {formatIST(currentTime, "EEEE, MMMM d, yyyy")}
              </p>
              <p className="text-4xl font-bold mt-2">
                {formatIST(currentTime, "h:mm a")}
              </p>
              <p className="text-blue-200 text-sm mt-1">
                {user?.fullName && `Welcome, ${user.fullName.split(" ")[0]}!`}
              </p>
            </div>

            {loadingToday ? (
              <Skeleton className="h-12 w-40 bg-white/20" />
            ) : !today ? (
              <Button
                size="lg"
                variant="secondary"
                onClick={handleClockIn}
                disabled={isClockingIn}
                className="px-8 shadow-lg"
              >
                <LogIn className="mr-2 h-5 w-5" />
                {isClockingIn ? "Clocking in..." : "Clock In"}
              </Button>
            ) : !today.clockOutTime ? (
              <div className="flex items-center gap-4">
                <div className="text-center bg-white/10 rounded-lg px-4 py-2">
                  <p className="text-sm text-blue-100">Clocked in</p>
                  <p className="font-bold text-lg">
                    {formatStoredTime(today.clockInTime)}
                  </p>
                </div>
                {workingTime && (
                  <div className="text-center bg-white/10 rounded-lg px-4 py-2 w-32">
                    <p className="text-sm text-blue-100">Duration</p>
                    <p className="font-bold text-lg">{workingTime}</p>
                  </div>
                )}
                <Button
                  size="lg"
                  variant="secondary"
                  onClick={handleClockOut}
                  disabled={isClockingOut}
                  className="shadow-lg"
                >
                  <LogOut className="mr-2 h-5 w-5" />
                  {isClockingOut ? "Clocking out..." : "Clock Out"}
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-3 bg-white/20 rounded-lg px-5 py-3">
                <CheckCircle className="h-6 w-6" />
                <div>
                  <p className="font-semibold">Day Complete!</p>
                  <p className="text-sm text-blue-100">
                    {today.totalHours}h worked today
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Employee Analytics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Today's Details */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Today's Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            {today ? (
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <LogIn className="h-5 w-5 mx-auto text-green-500 mb-1" />
                  <p className="text-xs text-muted-foreground">Clock In</p>
                  <p className="font-semibold">
                    {formatStoredTime(today.clockInTime)}
                  </p>
                </div>
                <div className="text-center">
                  <LogOut className="h-5 w-5 mx-auto text-red-500 mb-1" />
                  <p className="text-xs text-muted-foreground">Clock Out</p>
                  <p className="font-semibold">
                    {today.clockOutTime
                      ? formatStoredTime(today.clockOutTime)
                      : "--:--"}
                  </p>
                </div>
                <div className="text-center">
                  <Timer className="h-5 w-5 mx-auto text-blue-500 mb-1" />
                  <p className="text-xs text-muted-foreground">Hours</p>
                  <p className="font-semibold">
                    {today.totalHours ? `${today.totalHours}h` : "--"}
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Not clocked in yet today</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Monthly Summary */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              This Month
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingSummary ? (
              <div className="grid grid-cols-4 gap-2">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-12" />
                ))}
              </div>
            ) : summary ? (
              <div className="grid grid-cols-4 gap-2">
                <div className="text-center p-2 bg-green-50 rounded-lg">
                  <p className="text-lg font-bold text-green-600">
                    {summary.present || 0}
                  </p>
                  <p className="text-[10px] text-muted-foreground">Present</p>
                </div>
                <div className="text-center p-2 bg-amber-50 rounded-lg">
                  <p className="text-lg font-bold text-amber-600">
                    {summary.late || 0}
                  </p>
                  <p className="text-[10px] text-muted-foreground">Late</p>
                </div>
                <div className="text-center p-2 bg-red-50 rounded-lg">
                  <p className="text-lg font-bold text-red-600">
                    {summary.absent || 0}
                  </p>
                  <p className="text-[10px] text-muted-foreground">Absent</p>
                </div>
                <div className="text-center p-2 bg-blue-50 rounded-lg">
                  <p className="text-lg font-bold text-blue-600">
                    {summary.totalHours || 0}h
                  </p>
                  <p className="text-[10px] text-muted-foreground">Hours</p>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground text-sm text-center py-4">
                No data available
              </p>
            )}
          </CardContent>
        </Card>

        {/* Attendance Distribution Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Your Attendance
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={120}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={25}
                    outerRadius={45}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[120px] text-muted-foreground text-sm">
                No data yet
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Weekly Hours Chart Section */}
      <Card className="mt-6">
        <CardHeader className="pb-2">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart className="h-4 w-4" />
              Weekly Working Hours
            </CardTitle>
            <div className="flex items-center gap-2">
              {/* Admin User Selector */}
              {isAdmin && (
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="h-8 rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                >
                  <option value="">My Hours</option>
                  {usersAttendance.map((ua: any) => (
                    <option key={ua.user.id} value={ua.user.id}>
                      {ua.user.fullName}
                    </option>
                  ))}
                </select>
              )}
              {/* Week Navigation */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setWeekOffset((prev) => prev - 1)}
              >
                ← Previous
              </Button>
              <span className="text-sm text-muted-foreground min-w-[120px] text-center">
                {format(new Date(weekStartDate), "MMM d")} -{" "}
                {format(
                  new Date(
                    new Date(weekStartDate).getTime() + 6 * 24 * 60 * 60 * 1000,
                  ),
                  "MMM d, yyyy",
                )}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setWeekOffset((prev) => prev + 1)}
                disabled={weekOffset >= 0}
              >
                Next →
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loadingWeeklyHours ? (
            <Skeleton className="h-[200px] w-full" />
          ) : weeklyHoursData && weeklyHoursData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={weeklyHoursData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="day"
                  stroke="#888888"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#888888"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `${value}h`}
                  domain={[0, 12]}
                />
                <Tooltip
                  formatter={(value) => [`${value ?? 0} hours`, "Hours"]}
                  labelFormatter={(label) => {
                    const dayData = weeklyHoursData.find(
                      (d: any) => d.day === label,
                    );
                    return dayData
                      ? `${label} (${format(new Date(dayData.date), "MMM d")})`
                      : label;
                  }}
                />
                <Bar dataKey="hours" radius={[4, 4, 0, 0]} fill="#3b82f6">
                  {weeklyHoursData.map((entry: any, index: number) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.isWeekend ? "#94a3b8" : "#3b82f6"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">
              No data for this week
            </div>
          )}
          <div className="flex items-center justify-center gap-4 mt-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-blue-500" />
              Weekday
            </span>
            <span className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-slate-400" />
              Weekend (Holiday)
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Admin Section */}
      {isAdmin && (
        <>
          {/* Period Filter */}
          <div className="flex flex-wrap items-center gap-3 pt-4 border-t">
            <h2 className="text-lg font-semibold mr-4">Team Overview</h2>
            <Tabs
              value={dateRange}
              onValueChange={(v) => setDateRange(v as DateRangeType)}
              className="w-full sm:w-auto"
            >
              <TabsList className="flex-wrap h-auto gap-1">
                <TabsTrigger value="today" className="text-xs">
                  Today
                </TabsTrigger>
                <TabsTrigger value="yesterday" className="text-xs">
                  Yesterday
                </TabsTrigger>
                <TabsTrigger value="thisWeek" className="text-xs">
                  This Week
                </TabsTrigger>
                <TabsTrigger value="thisMonth" className="text-xs">
                  This Month
                </TabsTrigger>
                <TabsTrigger value="thisQuarter" className="text-xs">
                  Quarter
                </TabsTrigger>
                <TabsTrigger value="custom" className="text-xs">
                  Custom
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {dateRange === "custom" && (
              <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <CalendarIcon className="h-4 w-4" />
                    {customDateMode === "single" ||
                    customDateRange.from.getTime() ===
                      customDateRange.to.getTime()
                      ? format(customDateRange.from, "MMM d, yyyy")
                      : `${format(customDateRange.from, "MMM d")} - ${format(
                          customDateRange.to,
                          "MMM d, yyyy",
                        )}`}
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-3" align="start">
                  <div className="flex gap-2 mb-3">
                    <Button
                      variant={
                        customDateMode === "single" ? "default" : "outline"
                      }
                      size="sm"
                      onClick={() => {
                        setCustomDateMode("single");
                        setCustomDateRange({
                          from: customDateRange.from,
                          to: customDateRange.from,
                        });
                      }}
                    >
                      Single Date
                    </Button>
                    <Button
                      variant={
                        customDateMode === "range" ? "default" : "outline"
                      }
                      size="sm"
                      onClick={() => setCustomDateMode("range")}
                    >
                      Date Range
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">
                    Max 1 year range allowed
                  </p>
                  {customDateMode === "single" ? (
                    <Calendar
                      mode="single"
                      selected={customDateRange.from}
                      onSelect={(date) => {
                        if (date) {
                          setCustomDateRange({ from: date, to: date });
                          setIsCalendarOpen(false);
                        }
                      }}
                      disabled={(date) =>
                        date > new Date() || date < oneYearAgo
                      }
                      numberOfMonths={1}
                      captionLayout="dropdown"
                      fromYear={oneYearAgo.getFullYear()}
                      toYear={new Date().getFullYear()}
                    />
                  ) : (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        <div
                          className={`p-2 rounded-md border cursor-pointer text-sm ${
                            activeRangeField === "from"
                              ? "bg-primary/10 border-primary ring-1 ring-primary/20"
                              : "hover:bg-accent"
                          }`}
                          onClick={() => setActiveRangeField("from")}
                        >
                          <span className="text-xs text-muted-foreground block mb-1">
                            Start Date
                          </span>
                          <div className="font-medium">
                            {format(customDateRange.from, "MMM d, yyyy")}
                          </div>
                        </div>
                        <div
                          className={`p-2 rounded-md border cursor-pointer text-sm ${
                            activeRangeField === "to"
                              ? "bg-primary/10 border-primary ring-1 ring-primary/20"
                              : "hover:bg-accent"
                          }`}
                          onClick={() => setActiveRangeField("to")}
                        >
                          <span className="text-xs text-muted-foreground block mb-1">
                            End Date
                          </span>
                          <div className="font-medium">
                            {format(customDateRange.to, "MMM d, yyyy")}
                          </div>
                        </div>
                      </div>
                      <Calendar
                        mode="single"
                        selected={
                          activeRangeField === "from"
                            ? customDateRange.from
                            : customDateRange.to
                        }
                        defaultMonth={
                          activeRangeField === "from"
                            ? customDateRange.from
                            : customDateRange.to
                        }
                        onSelect={(date) => {
                          if (!date) return;

                          if (activeRangeField === "from") {
                            // Validate start date logic
                            if (date > customDateRange.to) {
                              setCustomDateRange({ from: date, to: date });
                              setActiveRangeField("to");
                            } else if (
                              differenceInDays(customDateRange.to, date) > 365
                            ) {
                              toast.error("Range cannot exceed 1 year");
                            } else {
                              setCustomDateRange({
                                ...customDateRange,
                                from: date,
                              });
                              setActiveRangeField("to");
                            }
                          } else {
                            // Validate end date logic
                            if (date < customDateRange.from) {
                              setCustomDateRange({
                                from: date,
                                to: customDateRange.from,
                              });
                              // Don't auto switch, maybe they meant to pick start, but actually this logic implies they picked a date BEFORE start, so treat it as start?
                              // Standard behavior usually updates the field. Let's just update field.
                              // Actually better UX: if picking 'To' and date < 'From', set 'to' but warn or handle?
                              // Actually standard behavior: swap if picking end < start? Or just fail?
                              // Let's swap to ensure consistency
                              setCustomDateRange({
                                from: date,
                                to: customDateRange.from,
                              });
                              // actually this effectively sets NEW start = date, and NEW end = OLD from
                            } else if (
                              differenceInDays(date, customDateRange.from) > 365
                            ) {
                              toast.error("Range cannot exceed 1 year");
                            } else {
                              setCustomDateRange({
                                ...customDateRange,
                                to: date,
                              });
                              setIsCalendarOpen(false); // Close on end date selection
                            }
                          }
                        }}
                        disabled={(date) =>
                          date > new Date() || date < oneYearAgo
                        }
                        numberOfMonths={1}
                        captionLayout="dropdown"
                        fromYear={oneYearAgo.getFullYear()}
                        toYear={new Date().getFullYear()}
                      />
                    </div>
                  )}
                </PopoverContent>
              </Popover>
            )}

            <span className="text-sm text-muted-foreground ml-auto">
              {startDate === endDate
                ? format(new Date(startDate), "MMM d, yyyy")
                : `${format(new Date(startDate), "MMM d")} - ${format(
                    new Date(endDate),
                    "MMM d, yyyy",
                  )}`}
            </span>
          </div>

          {/* Analytics Cards + Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 gap-4 lg:col-span-2">
              {loadingAnalytics ? (
                [...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-24" />
                ))
              ) : analytics ? (
                <>
                  <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-200 rounded-lg">
                          <CheckCircle className="h-5 w-5 text-green-700" />
                        </div>
                        <div>
                          <p className="text-3xl font-bold text-green-700">
                            {analytics.present}
                          </p>
                          <p className="text-xs text-green-600">Present</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-200 rounded-lg">
                          <Clock className="h-5 w-5 text-amber-700" />
                        </div>
                        <div>
                          <p className="text-3xl font-bold text-amber-700">
                            {analytics.late}
                          </p>
                          <p className="text-xs text-amber-600">Late</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-red-200 rounded-lg">
                          <AlertCircle className="h-5 w-5 text-red-700" />
                        </div>
                        <div>
                          <p className="text-3xl font-bold text-red-700">
                            {analytics.absent}
                          </p>
                          <p className="text-xs text-red-600">Absent</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-200 rounded-lg">
                          <TrendingUp className="h-5 w-5 text-purple-700" />
                        </div>
                        <div>
                          <p className="text-3xl font-bold text-purple-700">
                            {analytics.attendanceRate}%
                          </p>
                          <p className="text-xs text-purple-600">
                            Attendance Rate
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </>
              ) : null}
            </div>

            {/* Status Bar Chart */}
            <Card className="lg:col-span-1">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Status Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                {statusBarData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={statusBarData} layout="vertical">
                      <XAxis type="number" hide />
                      <YAxis
                        type="category"
                        dataKey="status"
                        tick={{ fontSize: 11 }}
                        width={60}
                      />
                      <Tooltip />
                      <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                        {statusBarData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[180px] flex items-center justify-center text-muted-foreground text-sm">
                    No data
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Pie Chart */}
            <Card className="lg:col-span-1">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Period Totals</CardTitle>
              </CardHeader>
              <CardContent>
                {adminPieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie
                        data={adminPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={35}
                        outerRadius={60}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {adminPieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend
                        iconSize={8}
                        wrapperStyle={{ fontSize: "10px" }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[180px] flex items-center justify-center text-muted-foreground text-sm">
                    No data
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Users Attendance Table */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Team Attendance
                  {!loadingUsers && (
                    <Badge variant="secondary">
                      {usersAttendance.length} users
                    </Badge>
                  )}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {loadingUsers ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-14" />
                  ))}
                </div>
              ) : usersAttendance.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">
                    No attendance records found for this date.
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Try selecting a different date range.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="hidden sm:table-cell">
                          Clock In
                        </TableHead>
                        <TableHead className="hidden sm:table-cell">
                          Clock Out
                        </TableHead>
                        <TableHead className="hidden md:table-cell">
                          Hours
                        </TableHead>
                        <TableHead className="text-right">Details</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {usersAttendance.map((item: any) => (
                        <TableRow key={item.user.id} className="group">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={item.user.avatarUrl} />
                                <AvatarFallback className="text-xs">
                                  {getInitials(item.user.fullName)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <p className="font-medium text-sm truncate">
                                  {item.user.fullName}
                                </p>
                                <p className="text-xs text-muted-foreground capitalize">
                                  {item.user.role}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={
                                statusColors[item.status] ||
                                "bg-gray-100 text-gray-700"
                              }
                            >
                              {statusIcons[item.status] || "⚪"}{" "}
                              {item.status?.replace("_", " ")}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell font-mono text-sm">
                            {item.attendance?.clockInTime
                              ? format(
                                  new Date(item.attendance.clockInTime),
                                  "h:mm a",
                                )
                              : "--:--"}
                          </TableCell>
                          <TableCell className="hidden sm:table-cell font-mono text-sm">
                            {item.attendance?.clockOutTime
                              ? format(
                                  new Date(item.attendance.clockOutTime),
                                  "h:mm a",
                                )
                              : "--:--"}
                          </TableCell>
                          <TableCell className="hidden md:table-cell font-mono text-sm">
                            {item.attendance?.totalHours
                              ? `${item.attendance.totalHours}h`
                              : "--"}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                router.push(`/attendance/${item.user.id}`)
                              }
                              className="opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              View <ExternalLink className="ml-1 h-3 w-3" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
