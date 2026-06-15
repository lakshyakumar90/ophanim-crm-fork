"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { LeadActivity } from "@/types";
import { LeadActivityTimeline } from "@/components/sales/leads/detail/LeadActivityTimeline";

interface LeadActivityTabProps {
  activities: LeadActivity[];
  loading: boolean;
}

export function LeadActivityTab({ activities, loading }: LeadActivityTabProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Activity Timeline</CardTitle>
      </CardHeader>
      <CardContent>
        <LeadActivityTimeline activities={activities} loading={loading} />
      </CardContent>
    </Card>
  );
}
