"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { format, startOfWeek, addWeeks } from "date-fns";
import { useAuth, useIsAdmin } from "@/providers/auth-provider";
import { useDepartment } from "@/providers/department-context";
import { Skeleton } from "@/components/ui/skeleton";
import { nowIST } from "@/lib/date-utils";
import type { UsersTodayItem } from "@/lib/attendance-types";
import { useAttendanceDateRange } from "@/hooks/attendance/useAttendanceDateRange";
import { useAttendanceSWR } from "@/hooks/attendance/useAttendanceSWR";
import { useMyAttendanceHistory } from "@/hooks/attendance/useMyAttendanceHistory";
import { useHeaderRefresh } from "@/hooks/layout/useHeaderRefresh";
import { AttendanceClockCard } from "@/components/attendance/AttendanceClockCard";
import { AttendanceSummaryCards } from "@/components/attendance/AttendanceSummaryCards";
import {
  PersonalAttendancePieChart,
  WeeklyHoursChart,
  TeamAnalyticsCharts,
} from "@/components/attendance/AttendanceCharts";
import { MyHistorySection } from "@/components/attendance/MyHistorySection";
import { TeamOverviewFilters } from "@/components/attendance/TeamOverviewFilters";
import { TeamAttendanceTable } from "@/components/attendance/TeamAttendanceTable";

export default function AttendancePage() {
  const router = useRouter();
  const { user, isLoading: authLoading, isAuthenticated, can } = useAuth();
  const isAdmin = useIsAdmin();
  const isHR = can("hr:view") || can("hr:manage");
  const canManageTeamAttendance = isAdmin || isHR;
  const { currentDepartment } = useDepartment();

  const [currentTime, setCurrentTime] = useState(new Date());
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [shiftFilter, setShiftFilter] = useState("all");

  const dateRangeState = useAttendanceDateRange();
  const myHistory = useMyAttendanceHistory();

  const weekStartDate = useMemo(() => {
    const targetDate = addWeeks(nowIST(), weekOffset);
    return format(startOfWeek(targetDate, { weekStartsOn: 1 }), "yyyy-MM-dd");
  }, [weekOffset]);

  const swr = useAttendanceSWR({
    isAuthenticated,
    userId: user?.id,
    userShiftType: user?.shiftType,
    canManageTeamAttendance,
    startDate: dateRangeState.startDate,
    endDate: dateRangeState.endDate,
    departmentId: currentDepartment?.id,
    weekStartDate,
    selectedUserId,
    myHistoryStartDate: myHistory.myHistoryStartDate,
    myHistoryEndDate: myHistory.myHistoryEndDate,
    myHistoryMode: myHistory.myHistoryMode,
    myHistoryMonth: myHistory.myHistoryMonth,
    myHistoryYear: myHistory.myHistoryYear,
  });

  useHeaderRefresh({ onRefresh: swr.refreshAttendanceData });

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [authLoading, isAuthenticated, router]);

  const allUsersAttendance = (swr.usersAttendanceData || []) as UsersTodayItem[];
  const usersAttendance = useMemo(() => {
    if (shiftFilter === "all") return allUsersAttendance;
    return allUsersAttendance.filter((item) => item.user.shiftType === shiftFilter);
  }, [allUsersAttendance, shiftFilter]);

  if (authLoading || !isAuthenticated || !user) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-44 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Attendance</h1>
        <p className="text-muted-foreground">
          {canManageTeamAttendance
            ? "Monitor team attendance and track your own"
            : "Track your daily attendance and view your analytics"}
        </p>
      </div>

      <AttendanceClockCard
        userFullName={user.fullName}
        userShiftType={user.shiftType}
        shiftRule={swr.shiftRule}
        todayData={swr.todayData}
        todayHoliday={swr.todayHoliday}
        loadingToday={swr.loadingToday}
        currentTime={currentTime}
        onClockSuccess={swr.invalidateAfterClock}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <AttendanceSummaryCards
          today={swr.todayData}
          todayHoliday={swr.todayHoliday}
          summary={swr.summaryData}
          loadingSummary={swr.loadingSummary}
        />
        <PersonalAttendancePieChart summary={swr.summaryData} />
      </div>

      <WeeklyHoursChart
        weeklyHoursData={swr.weeklyHoursData}
        loadingWeeklyHours={swr.loadingWeeklyHours}
        weekStartDate={weekStartDate}
        weekOffset={weekOffset}
        onWeekOffsetChange={setWeekOffset}
        canManageTeamAttendance={canManageTeamAttendance}
        selectedUserId={selectedUserId}
        onSelectedUserIdChange={setSelectedUserId}
        usersAttendance={usersAttendance}
      />

      <MyHistorySection
        myHistoryYear={myHistory.myHistoryYear}
        myHistoryMonth={myHistory.myHistoryMonth}
        myHistoryMode={myHistory.myHistoryMode}
        onMyHistoryModeChange={myHistory.setMyHistoryMode}
        myHistoryCustomRange={myHistory.myHistoryCustomRange}
        onMyHistoryCustomRangeChange={myHistory.setMyHistoryCustomRange}
        myHistoryCalOpen={myHistory.myHistoryCalOpen}
        onMyHistoryCalOpenChange={myHistory.setMyHistoryCalOpen}
        onNavigateMonth={myHistory.navigateMyHistoryMonth}
        isMHCurrent={myHistory.isMHCurrent}
        myHistoryData={swr.myHistoryData}
        myMonthSummary={swr.myMonthSummary}
        loadingMyHistory={swr.loadingMyHistory}
        loadingMyMonthSummary={swr.loadingMyMonthSummary}
        oneYearAgo={dateRangeState.oneYearAgo}
      />

      {canManageTeamAttendance && (
        <>
          <TeamOverviewFilters
            shiftFilter={shiftFilter}
            onShiftFilterChange={setShiftFilter}
            dateRange={dateRangeState.dateRange}
            onDateRangeChange={dateRangeState.setDateRange}
            customDateRange={dateRangeState.customDateRange}
            onCustomDateRangeChange={dateRangeState.setCustomDateRange}
            customDateMode={dateRangeState.customDateMode}
            onCustomDateModeChange={dateRangeState.setCustomDateMode}
            activeRangeField={dateRangeState.activeRangeField}
            onActiveRangeFieldChange={dateRangeState.setActiveRangeField}
            isCalendarOpen={dateRangeState.isCalendarOpen}
            onCalendarOpenChange={dateRangeState.setIsCalendarOpen}
            startDate={dateRangeState.startDate}
            endDate={dateRangeState.endDate}
            oneYearAgo={dateRangeState.oneYearAgo}
          />
          <TeamAnalyticsCharts
            analytics={swr.analyticsData}
            loadingAnalytics={swr.loadingAnalytics}
          />
          <TeamAttendanceTable
            allUsersAttendance={allUsersAttendance}
            usersAttendance={usersAttendance}
            loadingUsers={swr.loadingUsers}
            shiftFilter={shiftFilter}
          />
        </>
      )}
    </div>
  );
}
