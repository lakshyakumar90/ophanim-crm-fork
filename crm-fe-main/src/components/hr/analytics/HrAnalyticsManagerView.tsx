"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface HrAnalyticsManagerViewProps {
  teamUsers: any[];
  teamTodayCount: number;
  teamWeeklyRaw: unknown;
}

export function HrAnalyticsManagerView({
  teamUsers,
  teamTodayCount,
  teamWeeklyRaw,
}: HrAnalyticsManagerViewProps) {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">HR Team Analytics</h1>
          <p className="text-muted-foreground">
            Analytics for your team and team members.
          </p>
        </div>
        <Badge variant="outline">Team Scope</Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Team Members</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{teamUsers.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Tracked Today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{teamTodayCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Department Presence
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(teamWeeklyRaw as any)?.presentToday ?? 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Department Leave Today
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(teamWeeklyRaw as any)?.onLeaveToday ?? 0}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
          <CardDescription>
            Quick visibility into your direct team list.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {teamUsers.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No team users available.
            </p>
          ) : (
            <div className="grid gap-2 md:grid-cols-2">
              {teamUsers.slice(0, 12).map((member: any) => (
                <div
                  key={member.id}
                  className="rounded border p-3 text-sm flex items-center justify-between"
                >
                  <span className="font-medium">
                    {member.fullName || member.full_name || "Unknown"}
                  </span>
                  <Badge variant="secondary">{member.role || "employee"}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
