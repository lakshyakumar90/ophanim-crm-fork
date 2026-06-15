"use client";

import { useHrDashboard } from "@/hooks/hr/useHrDashboard";
import {
  HrDashboardHeader,
  TodaySnapshotCard,
  FullViewSection,
  ManagerViewSection,
  EmployeeViewSection,
} from "@/components/hr/dashboard";

export default function HRDashboardPage() {
  const {
    user,
    isFullView,
    isManagerView,
    isEmployeeView,
    snapshot,
    payrollData,
    teamUsers,
    teamOnLeaveCount,
    selfToday,
    weeklyTotalHours,
  } = useHrDashboard();

  return (
    <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto">
      <HrDashboardHeader
        user={user}
        isFullView={isFullView}
        isManagerView={isManagerView}
      />

      <TodaySnapshotCard
        isFullView={isFullView}
        isManagerView={isManagerView}
        snapshot={snapshot}
        payrollData={payrollData}
        teamOnLeaveCount={teamOnLeaveCount}
        teamUsersLength={teamUsers.length}
        selfToday={selfToday}
        weeklyTotalHours={weeklyTotalHours}
      />

      {isFullView && <FullViewSection />}

      {isManagerView && <ManagerViewSection teamUsers={teamUsers} />}

      {isEmployeeView && (
        <EmployeeViewSection
          selfToday={selfToday}
          weeklyTotalHours={weeklyTotalHours}
        />
      )}
    </div>
  );
}
