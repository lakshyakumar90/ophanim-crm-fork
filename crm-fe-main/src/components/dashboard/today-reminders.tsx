import { useEffect, useState } from "react";
import useSWR from "swr";
import { format } from "date-fns";
import { Bell, Calendar, ChevronRight } from "lucide-react";
import Link from "next/link";
import { leadsApi } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/providers/auth-provider";
import { formatIST } from "@/lib/date-utils";

export function TodayReminders() {
  const { user } = useAuth();
  const today = new Date().toISOString().split("T")[0];

  const { data, isLoading } = useSWR(["today-reminders", today], () =>
    leadsApi
      .getAllReminders({
        date: today,
        status: "pending",
        limit: 5,
      })
      .then((res) => res.data),
  );

  const reminders = data?.data || [];

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <Calendar className="h-4 w-4 text-primary" />
          Today's Reminders
        </CardTitle>
        <Button variant="ghost" size="sm" asChild className="text-xs">
          <Link href="/reminders">
            View All <ChevronRight className="ml-1 h-3 w-3" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {reminders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center text-muted-foreground">
            <Bell className="h-8 w-8 mb-2 opacity-20" />
            <p className="text-sm">No reminders for today</p>
          </div>
        ) : (
          <div className="space-y-3">
            {reminders.map((reminder: any) => (
              <div
                key={reminder.id}
                className="flex items-start justify-between p-3 rounded-lg border bg-muted/40 hover:bg-muted/60 transition-colors"
              >
                <div className="space-y-1 min-w-0">
                  <Link
                    href={`/${user?.departmentSlug || "sales"}/leads/${
                      reminder.leadId
                    }`}
                    className="text-sm font-medium hover:text-primary hover:underline truncate block"
                  >
                    {reminder.lead?.leadName || "Unknown Lead"}
                  </Link>
                  <p
                    className="text-xs text-muted-foreground line-clamp-1"
                    title={reminder.note}
                  >
                    {reminder.note || "No note"}
                  </p>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    <span className="font-medium text-primary">
                      {formatIST(reminder.reminderAt, "h:mm a")}
                    </span>
                    {reminder.user && <span>• {reminder.user.fullName}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
