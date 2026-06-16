"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface HrDashboardHeaderProps {
  user: { fullName?: string } | null;
  isFullView: boolean;
  isManagerView: boolean;
}

export function HrDashboardHeader({
  user,
  isFullView,
  isManagerView,
}: HrDashboardHeaderProps) {
  const router = useRouter();

  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {isFullView
            ? "HR Control Center"
            : isManagerView
              ? "HR Team Overview"
              : "My HR Dashboard"}
        </h1>
        <p className="text-muted-foreground mt-1">
          {isFullView
            ? `Welcome back, ${user?.fullName}. Here is your department overview.`
            : isManagerView
              ? `Welcome back, ${user?.fullName}. This is your team overview.`
              : `Welcome back, ${user?.fullName}. This is your personal HR overview.`}
        </p>
      </div>
      <div className="flex gap-2">
        {isFullView ? (
          <>
            <Button onClick={() => router.push("/hr/payroll")}>
              Initiate Payroll
            </Button>
            <Button variant="outline" onClick={() => router.push("/hr/holidays")}>
              Add Holiday
            </Button>
          </>
        ) : isManagerView ? (
          <>
            <Button onClick={() => router.push("/hr/attendance")}>
              Team Attendance
            </Button>
            <Button variant="outline" onClick={() => router.push("/hr/leaves")}>
              Team Leaves
            </Button>
          </>
        ) : (
          <>
            <Button onClick={() => router.push("/attendance")}>
              My Attendance
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push("/hr/payroll/my-payslips")}
            >
              My Payslips
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
