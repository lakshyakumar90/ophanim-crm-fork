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
import { Badge } from "@/components/ui/badge";

interface ManagerViewSectionProps {
  teamUsers: any[];
}

export function ManagerViewSection({ teamUsers }: ManagerViewSectionProps) {
  const router = useRouter();

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Team Members Overview</CardTitle>
          <CardDescription>Live roster for your managed team</CardDescription>
        </CardHeader>
        <CardContent>
          {teamUsers.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No team members found for your scope.
            </p>
          ) : (
            <div className="space-y-2">
              {teamUsers.slice(0, 10).map((member: any) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between rounded border p-2 text-sm"
                >
                  <span className="font-medium">
                    {member.fullName || member.full_name || "Unknown"}
                  </span>
                  <Badge variant="outline">{member.role || "employee"}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Manager Action Queue</CardTitle>
          <CardDescription>Fast navigation for team operations</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button
            className="w-full justify-between"
            variant="outline"
            onClick={() => router.push("/hr/leaves")}
          >
            Review Team Leaves <ArrowRight className="h-4 w-4" />
          </Button>
          <Button
            className="w-full justify-between"
            variant="outline"
            onClick={() => router.push("/hr/attendance")}
          >
            Review Team Attendance <ArrowRight className="h-4 w-4" />
          </Button>
          <Button
            className="w-full justify-between"
            variant="outline"
            onClick={() => router.push("/hr/performance")}
          >
            Track Team Reviews <ArrowRight className="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
