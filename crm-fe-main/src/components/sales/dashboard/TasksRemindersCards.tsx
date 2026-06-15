"use client";

import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  Clock,
  CalendarClock,
  Bell,
  BellRing,
  ArrowRight,
} from "lucide-react";

interface TasksRemindersCardsProps {
  tasks: {
    overdue?: number;
    dueToday?: number;
    pending?: number;
  };
  reminders: {
    overdue?: number;
    dueToday?: number;
    pending?: number;
  };
}

export function TasksRemindersCards({ tasks, reminders }: TasksRemindersCardsProps) {
  const router = useRouter();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Tasks & Follow-ups</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/sales/tasks")}
              className="h-8"
            >
              View All
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
          <CardDescription className="text-xs">Current task status</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {[
            {
              label: "Overdue",
              value: tasks.overdue || 0,
              icon: AlertTriangle,
              bg: "bg-rose-50 dark:bg-rose-950",
              border: "border-rose-200 dark:border-rose-800",
              iconColor: "text-rose-600",
              badgeCls: "bg-rose-100 text-rose-700 border-0",
            },
            {
              label: "Due Today",
              value: tasks.dueToday || 0,
              icon: Clock,
              bg: "bg-orange-50 dark:bg-orange-950",
              border: "border-orange-200 dark:border-orange-800",
              iconColor: "text-orange-600",
              badgeCls: "bg-orange-100 text-orange-700 border-0",
            },
            {
              label: "Pending",
              value: tasks.pending || 0,
              icon: CalendarClock,
              bg: "bg-blue-50 dark:bg-blue-950",
              border: "border-blue-200 dark:border-blue-800",
              iconColor: "text-blue-600",
              badgeCls: "bg-blue-100 text-blue-700 border-0",
            },
          ].map(({ label, value, icon: Icon, bg, border, iconColor, badgeCls }) => (
            <div
              key={label}
              className={cn(
                "flex items-center justify-between p-2.5 rounded-lg border",
                bg,
                border,
              )}
            >
              <div className="flex items-center gap-2.5">
                <Icon className={cn("w-4 h-4", iconColor)} />
                <span className="font-medium text-sm">{label}</span>
              </div>
              <Badge className={badgeCls}>{value}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Reminders</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/reminders")}
              className="h-8"
            >
              View All
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
          <CardDescription className="text-xs">Sales reminders status</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {[
            {
              label: "Overdue",
              value: reminders.overdue || 0,
              icon: BellRing,
              bg: "bg-rose-50 dark:bg-rose-950",
              border: "border-rose-200 dark:border-rose-800",
              iconColor: "text-rose-600",
              badgeCls: "bg-rose-100 text-rose-700 border-0",
            },
            {
              label: "Due Today",
              value: reminders.dueToday || 0,
              icon: Bell,
              bg: "bg-amber-50 dark:bg-amber-950",
              border: "border-amber-200 dark:border-amber-800",
              iconColor: "text-amber-600",
              badgeCls: "bg-amber-100 text-amber-700 border-0",
            },
            {
              label: "Pending",
              value: reminders.pending || 0,
              icon: CalendarClock,
              bg: "bg-blue-50 dark:bg-blue-950",
              border: "border-blue-200 dark:border-blue-800",
              iconColor: "text-blue-600",
              badgeCls: "bg-blue-100 text-blue-700 border-0",
            },
          ].map(({ label, value, icon: Icon, bg, border, iconColor, badgeCls }) => (
            <div
              key={label}
              className={cn(
                "flex items-center justify-between p-2.5 rounded-lg border",
                bg,
                border,
              )}
            >
              <div className="flex items-center gap-2.5">
                <Icon className={cn("w-4 h-4", iconColor)} />
                <span className="font-medium text-sm">{label}</span>
              </div>
              <Badge className={badgeCls}>{value}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
