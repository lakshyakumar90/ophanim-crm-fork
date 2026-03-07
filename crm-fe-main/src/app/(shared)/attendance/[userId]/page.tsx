"use client";

import { useMemo, useState, useCallback } from "react";
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
  formatHoursToReadable,
} from "@/lib/date-utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ArrowLeft,
  Clock,
  Timer,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  User,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
} from "lucide-react";
import {
  format,
  startOfMonth,
  endOfMonth,
  setMonth,
  setYear,
  getMonth,
  getYear,
} from "date-fns";
import {
  AreaChart,
  Area,
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
import { useHeaderRefresh } from "@/hooks/use-header-refresh";

const statusColors: Record<string, string> = {
  present: "bg-green-100 text-green-700",
  late: "bg-amber-100 text-amber-700",
  half_day: "bg-orange-100 text-orange-700",
  absent: "bg-red-100 text-red-700",
  leave: "bg-blue-100 text-blue-700",
  holiday: "bg-violet-100 text-violet-700",
};

const statusIcons: Record<string, string> = {
  present: "P",
  late: "L",
  half_day: "H",
  absent: "A",
  leave: "LV",
  holiday: "HD",
};

type SessionRecord = {
  id: string;
  date: string;
  status: string;
  clockInTime: string | null;
  clockOutTime: string | null;
  totalHours: number | null;
  location: string | null;
};

type UserHistoryPayload = {
  records?: SessionRecord[];
  daily?: Array<{
    date: string;
    status: string;
    totalHours: number;
    firstClockIn: string | null;
    lastClockOut: string | null;
    location: string | null;
    sessionsCount: number;
    sessions: Array<{
      id: string;
      clockInTime: string | null;
      clockOutTime: string | null;
      totalHours: number | null;
      location: string | null;
      status: string;
    }>;
  }>;
  summary?: {
    present?: number;
    late?: number;
    halfDay?: number;
    absent?: number;
    leave?: number;
    holiday?: number;
    totalHours?: number;
    avgHours?: number;
  };
};

type GroupedDay = {
  date: string;
  status: string;
  firstClockIn: string | null;
  lastClockOut: string | null;
  totalHours: number;
  sessionCount: number;
  location: string | null;
  sessions: Array<{
    id: string;
    clockInTime: string | null;
    clockOutTime: string | null;
    totalHours: number;
    location: string | null;
    status: string;
  }>;
};

function getInitials(name: string): string {
  return (
    name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "U"
  );
}

function safeSessionHours(record: SessionRecord): number {
  if (typeof record.totalHours === "number") return Math.max(0, record.totalHours);
  if (!record.clockInTime || !record.clockOutTime) return 0;
  const diffMs =
    new Date(record.clockOutTime).getTime() - new Date(record.clockInTime).getTime();
  if (!Number.isFinite(diffMs) || diffMs <= 0) return 0;
  return Math.round((diffMs / 3600000) * 100) / 100;
}

function deriveDayStatus(sessions: GroupedDay["sessions"], totalHours: number): string {
  if (sessions.length === 0) return "absent";
  if (totalHours < 4) return "half_day";
  if (sessions.some((s) => s.status === "late")) return "late";
  return "present";
}

function listDates(start: string, end: string): string[] {
  const out: string[] = [];
  const cursor = new Date(`${start}T00:00:00+05:30`);
  const endDate = new Date(`${end}T00:00:00+05:30`);
  while (cursor.getTime() <= endDate.getTime()) {
    out.push(format(cursor, "yyyy-MM-dd"));
    cursor.setDate(cursor.getDate() + 1);
  }
  return out;
}

export default function UserAttendancePage() {
  const { userId } = useParams();
  const router = useRouter();
  const isAdmin = useIsAdmin();
  const isManager = useIsManager();
  const [isRestoring, setIsRestoring] = useState(false);
  const [expandedDay, setExpandedDay] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<"month" | "custom">("month");
  const [monthCursor, setMonthCursor] = useState<Date>(nowIST());
  const [customRange, setCustomRange] = useState(() => {
    const today = nowIST();
    return {
      from: format(startOfMonth(today), "yyyy-MM-dd"),
      to: format(today, "yyyy-MM-dd"),
    };
  });

  const { startDate, endDate } = useMemo(() => {
    if (filterMode === "custom") {
      const from = customRange.from || format(startOfMonth(nowIST()), "yyyy-MM-dd");
      const to = customRange.to || getTodayIST();
      return from <= to ? { startDate: from, endDate: to } : { startDate: to, endDate: from };
    }

    const monthStart = format(startOfMonth(monthCursor), "yyyy-MM-dd");
    const monthEnd = format(endOfMonth(monthCursor), "yyyy-MM-dd");
    const today = getTodayIST();
    return {
      startDate: monthStart,
      endDate: monthEnd > today ? today : monthEnd,
    };
  }, [filterMode, monthCursor, customRange]);

  const { data: userData, isLoading: loadingUser } = useSWR(
    userId ? ["user-detail", userId] : null,
    () => usersApi.get(userId as string),
  );

  const {
    data: historyData,
    isLoading: loadingHistory,
    mutate: mutateHistory,
  } = useSWR(
    userId ? ["attendance-history", userId, startDate, endDate] : null,
    () => attendanceApi.getUserHistory(userId as string, startDate, endDate),
  );

  const refreshAttendanceUserData = useCallback(async () => {
    await Promise.all([
      mutate(["user-detail", userId]),
      mutate(["attendance-history", userId, startDate, endDate]),
      mutate((key) => Array.isArray(key) && key[0] === "attendance-users"),
      mutate((key) => Array.isArray(key) && key[0] === "attendance-analytics"),
      mutate((key) => Array.isArray(key) && key[0] === "attendance-today"),
      mutate((key) => Array.isArray(key) && key[0] === "attendance-summary"),
    ]);
  }, [endDate, startDate, userId]);

  useHeaderRefresh({
    onRefresh: refreshAttendanceUserData,
    enabled: Boolean(userId),
  });

  const history = historyData as UserHistoryPayload | undefined;
  const today = getTodayIST();
  const todayAttendance = history?.records?.find((r) => r.date === today);
  const isClockedIn = !!todayAttendance?.clockInTime;
  const isClockedOut = !!todayAttendance?.clockOutTime;

  const groupedDays = useMemo(() => {
    if (Array.isArray(history?.daily) && history.daily.length > 0) {
      return history.daily.map((day) => ({
        date: day.date,
        status: day.status,
        firstClockIn: day.firstClockIn,
        lastClockOut: day.lastClockOut,
        totalHours: day.totalHours,
        sessionCount: day.sessionsCount,
        location: day.location,
        sessions: (day.sessions || []).map((s) => ({
          id: s.id,
          clockInTime: s.clockInTime,
          clockOutTime: s.clockOutTime,
          totalHours: typeof s.totalHours === "number" ? s.totalHours : 0,
          location: s.location,
          status: s.status,
        })),
      }));
    }

    const map = new Map<string, GroupedDay>();
    const records = (history?.records || []) as SessionRecord[];
    for (const record of records) {
      if (!record.clockInTime) continue;
      const key = record.date;
      const existing = map.get(key) || {
        date: key,
        status: "present",
        firstClockIn: null,
        lastClockOut: null,
        totalHours: 0,
        sessionCount: 0,
        location: null,
        sessions: [],
      };

      const sessionHours = safeSessionHours(record);
      existing.totalHours = Math.round((existing.totalHours + sessionHours) * 100) / 100;
      existing.sessionCount += 1;
      if (!existing.firstClockIn || new Date(record.clockInTime) < new Date(existing.firstClockIn)) {
        existing.firstClockIn = record.clockInTime;
      }
      if (
        record.clockOutTime &&
        (!existing.lastClockOut || new Date(record.clockOutTime) > new Date(existing.lastClockOut))
      ) {
        existing.lastClockOut = record.clockOutTime;
      }
      if (!existing.location && record.location) {
        existing.location = record.location;
      } else if (existing.location && record.location && existing.location !== record.location) {
        existing.location = "Multiple";
      }

      existing.sessions.push({
        id: record.id,
        clockInTime: record.clockInTime,
        clockOutTime: record.clockOutTime,
        totalHours: sessionHours,
        location: record.location,
        status: record.status,
      });
      map.set(key, existing);
    }

    const days = Array.from(map.values()).map((day) => {
      day.sessions.sort((a, b) => {
        const aTime = a.clockInTime ? new Date(a.clockInTime).getTime() : 0;
        const bTime = b.clockInTime ? new Date(b.clockInTime).getTime() : 0;
        return aTime - bTime;
      });
      day.status = deriveDayStatus(day.sessions, day.totalHours);
      return day;
    });

    return days.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [history?.daily, history?.records]);

  const chartData = useMemo(() => {
    const byDate = new Map(groupedDays.map((d) => [d.date, d.totalHours]));
    return listDates(startDate, endDate).map((d) => ({
      date: d,
      label: format(new Date(`${d}T00:00:00+05:30`), "MMM d"),
      hours: byDate.get(d) || 0,
      readable: formatHoursToReadable(byDate.get(d) || 0, "0m"),
    }));
  }, [groupedDays, startDate, endDate]);

  const pieData = history?.summary
    ? [
        { name: "Present", value: history.summary.present ?? 0, color: "#22c55e" },
        { name: "Late", value: history.summary.late ?? 0, color: "#eab308" },
        { name: "Half Day", value: history.summary.halfDay ?? 0, color: "#f97316" },
        { name: "Absent", value: history.summary.absent ?? 0, color: "#ef4444" },
        { name: "Leave", value: history.summary.leave ?? 0, color: "#3b82f6" },
        { name: "Holiday", value: history.summary.holiday ?? 0, color: "#8b5cf6" },
      ].filter((item) => item.value > 0)
    : [];

  const handleAdminRestore = async () => {
    if (!todayAttendance?.id) return;
    setIsRestoring(true);
    try {
      await attendanceApi.adminRestoreAttendance(todayAttendance.id);
      toast.success(`Restored ${userData?.fullName || "user"} session successfully`);
      mutateHistory();
      mutate((key) => Array.isArray(key) && key[0] === "attendance-users");
      mutate((key) => Array.isArray(key) && key[0] === "attendance-analytics");
      mutate((key) => Array.isArray(key) && key[0] === "attendance-today");
      mutate((key) => Array.isArray(key) && key[0] === "attendance-summary");
    } catch (error: unknown) {
      const errorMessage =
        (error as { response?: { data?: { error?: { message?: string } } } })?.response
          ?.data?.error?.message || "Failed to restore attendance";
      toast.error(errorMessage);
    } finally {
      setIsRestoring(false);
    }
  };

  if (!isAdmin && !isManager) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold">Access Denied</h2>
          <p className="text-muted-foreground">You don&apos;t have permission to view this page.</p>
          <Button onClick={() => router.push("/attendance")} className="mt-4">
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  const currentMonthLabel = format(monthCursor, "MMMM yyyy");
  const yearOptions = Array.from({ length: 6 }, (_, idx) => getYear(nowIST()) - 3 + idx);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push("/attendance")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        {loadingUser ? (
          <Skeleton className="h-16 w-64" />
        ) : userData ? (
          <div className="flex items-center gap-4">
            <Avatar className="h-14 w-14">
              <AvatarImage src={userData.avatarUrl} />
              <AvatarFallback className="text-lg">
                {getInitials(userData.fullName)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl font-bold">{userData.fullName}</h1>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="capitalize">
                  {userData.role}
                </Badge>
                <span className="text-sm text-muted-foreground">{userData.email}</span>
              </div>
            </div>
          </div>
        ) : (
          <div>
            <h1 className="text-2xl font-bold">User Not Found</h1>
            <p className="text-muted-foreground">The requested user could not be found.</p>
          </div>
        )}
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant={filterMode === "month" ? "default" : "outline"}
                onClick={() => setFilterMode("month")}
              >
                Month
              </Button>
              <Button
                size="sm"
                variant={filterMode === "custom" ? "default" : "outline"}
                onClick={() => setFilterMode("custom")}
              >
                Custom Range
              </Button>
            </div>

            {filterMode === "month" ? (
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => setMonthCursor((prev) => setMonth(prev, getMonth(prev) - 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="text-sm font-medium min-w-[140px] text-center">{currentMonthLabel}</div>
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => setMonthCursor((prev) => setMonth(prev, getMonth(prev) + 1))}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <select
                  className="h-9 rounded-md border bg-background px-2 text-sm"
                  value={getMonth(monthCursor)}
                  onChange={(e) =>
                    setMonthCursor((prev) => setMonth(prev, Number(e.target.value)))
                  }
                >
                  {Array.from({ length: 12 }, (_, m) => (
                    <option key={m} value={m}>
                      {format(new Date(2026, m, 1), "MMMM")}
                    </option>
                  ))}
                </select>
                <select
                  className="h-9 rounded-md border bg-background px-2 text-sm"
                  value={getYear(monthCursor)}
                  onChange={(e) =>
                    setMonthCursor((prev) => setYear(prev, Number(e.target.value)))
                  }
                >
                  {yearOptions.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="date"
                  className="h-9 rounded-md border bg-background px-2 text-sm"
                  value={customRange.from}
                  max={customRange.to || getTodayIST()}
                  onChange={(e) =>
                    setCustomRange((prev) => ({
                      ...prev,
                      from: e.target.value,
                    }))
                  }
                />
                <span className="text-muted-foreground text-sm">to</span>
                <input
                  type="date"
                  className="h-9 rounded-md border bg-background px-2 text-sm"
                  value={customRange.to}
                  min={customRange.from}
                  max={getTodayIST()}
                  onChange={(e) =>
                    setCustomRange((prev) => ({
                      ...prev,
                      to: e.target.value,
                    }))
                  }
                />
              </div>
            )}
          </div>
          <div className="mt-3 text-sm text-muted-foreground">
            Selected range:{" "}
            {format(new Date(`${startDate}T00:00:00+05:30`), "MMM d, yyyy")} -{" "}
            {format(new Date(`${endDate}T00:00:00+05:30`), "MMM d, yyyy")}
          </div>
        </CardContent>
      </Card>

      {isAdmin && userData && (
        <Card className="bg-gradient-to-br from-violet-50 to-purple-100 border-purple-200">
          <CardContent className="py-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h3 className="font-semibold text-purple-900">Admin Controls</h3>
                <p className="text-sm text-purple-700">
                  Manual clock-in/clock-out is disabled. Restore is available for accidental
                  completion before shift auto-logout.
                </p>
              </div>
              <Button
                onClick={handleAdminRestore}
                disabled={isRestoring || !isClockedIn || !isClockedOut}
                className="bg-violet-600 hover:bg-violet-700 disabled:opacity-50"
              >
                {isRestoring ? "Restoring..." : "Restore Session"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {loadingHistory ? (
        <div className="grid gap-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
          <Skeleton className="h-80" />
        </div>
      ) : history ? (
        <>
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
                      {formatHoursToReadable(history.summary?.totalHours ?? 0)}
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
                      {formatHoursToReadable(history.summary?.avgHours ?? 0)}
                    </p>
                    <p className="text-xs text-muted-foreground">Avg/Day</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Attendance Distribution</CardTitle>
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

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Daily Worked Hours</CardTitle>
              </CardHeader>
              <CardContent>
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <AreaChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip
                        formatter={(value: number | undefined) => [
                          formatHoursToReadable(value ?? 0, "0m"),
                          "Worked",
                        ]}
                        labelFormatter={(_, payload) => {
                          const date = payload?.[0]?.payload?.date;
                          if (!date) return "";
                          return format(new Date(`${date}T00:00:00+05:30`), "EEE, MMM d, yyyy");
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="hours"
                        stroke="#8b5cf6"
                        fill="#8b5cf6"
                        fillOpacity={0.2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[250px] text-muted-foreground">
                    No chart data available
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <CalendarDays className="h-4 w-4" />
                Attendance History
                <Badge variant="secondary">{groupedDays.length} days</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {groupedDays.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No attendance records found for this period.</p>
                </div>
              ) : (
                <ScrollArea className="h-[520px] pr-2">
                  <div className="space-y-3">
                    {groupedDays.map((day) => (
                      <Collapsible
                        key={day.date}
                        open={expandedDay === day.date}
                        onOpenChange={(open) => setExpandedDay(open ? day.date : null)}
                      >
                        <div className="rounded-lg border">
                          <CollapsibleTrigger asChild>
                            <button className="w-full text-left p-4 hover:bg-muted/40 transition-colors">
                              <div className="flex items-start justify-between gap-3">
                                <div className="space-y-2">
                                  <p className="font-semibold">
                                    {format(new Date(`${day.date}T00:00:00+05:30`), "EEE, MMM d, yyyy")}
                                  </p>
                                  <Badge
                                    className={
                                      statusColors[day.status] || "bg-gray-100 text-gray-700"
                                    }
                                  >
                                    {statusIcons[day.status]} {day.status.replace("_", " ")}
                                  </Badge>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-sm text-muted-foreground">
                                    <p>
                                      First clock-in:{" "}
                                      {day.firstClockIn ? formatStoredTime(day.firstClockIn) : "--:--"}
                                    </p>
                                    <p>
                                      Last clock-out:{" "}
                                      {day.lastClockOut ? formatStoredTime(day.lastClockOut) : "--:--"}
                                    </p>
                                    <p>Total: {formatHoursToReadable(day.totalHours)}</p>
                                    <p>Location: {day.location || "--"}</p>
                                  </div>
                                </div>
                                <ChevronDown
                                  className={`h-4 w-4 mt-1 transition-transform ${
                                    expandedDay === day.date ? "rotate-180" : ""
                                  }`}
                                />
                              </div>
                            </button>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <div className="px-4 pb-4">
                              <div className="rounded-md border">
                                <div className="grid grid-cols-4 gap-2 px-3 py-2 text-xs font-medium text-muted-foreground border-b">
                                  <span>Session</span>
                                  <span>Clock In</span>
                                  <span>Clock Out</span>
                                  <span>Duration</span>
                                </div>
                                {day.sessions.map((session, idx) => (
                                  <div
                                    key={session.id || `${day.date}-${idx}`}
                                    className="grid grid-cols-4 gap-2 px-3 py-2 text-sm border-b last:border-b-0"
                                  >
                                    <span className="text-muted-foreground">#{idx + 1}</span>
                                    <span>
                                      {session.clockInTime ? formatStoredTime(session.clockInTime) : "--:--"}
                                    </span>
                                    <span>
                                      {session.clockOutTime
                                        ? formatStoredTime(session.clockOutTime)
                                        : "Active"}
                                    </span>
                                    <span>{formatHoursToReadable(session.totalHours)}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </CollapsibleContent>
                        </div>
                      </Collapsible>
                    ))}
                  </div>
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
              <h2 className="text-xl font-semibold">Unable to Load Attendance Data</h2>
              <p className="text-muted-foreground mt-2">
                There was an error loading attendance history. Please try again later.
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
