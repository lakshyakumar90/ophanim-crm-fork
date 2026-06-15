"use client";

import { formatHoursToReadable, formatStoredTime } from "@/lib/date-utils";
import { statusColors, formatStatusLabel } from "@/lib/attendance-types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  AlertCircle,
  CalendarDays,
  CheckCircle,
  Clock,
  Gift,
  LogIn,
  LogOut,
  Timer,
} from "lucide-react";

type AttendanceSummaryCardsProps = {
  today: Record<string, unknown> | null | undefined;
  todayHoliday: { name?: string } | null;
  summary: Record<string, number> | null | undefined;
  loadingSummary: boolean;
};

export function AttendanceSummaryCards({
  today,
  todayHoliday,
  summary,
  loadingSummary,
}: AttendanceSummaryCardsProps) {
  const todaySessions = Array.isArray(today?.sessions)
    ? today.sessions
    : today
      ? [today]
      : [];
  const todayTotalHours =
    (today as { today?: { totalHours?: number }; totalHours?: number })?.today
      ?.totalHours ??
    (today as { totalHours?: number })?.totalHours ??
    0;

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Today&apos;s Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          {today ? (
            <div className="space-y-4">
              {Boolean(today.isNoSession && today.status === "holiday") && (
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
                  <p className="font-semibold">
                    {(today as { today?: { sessionsCount?: number } })?.today
                      ?.sessionsCount ?? todaySessions.length}
                  </p>
                </div>
                <div className="text-center">
                  <LogIn className="h-5 w-5 mx-auto text-green-500 mb-1" />
                  <p className="text-xs text-muted-foreground">Clock In</p>
                  <p className="font-semibold">
                    {today.clockInTime
                      ? formatStoredTime(today.clockInTime as string)
                      : "--:--"}
                  </p>
                </div>
                <div className="text-center">
                  <LogOut className="h-5 w-5 mx-auto text-red-500 mb-1" />
                  <p className="text-xs text-muted-foreground">Clock Out</p>
                  <p className="font-semibold">
                    {today.clockOutTime
                      ? formatStoredTime(today.clockOutTime as string)
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
                  <p className="text-xs font-medium text-muted-foreground mb-2">
                    Today&apos;s Sessions
                  </p>
                  <div className="space-y-1">
                    {todaySessions.map(
                      (
                        session: {
                          id?: string;
                          clockInTime?: string;
                          clockOutTime?: string;
                          totalHours?: number;
                        },
                        index: number,
                      ) => (
                        <div
                          key={session.id || index}
                          className="text-xs flex items-center justify-between"
                        >
                          <span>
                            {session.clockInTime
                              ? formatStoredTime(session.clockInTime)
                              : "--:--"}{" "}
                            -{" "}
                            {session.clockOutTime
                              ? formatStoredTime(session.clockOutTime)
                              : "Active"}
                          </span>
                          <span className="text-muted-foreground">
                            {typeof session.totalHours === "number"
                              ? formatHoursToReadable(session.totalHours)
                              : "--"}
                          </span>
                        </div>
                      ),
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-4 text-muted-foreground">
              <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Not clocked in yet today</p>
            </div>
          )}
        </CardContent>
      </Card>

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
                <p className="text-lg font-bold text-green-600">{summary.present || 0}</p>
                <p className="text-[10px] text-muted-foreground">Present</p>
              </div>
              <div className="text-center p-2 bg-amber-50 rounded-lg">
                <p className="text-lg font-bold text-amber-600">{summary.late || 0}</p>
                <p className="text-[10px] text-muted-foreground">Late</p>
              </div>
              <div className="text-center p-2 bg-red-50 rounded-lg">
                <p className="text-lg font-bold text-red-600">{summary.absent || 0}</p>
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
    </>
  );
}
