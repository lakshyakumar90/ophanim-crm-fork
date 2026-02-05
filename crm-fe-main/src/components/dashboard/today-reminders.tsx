"use client";

import useSWR from "swr";
import { Bell, Calendar, Check, ChevronRight } from "lucide-react";
import Link from "next/link";
import { leadsApi } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/providers/auth-provider";
import { formatIST } from "@/lib/date-utils";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/**
 * Check if a reminder is overdue
 */
function isOverdue(reminderAt: string): boolean {
  const reminderTime = new Date(reminderAt).getTime();
  const now = Date.now();
  return reminderTime < now;
}

export function TodayReminders() {
  const { user } = useAuth();
  const today = new Date().toISOString().split("T")[0];

  const { data, isLoading, mutate } = useSWR(["today-reminders", today], () =>
    leadsApi
      .getAllReminders({
        date: today,
        status: "pending",
        limit: 5,
      })
      .then((res) => res.data),
  );

  const reminders = data?.data || [];

  const handleMarkDone = async (reminderId: string) => {
    try {
      await leadsApi.markReminderDone(reminderId);
      toast.success("Reminder marked as done");
      mutate(); // Refresh the list
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || "Failed to mark reminder as done",
      );
    }
  };

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
            {reminders.map((reminder: any) => {
              const overdue = isOverdue(reminder.reminderAt);
              return (
                <div
                  key={reminder.id}
                  className={cn(
                    "flex items-start justify-between p-3 rounded-lg border transition-colors",
                    overdue
                      ? "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-950/30"
                      : "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-950/30",
                  )}
                >
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/${user?.departmentSlug || "sales"}/leads/${
                          reminder.leadId
                        }`}
                        className="text-sm font-medium hover:text-primary hover:underline truncate"
                      >
                        {reminder.lead?.leadName || "Unknown Lead"}
                      </Link>
                      {overdue && (
                        <Badge
                          variant="destructive"
                          className="text-[10px] px-1.5 py-0"
                        >
                          Overdue
                        </Badge>
                      )}
                    </div>
                    <p
                      className="text-xs text-muted-foreground line-clamp-1"
                      title={reminder.note}
                    >
                      {reminder.note || "No note"}
                    </p>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                      <span
                        className={cn(
                          "font-medium",
                          overdue ? "text-red-600" : "text-amber-600",
                        )}
                      >
                        {formatIST(reminder.reminderAt, "h:mm a")}
                      </span>
                      {reminder.user && <span>• {reminder.user.fullName}</span>}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "h-8 w-8 shrink-0 ml-2",
                      overdue
                        ? "hover:bg-red-200 dark:hover:bg-red-900"
                        : "hover:bg-amber-200 dark:hover:bg-amber-900",
                    )}
                    onClick={() => handleMarkDone(reminder.id)}
                    title="Mark as Done"
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
