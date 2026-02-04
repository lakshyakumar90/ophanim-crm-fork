"use client";

import { useState, useEffect } from "react";
import useSWR, { useSWRConfig } from "swr";
import { attendanceApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Clock, LogIn, LogOut, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import {
  formatStoredTime,
  parseStoredIST,
  nowISTAsUTC,
  nowIST,
  formatIST,
} from "@/lib/date-utils";

export function AttendanceWidget() {
  const { mutate } = useSWRConfig();
  const [isProcessing, setIsProcessing] = useState(false);
  const [workingTime, setWorkingTime] = useState("");

  const { data } = useSWR(
    "attendance-today",
    () => attendanceApi.getToday().then((res) => res.data.data),
    { refreshInterval: 0 }, // No polling
  );

  const attendance = data;

  // ... (rest of code)

  // In render:

  // Handle both snake_case and camelCase from API
  const clockOutTime = attendance?.clock_out_time || attendance?.clockOutTime;
  const clockInTimeRaw = attendance?.clock_in_time || attendance?.clockInTime;
  const isClockedIn = attendance && !clockOutTime;
  const clockInTime = clockInTimeRaw ? parseStoredIST(clockInTimeRaw) : null;

  // Real-time working duration update
  useEffect(() => {
    if (!clockInTime || !isClockedIn) {
      setWorkingTime("");
      return;
    }

    const updateTimer = () => {
      const now = nowISTAsUTC();
      const diff = now - (clockInTime as number);

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
    const interval = setInterval(updateTimer, 1000); // Update every second
    return () => clearInterval(interval);
  }, [clockInTime, isClockedIn]);

  const handleClockIn = async () => {
    setIsProcessing(true);
    try {
      await attendanceApi.clockIn();
      toast.success("Clocked in successfully!");
      // Invalidate the global SWR cache for attendance
      mutate("attendance-today");
      mutate("attendance-summary");
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || "Failed to clock in");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClockOut = async () => {
    setIsProcessing(true);
    try {
      await attendanceApi.clockOut();
      toast.success("Clocked out successfully!");
      // Invalidate the global SWR cache for attendance
      mutate("attendance-today");
      mutate("attendance-summary");
    } catch (error: any) {
      toast.error(
        error.response?.data?.error?.message || "Failed to clock out",
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const today = nowIST();

  return (
    <div className="bg-card rounded-xl border border-border p-4 flex items-center justify-between shadow-sm">
      <div className="flex items-center gap-4">
        <div className="h-12 w-12 rounded-full bg-rose-50 dark:bg-rose-950 flex items-center justify-center">
          <Clock className="h-6 w-6 text-rose-500" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-foreground">
              Today's Attendance
            </h3>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground hover:bg-muted"
              onClick={() => mutate("attendance-today")}
              title="Refresh"
            >
              <RefreshCw className="h-3 w-3" />
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            {formatIST(today, "EEEE, MMMM d, yyyy")}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-6">
        {isClockedIn && clockInTime && (
          <div className="text-right">
            <div className="text-sm text-muted-foreground">Check-in:</div>
            <div className="font-semibold text-emerald-600">
              {formatIST(attendance.clockInTime, "h:mm a")}
            </div>
          </div>
        )}

        {isClockedIn && workingTime && (
          <div className="text-right">
            <div className="text-sm text-muted-foreground">Working:</div>
            <div className="font-semibold text-rose-500">{workingTime}</div>
          </div>
        )}

        {clockOutTime && (
          <div className="text-right">
            <div className="text-sm text-muted-foreground">Checked out at</div>
            <div className="font-semibold text-muted-foreground">
              {formatIST(clockOutTime, "h:mm a")}
            </div>
          </div>
        )}

        {!clockOutTime && (
          <Button
            onClick={isClockedIn ? handleClockOut : handleClockIn}
            disabled={isProcessing}
            className={
              isClockedIn
                ? "bg-gradient-to-r from-rose-500 to-red-500 hover:from-rose-600 hover:to-red-600 text-white"
                : "bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white"
            }
          >
            {isClockedIn ? (
              <>
                <LogOut className="w-4 h-4 mr-2" />
                Check Out
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4 mr-2" />
                Check In
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
