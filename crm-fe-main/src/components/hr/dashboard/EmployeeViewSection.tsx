"use client";

import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface EmployeeViewSectionProps {
  selfToday: unknown;
  weeklyTotalHours: number;
}

export function EmployeeViewSection({
  selfToday,
  weeklyTotalHours,
}: EmployeeViewSectionProps) {
  const router = useRouter();

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>My Attendance</CardTitle>
          <CardDescription>Today and weekly progress</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="rounded border p-3">
            <p className="text-muted-foreground">Current status</p>
            <p className="text-lg font-semibold capitalize">
              {String((selfToday as any)?.status || "not_marked").replace(
                /_/g,
                " ",
              )}
            </p>
          </div>
          <div className="rounded border p-3">
            <p className="text-muted-foreground">Today hours</p>
            <p className="text-lg font-semibold">
              {(selfToday as any)?.totalHours ?? 0}
            </p>
          </div>
          <div className="rounded border p-3">
            <p className="text-muted-foreground">Weekly total hours</p>
            <p className="text-lg font-semibold">
              {weeklyTotalHours.toFixed(1)}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>My HR Quick Actions</CardTitle>
          <CardDescription>Common self-service workflows</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button
            className="w-full justify-between"
            variant="outline"
            onClick={() => router.push("/hr/leaves")}
          >
            My Leave Requests <ArrowRight className="h-4 w-4" />
          </Button>
          <Button
            className="w-full justify-between"
            variant="outline"
            onClick={() => router.push("/hr/payroll/my-payslips")}
          >
            My Payslips <ArrowRight className="h-4 w-4" />
          </Button>
          <Button
            className="w-full justify-between"
            variant="outline"
            onClick={() => router.push("/hr/performance")}
          >
            My Performance <ArrowRight className="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
