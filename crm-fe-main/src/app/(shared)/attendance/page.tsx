"use client";

import { useState, useMemo, useEffect, Fragment, useCallback } from "react";
import { useRouter } from "next/navigation";
import useSWR, { mutate } from "swr";
import { attendanceApi } from "@/lib/api";
import { getInitials } from "@/lib/utils";
import { toast } from "sonner";
import { useAuth, useIsAdmin } from "@/providers/auth-provider";
import { useDepartment } from "@/providers/department-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  ChevronLeft,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  Gift,
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
  formatHoursToReadable,
} from "@/lib/date-utils";
import { useHeaderRefresh } from "@/hooks/use-header-refresh";

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
  holiday: "bg-violet-100 text-violet-700",
  week_off: "bg-slate-100 text-slate-600",
};

type UserDaySession = {
  id?: string;
  clockInTime?: string | null;
  clockOutTime?: string | null;
  totalHours?: number | null;
};

type UsersTodayItem = {
  user: {
    id: string;
    fullName: string;
    avatarUrl?: string | null;
    role?: string | null;
    shiftType?: string | null;
  };
  status: string;
  attendance?: {
    clockInTime?: string | null;
    clockOutTime?: string | null;
    totalHours?: number | null;
    sessions?: UserDaySession[];
  } | null;
};

