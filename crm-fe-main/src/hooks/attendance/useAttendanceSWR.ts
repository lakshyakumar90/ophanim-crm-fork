"use client";

import { useCallback, useMemo } from "react";
import useSWR, { mutate } from "swr";
import { format } from "date-fns";
import { attendanceApi } from "@/lib/api";
import { nowIST } from "@/lib/date-utils";
import { ATTENDANCE_SWR_KEYS } from "@/lib/attendance-types";

type UseAttendanceSWRParams = {
  isAuthenticated: boolean;
  userId?: string;
  userShiftType?: string | null;
  canManageTeamAttendance: boolean;
  startDate: string;
  endDate: string;
  departmentId?: string;
  weekStartDate: string;
  selectedUserId: string;
  myHistoryStartDate: string;
  myHistoryEndDate: string;
  myHistoryMode: "month" | "custom";
  myHistoryMonth: number;
  myHistoryYear: number;
};

export function useAttendanceSWR({
  isAuthenticated,
  userId,
  userShiftType,
  canManageTeamAttendance,
  startDate,
  endDate,
  departmentId,
  weekStartDate,
  selectedUserId,
  myHistoryStartDate,
  myHistoryEndDate,
  myHistoryMode,
  myHistoryMonth,
  myHistoryYear,
}: UseAttendanceSWRParams) {
  const { data: weeklyHoursData, isLoading: loadingWeeklyHours } = useSWR(
    isAuthenticated ? [ATTENDANCE_SWR_KEYS.weekly, weekStartDate, selectedUserId] : null,
    () => attendanceApi.getWeeklyHours(selectedUserId || undefined, weekStartDate),
  );

  const { data: todayData, isLoading: loadingToday } = useSWR(
    isAuthenticated && userId ? [ATTENDANCE_SWR_KEYS.today, userId] : null,
    () => attendanceApi.getToday(),
  );

  const { data: summaryData, isLoading: loadingSummary } = useSWR(
    isAuthenticated && userId ? [ATTENDANCE_SWR_KEYS.summary, userId] : null,
    () => attendanceApi.getSummary(),
  );

  const { data: shiftRule } = useSWR(
    isAuthenticated && userId
      ? [ATTENDANCE_SWR_KEYS.rule, userShiftType || "day_shift"]
      : null,
    () => attendanceApi.getRules(userShiftType || "day_shift"),
  );

  const { data: myHistoryData, isLoading: loadingMyHistory } = useSWR(
    isAuthenticated && userId
      ? [ATTENDANCE_SWR_KEYS.myHistory, userId, myHistoryStartDate, myHistoryEndDate]
      : null,
    () => attendanceApi.getUserHistory(userId!, myHistoryStartDate, myHistoryEndDate),
  );

  const { data: myMonthSummary, isLoading: loadingMyMonthSummary } = useSWR(
    isAuthenticated && userId && myHistoryMode === "month"
      ? [ATTENDANCE_SWR_KEYS.myMonthSummary, userId, myHistoryMonth, myHistoryYear]
      : null,
    () => attendanceApi.getSummary(myHistoryMonth, myHistoryYear),
  );

  const { data: analyticsData, isLoading: loadingAnalytics } = useSWR(
    isAuthenticated && canManageTeamAttendance
      ? [ATTENDANCE_SWR_KEYS.analytics, startDate, endDate, departmentId]
      : null,
    () => attendanceApi.getAnalytics(startDate, endDate, departmentId),
  );

  const currentYear = new Date().getFullYear();
  const { data: holidaysData } = useSWR(
    isAuthenticated ? [ATTENDANCE_SWR_KEYS.holidays, currentYear] : null,
    () => attendanceApi.getHolidays(currentYear),
  );

  const todayHoliday = useMemo(() => {
    if (!Array.isArray(holidaysData)) return null;
    const todayStr = format(nowIST(), "yyyy-MM-dd");
    return (
      holidaysData.find((h: { date?: string; holiday_date?: string; name?: string }) => {
        const d: string = h.date || h.holiday_date || "";
        return d === todayStr;
      }) ?? null
    );
  }, [holidaysData]);

  const { data: usersAttendanceData, isLoading: loadingUsers } = useSWR(
    isAuthenticated && canManageTeamAttendance
      ? [ATTENDANCE_SWR_KEYS.users, startDate, departmentId]
      : null,
    () => attendanceApi.getUsersToday(startDate, departmentId),
  );

  const invalidateKey = useCallback((key: string) => {
    return mutate((k) => Array.isArray(k) && k[0] === key);
  }, []);

  const refreshAttendanceData = useCallback(async () => {
    const refreshers: Promise<unknown>[] = [
      invalidateKey(ATTENDANCE_SWR_KEYS.weekly),
      invalidateKey(ATTENDANCE_SWR_KEYS.today),
      invalidateKey(ATTENDANCE_SWR_KEYS.summary),
      invalidateKey(ATTENDANCE_SWR_KEYS.rule),
      invalidateKey(ATTENDANCE_SWR_KEYS.myHistory),
      invalidateKey(ATTENDANCE_SWR_KEYS.myMonthSummary),
      invalidateKey(ATTENDANCE_SWR_KEYS.holidays),
    ];

    if (canManageTeamAttendance) {
      refreshers.push(
        invalidateKey(ATTENDANCE_SWR_KEYS.analytics),
        invalidateKey(ATTENDANCE_SWR_KEYS.users),
      );
    }

    await Promise.all(refreshers);
  }, [canManageTeamAttendance, invalidateKey]);

  const invalidateAfterClock = useCallback(async () => {
    await Promise.all([
      invalidateKey(ATTENDANCE_SWR_KEYS.today),
      invalidateKey(ATTENDANCE_SWR_KEYS.summary),
    ]);
    if (canManageTeamAttendance) {
      await Promise.all([
        invalidateKey(ATTENDANCE_SWR_KEYS.users),
        invalidateKey(ATTENDANCE_SWR_KEYS.analytics),
      ]);
    }
  }, [canManageTeamAttendance, invalidateKey]);

  return {
    weeklyHoursData,
    loadingWeeklyHours,
    todayData,
    loadingToday,
    summaryData,
    loadingSummary,
    shiftRule,
    myHistoryData,
    loadingMyHistory,
    myMonthSummary,
    loadingMyMonthSummary,
    analyticsData,
    loadingAnalytics,
    holidaysData,
    todayHoliday,
    usersAttendanceData,
    loadingUsers,
    refreshAttendanceData,
    invalidateAfterClock,
  };
}
