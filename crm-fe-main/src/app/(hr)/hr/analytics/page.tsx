"use client";

import { useHrAnalytics } from "@/hooks/hr/useHrAnalytics";
import {
  HrAnalyticsSkeleton,
  HrAnalyticsErrorState,
  HrAnalyticsManagerView,
  HrAnalyticsEmployeeView,
  HrAnalyticsFullView,
} from "@/components/hr/analytics";

export default function HRAnalyticsPage() {
  const {
    user,
    isManagerView,
    isEmployeeView,
    analytics,
    loading,
    year,
    setYear,
    month,
    setMonth,
    fetchAnalytics,
    teamUsers,
    teamTodayCount,
    teamWeeklyRaw,
    selfTodayRaw,
    selfWeeklyHours,
    inactiveEmployees,
    attendanceTotal,
    attendanceData,
    roleData,
  } = useHrAnalytics();

  if (isManagerView) {
    return (
      <HrAnalyticsManagerView
        teamUsers={teamUsers}
        teamTodayCount={teamTodayCount}
        teamWeeklyRaw={teamWeeklyRaw}
      />
    );
  }

  if (isEmployeeView) {
    return (
      <HrAnalyticsEmployeeView
        selfTodayRaw={selfTodayRaw}
        selfWeeklyHours={selfWeeklyHours}
        teamId={user?.teamId}
      />
    );
  }

  if (loading) {
    return <HrAnalyticsSkeleton />;
  }

  if (!analytics) {
    return <HrAnalyticsErrorState onRetry={fetchAnalytics} />;
  }

  return (
    <HrAnalyticsFullView
      analytics={analytics}
      loading={loading}
      year={year}
      month={month}
      inactiveEmployees={inactiveEmployees}
      attendanceTotal={attendanceTotal}
      attendanceData={attendanceData}
      roleData={roleData}
      onYearChange={setYear}
      onMonthChange={setMonth}
      onRefresh={fetchAnalytics}
    />
  );
}
