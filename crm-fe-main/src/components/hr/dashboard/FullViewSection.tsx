"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { HeadcountCard } from "./HeadcountCard";
import { LeaveCard } from "./LeaveCard";
import { ComplianceCard } from "./ComplianceCard";
import { RecruitmentCard } from "./RecruitmentCard";
import { PayrollCard } from "./PayrollCard";
import { PerformanceCard } from "./PerformanceCard";
import { AlertsCard } from "./AlertsCard";
import { ActivityFeedCard } from "./ActivityFeedCard";

export function FullViewSection() {
  return (
    <>
      <HeadcountCard />

      <div className="grid gap-6 md:grid-cols-2">
        <LeaveCard />
        <ComplianceCard />
      </div>

      <div className="grid gap-6 md:grid-cols-2 items-stretch">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Module Activity</CardTitle>
            <CardDescription>
              Quick links to active HR processes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              <RecruitmentCard />
              <PayrollCard />
              <PerformanceCard />
            </div>
          </CardContent>
        </Card>

        <AlertsCard />
      </div>

      <ActivityFeedCard />
    </>
  );
}
