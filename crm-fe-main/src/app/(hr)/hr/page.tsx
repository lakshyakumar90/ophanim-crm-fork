"use client";

import { useRouter } from "next/navigation";
import { useHrDashboard } from "@/hooks/hr/useHrDashboard";
import { DashboardPageHeader } from "@/components/dashboard";
import { PageShell } from "@/components/shared/page-shell";
import { Button } from "@/components/ui/button";
import {
  TodaySnapshotCard,
  FullViewSection,
  ManagerViewSection,
  EmployeeViewSection,
  EmployeeSelfServiceHub,
} from "@/components/hr/dashboard";

export default function HRDashboardPage() {
  const router = useRouter();
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

  const title = isFullView
    ? "HR Control Center"
    : isManagerView
      ? "HR Team Overview"
      : "My HR Dashboard";

  const description = isFullView
    ? `Welcome back, ${user?.fullName}. Here is your department overview.`
    : isManagerView
      ? `Welcome back, ${user?.fullName}. This is your team overview.`
      : `Welcome back, ${user?.fullName}. This is your personal HR overview.`;

  const actions = isFullView ? (
    <>
      <Button onClick={() => router.push("/hr/payroll")}>Initiate Payroll</Button>
      <Button variant="outline" onClick={() => router.push("/hr/holidays")}>
        Add Holiday
      </Button>
    </>
  ) : isManagerView ? (
    <>
      <Button onClick={() => router.push("/hr/attendance")}>Team Attendance</Button>
      <Button variant="outline" onClick={() => router.push("/hr/leaves")}>
        Team Leaves
      </Button>
    </>
  ) : (
    <>
      <Button onClick={() => router.push("/attendance")}>My Attendance</Button>
      <Button
        variant="outline"
        onClick={() => router.push("/hr/payroll/my-payslips")}
      >
        My Payslips
      </Button>
    </>
  );

  return (
    <PageShell>
      <DashboardPageHeader
        title={title}
        description={description}
        actions={actions}
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
        <>
          <EmployeeSelfServiceHub />
          <EmployeeViewSection
            selfToday={selfToday}
            weeklyTotalHours={weeklyTotalHours}
          />
        </>
      )}

      {!isFullView && !isManagerView && !isEmployeeView && (
        <EmployeeSelfServiceHub />
      )}
    </PageShell>
  );
}