export default function AttendancePage() {
  const router = useRouter();
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const isAdmin = useIsAdmin();
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
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [shiftFilter, setShiftFilter] = useState<string>("all");
  const oneYearAgo = useMemo(() => subYears(new Date(), 1), []);

  // Personal attendance history state
  const [myHistoryYear, setMyHistoryYear] = useState<number>(new Date().getFullYear());
  const [myHistoryMonth, setMyHistoryMonth] = useState<number>(new Date().getMonth() + 1);
  const [myHistoryMode, setMyHistoryMode] = useState<"month" | "custom">("month");
  const [myHistoryCustomRange, setMyHistoryCustomRange] = useState({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) });
  const [myHistoryCalOpen, setMyHistoryCalOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [authLoading, isAuthenticated, router]);

  const weekStartDate = useMemo(() => {
    const today = nowIST();
    const targetDate = addWeeks(today, weekOffset);
    return format(startOfWeek(targetDate, { weekStartsOn: 1 }), "yyyy-MM-dd");
  }, [weekOffset]);

  const { data: weeklyHoursData, isLoading: loadingWeeklyHours } = useSWR(
    isAuthenticated ? ["attendance-weekly", weekStartDate, selectedUserId] : null,
    () =>
      attendanceApi
        .getWeeklyHours(selectedUserId || undefined, weekStartDate),
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

  const myHistoryStartDate = useMemo(
    () =>
      myHistoryMode === "custom"
        ? format(myHistoryCustomRange.from, "yyyy-MM-dd")
        : format(startOfMonth(new Date(myHistoryYear, myHistoryMonth - 1)), "yyyy-MM-dd"),
    [myHistoryMode, myHistoryYear, myHistoryMonth, myHistoryCustomRange.from],
  );
  const myHistoryEndDate = useMemo(
    () =>
      myHistoryMode === "custom"
        ? format(myHistoryCustomRange.to, "yyyy-MM-dd")
        : format(endOfMonth(new Date(myHistoryYear, myHistoryMonth - 1)), "yyyy-MM-dd"),
    [myHistoryMode, myHistoryYear, myHistoryMonth, myHistoryCustomRange.to],
  );

  // Fetch data
  const { data: todayData, isLoading: loadingToday } = useSWR(
    isAuthenticated && user ? ["attendance-today", user.id] : null,
    () => attendanceApi.getToday(),
  );

  const { data: summaryData, isLoading: loadingSummary } = useSWR(
    isAuthenticated && user ? ["attendance-summary", user.id] : null,
    () => attendanceApi.getSummary(),
  );

  const { data: shiftRule } = useSWR(
    isAuthenticated && user
      ? ["attendance-rule", user.shiftType || "day_shift"]
      : null,
    () => attendanceApi.getRules(user?.shiftType || "day_shift"),
  );

  const { currentDepartment } = useDepartment();

  const { data: myHistoryData, isLoading: loadingMyHistory } = useSWR(
    isAuthenticated && user
      ? ["my-history", user.id, myHistoryStartDate, myHistoryEndDate]
      : null,
    () => attendanceApi.getUserHistory(user!.id, myHistoryStartDate, myHistoryEndDate),
  );
  const { data: myMonthSummary, isLoading: loadingMyMonthSummary } = useSWR(
    isAuthenticated && user && myHistoryMode === "month"
      ? ["my-month-summary", user.id, myHistoryMonth, myHistoryYear]
      : null,
    () => attendanceApi.getSummary(myHistoryMonth, myHistoryYear),
  );

  const { data: analyticsData, isLoading: loadingAnalytics } = useSWR(
    isAuthenticated && isAdmin
      ? ["attendance-analytics", startDate, endDate, currentDepartment?.id]
      : null,
    () =>
      attendanceApi
        .getAnalytics(startDate, endDate, currentDepartment?.id),
  );

  const currentYear = new Date().getFullYear();
  const { data: holidaysData } = useSWR(
    isAuthenticated ? ["holidays-current-year", currentYear] : null,
    () => attendanceApi.getHolidays(currentYear),
  );

  const todayHoliday = useMemo(() => {
    if (!Array.isArray(holidaysData)) return null;
    const todayStr = format(nowIST(), "yyyy-MM-dd");
    return (
      holidaysData.find((h: any) => {
        const d: string = h.date || h.holiday_date || "";
        return d === todayStr;
      }) ?? null
    );
  }, [holidaysData]);

  const { data: usersAttendanceData, isLoading: loadingUsers } = useSWR(
    isAuthenticated && isAdmin
      ? ["attendance-users", startDate, currentDepartment?.id]
      : null,
    () =>
      attendanceApi
        .getUsersToday(startDate, currentDepartment?.id),
  );

  const refreshAttendanceData = useCallback(async () => {
    const refreshers: Promise<unknown>[] = [
      mutate((key) => Array.isArray(key) && key[0] === "attendance-weekly"),
      mutate((key) => Array.isArray(key) && key[0] === "attendance-today"),
      mutate((key) => Array.isArray(key) && key[0] === "attendance-summary"),
      mutate((key) => Array.isArray(key) && key[0] === "attendance-rule"),
      mutate((key) => Array.isArray(key) && key[0] === "my-history"),
      mutate((key) => Array.isArray(key) && key[0] === "my-month-summary"),
      mutate((key) => Array.isArray(key) && key[0] === "holidays-current-year"),
    ];

    if (isAdmin) {
      refreshers.push(
        mutate((key) => Array.isArray(key) && key[0] === "attendance-analytics"),
        mutate((key) => Array.isArray(key) && key[0] === "attendance-users"),
      );
    }

    await Promise.all(refreshers);
  }, [isAdmin]);

  useHeaderRefresh({
    onRefresh: refreshAttendanceData,
  });

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
      toast.success("ðŸ• Clocked in successfully! Have a productive day!");
      // Invalidate all relevant cache keys
      mutate((key) => Array.isArray(key) && key[0] === "attendance-today");
      mutate((key) => Array.isArray(key) && key[0] === "attendance-summary");
      if (isAdmin) {
        mutate((key) => Array.isArray(key) && key[0] === "attendance-users");
        mutate((key) => Array.isArray(key) && key[0] === "attendance-analytics");
      }
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
      toast.success("ðŸ‘‹ Clocked out successfully! See you tomorrow!");
      // Invalidate all relevant cache keys
      mutate((key) => Array.isArray(key) && key[0] === "attendance-today");
      mutate((key) => Array.isArray(key) && key[0] === "attendance-summary");
      if (isAdmin) {
        mutate((key) => Array.isArray(key) && key[0] === "attendance-users");
        mutate((key) => Array.isArray(key) && key[0] === "attendance-analytics");
      }
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
  const hasOpenSession = Boolean(today?.clockInTime && !today?.clockOutTime);
  const canShowClockIn = !hasOpenSession;
  const isHolidayToday = Boolean(
    today?.isNoSession && today?.status === "holiday",
  );
  const todaySessions = Array.isArray(today?.sessions)
    ? today.sessions
    : today
      ? [today]
      : [];
  const todayTotalHours = today?.today?.totalHours ?? today?.totalHours ?? 0;
  const summary = summaryData;
  const analytics = analyticsData;
  const allUsersAttendance = usersAttendanceData || [];

  // Filter users by shift
  const usersAttendance = useMemo(() => {
    if (shiftFilter === "all") return allUsersAttendance;
    return allUsersAttendance.filter(
      (item: any) => item.user.shiftType === shiftFilter,
    );
  }, [allUsersAttendance, shiftFilter]);

  const weeklyTooltip = ({
    active,
    payload,
    label,
  }: {
    active?: boolean;
    payload?: readonly any[];
    label?: string | number;
  }) => {
    if (!active || !payload || payload.length === 0) return null;
    const row = payload[0]?.payload;
    return (
      <div className="rounded-md border bg-background p-2 shadow-md text-xs">
        <p className="font-semibold">{label}</p>
        <p className="text-muted-foreground">
          Date: {row?.date ? format(new Date(row.date), "MMM d, yyyy") : "-"}
        </p>
        <p>
          Hours:{" "}
          {typeof row?.hours === "number"
            ? formatHoursToReadable(row.hours, "0m")
            : "0m"}
        </p>
        <p>
          Clock In:{" "}
          {row?.clockInTime ? formatStoredTime(row.clockInTime) : "--:--"}
        </p>
        <p>
          Clock Out:{" "}
          {row?.clockOutTime ? formatStoredTime(row.clockOutTime) : "--:--"}
        </p>
      </div>
    );
  };

  const shiftWindow = useMemo(() => {
    if (!user) return null;
    const shiftType = user.shiftType || "day_shift";
    const startRaw =
      shiftRule?.workStartTime ||
      (shiftType === "night_shift" ? "19:00" : "09:00");
    const endRaw =
      shiftRule?.workEndTime || (shiftType === "night_shift" ? "04:15" : "18:15");
    const [startHour = "00", startMinute = "00"] = String(startRaw).split(":");
    const [endHour = "00", endMinute = "00"] = String(endRaw).split(":");

    const now = nowIST();
    const currentHour = parseInt(formatIST(now, "HH"));
    const currentMinute = parseInt(formatIST(now, "mm"));
    const isNightEarlyMorning =
      shiftType === "night_shift" &&
      (currentHour < 4 || (currentHour === 4 && currentMinute <= 15));

    const shiftDate = new Date(now);
    if (isNightEarlyMorning) {
      shiftDate.setDate(shiftDate.getDate() - 1);
    }
    // Must use IST date formatting; local timezone formatting can shift day boundary.
    const shiftDateStr = formatIST(shiftDate, "yyyy-MM-dd");
    const shiftStart = new Date(
      `${shiftDateStr}T${startHour.padStart(2, "0")}:${startMinute.padStart(2, "0")}:00+05:30`,
    );

    const startMinutes = parseInt(startHour, 10) * 60 + parseInt(startMinute, 10);
    const endMinutes = parseInt(endHour, 10) * 60 + parseInt(endMinute, 10);
    const crossesMidnight = endMinutes <= startMinutes;
    const shiftEnd = new Date(
      `${shiftDateStr}T${endHour.padStart(2, "0")}:${endMinute.padStart(2, "0")}:00+05:30`,
    );
    if (crossesMidnight) {
      shiftEnd.setDate(shiftEnd.getDate() + 1);
    }
    return { shiftType, shiftStart, shiftEnd };
  }, [shiftRule, user]);

  const navigateMyHistoryMonth = (delta: number) => {
    let m = myHistoryMonth + delta;
    let y = myHistoryYear;
    if (m > 12) { m = 1; y++; }
    if (m < 1) { m = 12; y--; }
    setMyHistoryMonth(m);
    setMyHistoryYear(y);
  };
  const isMHCurrent =
    myHistoryYear === new Date().getFullYear() &&
    myHistoryMonth === new Date().getMonth() + 1;

  if (authLoading || !isAuthenticated || !user) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-44 w-full" />
      </div>
    );
  }

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
              {shiftWindow && (
                <p className="text-blue-200 text-xs mt-1">
                  {shiftWindow.shiftType === "night_shift"
                    ? "Night Shift"
                    : "Day Shift"}{" "}
                  {formatIST(shiftWindow.shiftStart, "h:mm a")} -{" "}
                  {formatIST(shiftWindow.shiftEnd, "h:mm a")} IST
                </p>
              )}
              {isHolidayToday && (
                <div className="mt-2 inline-flex items-center gap-1.5 bg-white/20 rounded-full px-3 py-1">
                  <Gift className="h-3.5 w-3.5" />
                  <span className="text-xs font-medium">
                    {todayHoliday?.name ?? "Public Holiday"}
                  </span>
                </div>
              )}
            </div>

            {loadingToday ? (
              <Skeleton className="h-12 w-40 bg-white/20" />
            ) : isHolidayToday ? (
              <div className="flex flex-col items-end gap-3">
                <div className="flex items-center gap-2 bg-white/20 rounded-lg px-4 py-3">
                  <Gift className="h-5 w-5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-sm">
                      {todayHoliday?.name ?? "Public Holiday"}
                    </p>
                    <p className="text-xs text-blue-100">Enjoy your day off!</p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleClockIn}
                  disabled={isClockingIn}
                  className="text-xs"
                >
                  <LogIn className="mr-1.5 h-3.5 w-3.5" />
                  {isClockingIn ? "Clocking in..." : "Working today? Clock In"}
                </Button>
              </div>
            ) : canShowClockIn ? (
              <div className="flex flex-col items-end gap-2">
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
              </div>
            ) : hasOpenSession ? (
              <div className="flex items-center gap-4">
                <div className="text-center bg-white/10 rounded-lg px-4 py-2">
                  <p className="text-sm text-blue-100">Clocked in</p>
                  <p className="font-bold text-lg">
                    {today?.clockInTime ? formatStoredTime(today.clockInTime) : "--:--"}
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
                    {formatHoursToReadable(todayTotalHours)} worked today
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
              <div className="space-y-4">
                {today.isNoSession && today.status === "holiday" && (
                  <div className="flex items-center gap-2 rounded-md bg-violet-50 px-3 py-2">
                    <Gift className="h-4 w-4 text-violet-600 flex-shrink-0" />
                    <span className="text-xs font-medium text-violet-700">
                      {todayHoliday?.name
                        ? `Holiday: ${todayHoliday.name}`
                        : "Public Holiday — no session required"}
                    </span>
                  </div>
                )}
                <div className="grid grid-cols-4 gap-4">
                  <div className="text-center">
                    <CheckCircle className="h-5 w-5 mx-auto text-violet-500 mb-1" />
                    <p className="text-xs text-muted-foreground">Sessions</p>
                    <p className="font-semibold">{today?.today?.sessionsCount ?? todaySessions.length}</p>
                  </div>
                <div className="text-center">
                  <LogIn className="h-5 w-5 mx-auto text-green-500 mb-1" />
                  <p className="text-xs text-muted-foreground">Clock In</p>
                  <p className="font-semibold">
                    {today.clockInTime ? formatStoredTime(today.clockInTime) : "--:--"}
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
                    {formatHoursToReadable(todayTotalHours)}
                  </p>
                </div>
                </div>
                {todaySessions.length > 0 && (
                  <div className="rounded-md border p-3">
                    <p className="text-xs font-medium text-muted-foreground mb-2">Today's Sessions</p>
                    <div className="space-y-1">
                      {todaySessions.map((session: any, index: number) => (
                        <div key={session.id || index} className="text-xs flex items-center justify-between">
                          <span>
                            {session.clockInTime ? formatStoredTime(session.clockInTime) : "--:--"}{" "}
                            -{" "}
                            {session.clockOutTime ? formatStoredTime(session.clockOutTime) : "Active"}
                          </span>
                          <span className="text-muted-foreground">
                            {typeof session.totalHours === "number"
                              ? formatHoursToReadable(session.totalHours)
                              : "--"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                {today?.isNoSession && today?.status ? (
                  <>
                    <p className="text-sm mb-2">No session today</p>
                    <Badge
                      className={`capitalize ${
                        statusColors[today.status] ?? "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {today.status === "week_off"
                        ? "Week Off"
                        : today.status === "half_day"
                          ? "Half Day"
                          : today.status.charAt(0).toUpperCase() + today.status.slice(1)}
                    </Badge>
                  </>
                ) : (
                  <p className="text-sm">Not clocked in yet today</p>
                )}
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
                    {formatHoursToReadable(summary.totalHours || 0)}
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
                <ChevronLeft className="h-4 w-4 mr-1" /> Previous
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
                Next <ChevronRight className="h-4 w-4 ml-1" />
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
                <Tooltip content={weeklyTooltip} />
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
              No working-hour data for this week
            </div>
          )}
          <div className="flex items-center justify-center gap-4 mt-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-blue-500" />
              Weekday
            </span>
            <span className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-slate-400" />
              Weekend (Office Off)
            </span>
          </div>
        </CardContent>
      </Card>

      {/* My Attendance History */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              My Attendance History
            </CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              {myHistoryMode === "month" ? (
                <>
                  <Button variant="outline" size="sm" onClick={() => navigateMyHistoryMonth(-1)}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm font-medium min-w-[100px] text-center">
                    {format(new Date(myHistoryYear, myHistoryMonth - 1), "MMMM yyyy")}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigateMyHistoryMonth(1)}
                    disabled={isMHCurrent}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <Popover open={myHistoryCalOpen} onOpenChange={setMyHistoryCalOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2">
                      <CalendarIcon className="h-4 w-4" />
                      {format(myHistoryCustomRange.from, "MMM d")} –{" "}
                      {format(myHistoryCustomRange.to, "MMM d, yyyy")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-3" align="end">
                    <Calendar
                      mode="range"
                      selected={{ from: myHistoryCustomRange.from, to: myHistoryCustomRange.to }}
                      onSelect={(range) => {
                        if (range?.from) {
                          setMyHistoryCustomRange({
                            from: range.from,
                            to: range.to || range.from,
                          });
                          if (range.from && range.to) setMyHistoryCalOpen(false);
                        }
                      }}
                      disabled={(date) => date > new Date() || date < oneYearAgo}
                      numberOfMonths={2}
                      captionLayout="dropdown"
                      fromYear={oneYearAgo.getFullYear()}
                      toYear={new Date().getFullYear()}
                    />
                  </PopoverContent>
                </Popover>
              )}
              <Button
                variant={myHistoryMode === "custom" ? "default" : "outline"}
                size="sm"
                onClick={() =>
                  setMyHistoryMode(myHistoryMode === "custom" ? "month" : "custom")
                }
              >
                {myHistoryMode === "custom" ? "Month View" : "Custom Range"}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Summary stats row */}
          {(() => {
            const stats = myHistoryMode === "month" ? myMonthSummary : myHistoryData?.summary;
            const loading =
              myHistoryMode === "month" ? loadingMyMonthSummary : loadingMyHistory;
            if (loading) {
              return (
                <div className="grid grid-cols-4 sm:grid-cols-7 gap-2 mb-4">
                  {[...Array(7)].map((_, i) => (
                    <Skeleton key={i} className="h-12" />
                  ))}
                </div>
              );
            }
            if (!stats) return null;
            return (
              <div className="grid grid-cols-4 sm:grid-cols-7 gap-2 mb-4">
                <div className="text-center p-2 bg-green-50 rounded">
                  <p className="text-lg font-bold text-green-600">{stats.present || 0}</p>
                  <p className="text-[10px] text-muted-foreground">Present</p>
                </div>
                <div className="text-center p-2 bg-amber-50 rounded">
                  <p className="text-lg font-bold text-amber-600">{stats.late || 0}</p>
                  <p className="text-[10px] text-muted-foreground">Late</p>
                </div>
                <div className="text-center p-2 bg-orange-50 rounded">
                  <p className="text-lg font-bold text-orange-600">
                    {(stats as any).halfDay ?? (stats as any).half_day ?? 0}
                  </p>
                  <p className="text-[10px] text-muted-foreground">Half Day</p>
                </div>
                <div className="text-center p-2 bg-red-50 rounded">
                  <p className="text-lg font-bold text-red-600">{stats.absent || 0}</p>
                  <p className="text-[10px] text-muted-foreground">Absent</p>
                </div>
                <div className="text-center p-2 bg-blue-50 rounded">
                  <p className="text-lg font-bold text-blue-600">{stats.leave || 0}</p>
                  <p className="text-[10px] text-muted-foreground">On Leave</p>
                </div>
                {myHistoryMode === "month" && (
                  <div className="text-center p-2 bg-slate-50 rounded">
                    <p className="text-lg font-bold text-slate-600">
                      {(stats as any).week_off || 0}
                    </p>
                    <p className="text-[10px] text-muted-foreground">Week Off</p>
                  </div>
                )}
                <div className="text-center p-2 bg-indigo-50 rounded">
                  <p className="text-lg font-bold text-indigo-600">
                    {formatHoursToReadable(stats.totalHours || 0)}
                  </p>
                  <p className="text-[10px] text-muted-foreground">Total hrs</p>
                </div>
              </div>
            );
          })()}

          {/* Records table */}
          {loadingMyHistory ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-10" />
              ))}
            </div>
          ) : (myHistoryData?.records?.length ?? 0) > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Day</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden sm:table-cell">Clock In</TableHead>
                    <TableHead className="hidden sm:table-cell">Clock Out</TableHead>
                    <TableHead>Hours</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {myHistoryData!.records.map((rec: any) => (
                    <TableRow key={rec.id}>
                      <TableCell className="font-mono text-sm">
                        {rec.date
                          ? format(new Date(`${rec.date}T12:00:00`), "MMM d, yyyy")
                          : "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {rec.date
                          ? format(new Date(`${rec.date}T12:00:00`), "EEE")
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={statusColors[rec.status] || "bg-gray-100 text-gray-700"}
                        >
                          {rec.status === "week_off"
                            ? "Week Off"
                            : rec.status === "half_day"
                              ? "Half Day"
                              : rec.status
                                ? rec.status.charAt(0).toUpperCase() + rec.status.slice(1)
                                : "—"}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell font-mono text-sm">
                        {rec.clockInTime ? formatStoredTime(rec.clockInTime) : "—"}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell font-mono text-sm">
                        {rec.clockOutTime ? formatStoredTime(rec.clockOutTime) : "—"}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {typeof rec.totalHours === "number"
                          ? formatHoursToReadable(rec.totalHours)
                          : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <CalendarDays className="h-10 w-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No attendance records found for this period</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Admin Section */}
      {isAdmin && (
        <>
          {/* Period Filter */}
          <div className="flex flex-wrap items-center gap-3 pt-4 border-t">
            <h2 className="text-lg font-semibold mr-4">Team Overview</h2>
            {/* Shift Filter */}
            <Select value={shiftFilter} onValueChange={setShiftFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by shift" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Shifts</SelectItem>
                <SelectItem value="day_shift">Day Shift</SelectItem>
                <SelectItem value="night_shift">Night Shift</SelectItem>
              </SelectContent>
            </Select>
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
                      {allUsersAttendance.length} users
                      {shiftFilter !== "all" &&
                        ` (${usersAttendance.length} filtered)`}
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
                        <TableHead>Shift</TableHead>
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
                      {usersAttendance.map((item: UsersTodayItem) => {
                        const sessions = Array.isArray(item.attendance?.sessions)
                          ? item.attendance.sessions
                          : [];
                        const firstClockIn =
                          sessions[0]?.clockInTime || item.attendance?.clockInTime || null;
                        const lastClockOut =
                          [...sessions]
                            .reverse()
                            .find((s: UserDaySession) => Boolean(s.clockOutTime))
                            ?.clockOutTime || item.attendance?.clockOutTime || null;
                        const dayHours =
                          typeof item.attendance?.totalHours === "number"
                            ? item.attendance.totalHours
                            : sessions.reduce(
                                (sum: number, s: UserDaySession) =>
                                  sum + (typeof s.totalHours === "number" ? s.totalHours : 0),
                                0,
                              );
                        const isExpanded = expandedUserId === item.user.id;

                        return (
                          <Fragment key={item.user.id}>
                            <TableRow className="group">
                              <TableCell>
                                <div className="flex items-center gap-3">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setExpandedUserId(isExpanded ? null : item.user.id)
                                    }
                                    className="rounded p-1 hover:bg-muted"
                                    title="Toggle sessions"
                                  >
                                    <ChevronRight
                                      className={`h-4 w-4 transition-transform ${
                                        isExpanded ? "rotate-90" : ""
                                      }`}
                                    />
                                  </button>
                                  <Avatar className="h-8 w-8">
                                    <AvatarImage src={item.user.avatarUrl || undefined} />
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
                                  variant="outline"
                                  className={
                                    item.user.shiftType === "night_shift"
                                      ? "border-purple-500 text-purple-700"
                                      : "border-blue-500 text-blue-700"
                                  }
                                >
                                  {item.user.shiftType === "day_shift"
                                    ? "Day"
                                    : item.user.shiftType === "night_shift"
                                      ? "Night"
                                      : "N/A"}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge
                                  className={
                                    statusColors[item.status] ||
                                    "bg-gray-100 text-gray-700"
                                  }
                                >
                                  {item.status?.replace("_", " ")}
                                </Badge>
                              </TableCell>
                              <TableCell className="hidden sm:table-cell font-mono text-sm">
                                {firstClockIn ? format(new Date(firstClockIn), "h:mm a") : "--:--"}
                              </TableCell>
                              <TableCell className="hidden sm:table-cell font-mono text-sm">
                                {firstClockIn && lastClockOut
                                  ? format(new Date(lastClockOut), "h:mm a")
                                  : "--:--"}
                              </TableCell>
                              <TableCell className="hidden md:table-cell font-mono text-sm">
                                {typeof dayHours === "number"
                                  ? formatHoursToReadable(dayHours)
                                  : "--"}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-1">
                                  {sessions.length > 0 && (
                                    <Badge variant="outline" className="text-xs">
                                      {sessions.length} sessions
                                    </Badge>
                                  )}
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => router.push(`/attendance/${item.user.id}`)}
                                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                    View <ExternalLink className="ml-1 h-3 w-3" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                            {isExpanded && sessions.length > 0 && (
                              <TableRow>
                                <TableCell colSpan={7} className="bg-muted/20">
                                  <div className="rounded-md border bg-background p-3">
                                    <p className="text-xs font-medium text-muted-foreground mb-2">
                                      Sessions ({sessions.length})
                                    </p>
                                    <div className="space-y-1">
                                      {sessions.map((session: UserDaySession, index: number) => (
                                        <div
                                          key={session.id || index}
                                          className="text-xs flex items-center justify-between"
                                        >
                                          <span>
                                            #{index + 1}:{" "}
                                            {session.clockInTime
                                              ? format(new Date(session.clockInTime), "h:mm a")
                                              : "--:--"}{" "}
                                            -{" "}
                                            {session.clockOutTime
                                              ? format(new Date(session.clockOutTime), "h:mm a")
                                              : "Active"}
                                          </span>
                                          <span className="text-muted-foreground">
                                            {typeof session.totalHours === "number"
                                              ? formatHoursToReadable(session.totalHours)
                                              : "--"}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </TableCell>
                              </TableRow>
                            )}
                          </Fragment>
                        );
                      })}
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

