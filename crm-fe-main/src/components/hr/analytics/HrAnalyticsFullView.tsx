"use client";

import type { HRAnalytics, AttendanceDatum, RoleDatum } from "./constants";
import { HrAnalyticsHeader } from "./HrAnalyticsHeader";
import { HrAnalyticsSummaryStats } from "./HrAnalyticsSummaryStats";
import { HrAnalyticsChartsSection } from "./HrAnalyticsChartsSection";

interface HrAnalyticsFullViewProps {
  analytics: HRAnalytics;
  loading: boolean;
  year: string;
  month: string;
  inactiveEmployees: number;
  attendanceTotal: number;
  attendanceData: AttendanceDatum[];
  roleData: RoleDatum[];
  onYearChange: (value: string) => void;
  onMonthChange: (value: string) => void;
  onRefresh: () => void;
}

export function HrAnalyticsFullView({
  analytics,
  loading,
  year,
  month,
  inactiveEmployees,
  attendanceTotal,
  attendanceData,
  roleData,
  onYearChange,
  onMonthChange,
  onRefresh,
}: HrAnalyticsFullViewProps) {
  return (
    <div className="flex flex-col gap-6 p-6">
      <HrAnalyticsHeader
        loading={loading}
        year={year}
        month={month}
        onYearChange={onYearChange}
        onMonthChange={onMonthChange}
        onRefresh={onRefresh}
      />

      <HrAnalyticsSummaryStats
        analytics={analytics}
        inactiveEmployees={inactiveEmployees}
      />

      <HrAnalyticsChartsSection
        analytics={analytics}
        attendanceTotal={attendanceTotal}
        attendanceData={attendanceData}
        roleData={roleData}
      />
    </div>
  );
}
