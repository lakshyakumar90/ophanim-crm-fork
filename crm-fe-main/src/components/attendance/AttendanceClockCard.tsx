"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { attendanceApi } from "@/lib/api";
import {
  formatIST,
  formatStoredTime,
  nowISTAsUTC,
  parseStoredIST,
  formatHoursToReadable,
} from "@/lib/date-utils";
import { computeShiftWindow } from "@/lib/attendance-utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle, Gift, LogIn, LogOut } from "lucide-react";

type AttendanceClockCardProps = {
  userFullName?: string | null;
  userShiftType?: string | null;
  shiftRule?: { workStartTime?: string; workEndTime?: string } | null;
  todayData: Record<string, unknown> | null | undefined;
  todayHoliday: { name?: string } | null;
  loadingToday: boolean;
  currentTime: Date;
  onClockSuccess: () => Promise<void>;
};

export function AttendanceClockCard({
  userFullName,
  userShiftType,
  shiftRule,
  todayData,
  todayHoliday,
  loadingToday,
  currentTime,
  onClockSuccess,
}: AttendanceClockCardProps) {
  const [isClockingIn, setIsClockingIn] = useState(false);
  const [isClockingOut, setIsClockingOut] = useState(false);
  const [workingTime, setWorkingTime] = useState("");

  const today = todayData;
  const hasOpenSession = Boolean(today?.clockInTime && !today?.clockOutTime);
  const canShowClockIn = !hasOpenSession;
  const isHolidayToday = Boolean(
    today?.isNoSession && today?.status === "holiday",
  );
  const todayTotalHours =
    (today as { today?: { totalHours?: number }; totalHours?: number })?.today
      ?.totalHours ??
    (today as { totalHours?: number })?.totalHours ??
    0;

  const shiftWindow = useMemo(
    () => computeShiftWindow(userShiftType || "day_shift", shiftRule),
    [shiftRule, userShiftType],
  );

  useEffect(() => {
    if (todayData?.clockInTime && !todayData.clockOutTime) {
      const startTime = parseStoredIST(todayData.clockInTime as string);
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
      updateTimer();
      const interval = setInterval(updateTimer, 1000);
      return () => clearInterval(interval);
    }
    setWorkingTime("");
  }, [todayData]);

  const handleClockIn = async () => {
    setIsClockingIn(true);
    try {
      await attendanceApi.clockIn({ location: "Office" });
      toast.success("🕐 Clocked in successfully! Have a productive day!");
      await onClockSuccess();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: { message?: string } } } };
      toast.error(
        err.response?.data?.error?.message ||
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
      await onClockSuccess();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: { message?: string } } } };
      toast.error(
        err.response?.data?.error?.message ||
          "Failed to clock out. Please try again.",
      );
    } finally {
      setIsClockingOut(false);
    }
  };

  return (
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
              {userFullName && `Welcome, ${userFullName.split(" ")[0]}!`}
            </p>
            {shiftWindow && (
              <p className="text-blue-200 text-xs mt-1">
                {shiftWindow.shiftType === "night_shift" ? "Night Shift" : "Day Shift"}{" "}
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
                  {today?.clockInTime
                    ? formatStoredTime(today.clockInTime as string)
                    : "--:--"}
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
  );
}
