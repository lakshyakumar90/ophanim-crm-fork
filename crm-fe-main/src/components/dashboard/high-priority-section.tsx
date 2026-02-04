"use client";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  Clock,
  FileWarning,
  CalendarX,
  UserX,
} from "lucide-react";
import Link from "next/link";

interface HighPriorityData {
  overdueTasks: number;
  pendingLeaves: number;
  staleLeads: number;
  overdueInvoices: number;
  absentToday: number;
}

interface HighPrioritySectionProps {
  data: HighPriorityData;
}

const alerts = [
  {
    key: "overdueTasks" as const,
    label: "Overdue Tasks",
    icon: Clock,
    color: "text-red-500",
    bgColor: "bg-red-50 dark:bg-red-950/30",
    borderColor: "border-red-200 dark:border-red-900",
    href: "/tasks?status=overdue",
  },
  {
    key: "pendingLeaves" as const,
    label: "Pending Leaves",
    icon: CalendarX,
    color: "text-orange-500",
    bgColor: "bg-orange-50 dark:bg-orange-950/30",
    borderColor: "border-orange-200 dark:border-orange-900",
    href: "/hr/leaves",
  },
  {
    key: "staleLeads" as const,
    label: "Stale Leads",
    icon: FileWarning,
    color: "text-amber-500",
    bgColor: "bg-amber-50 dark:bg-amber-950/30",
    borderColor: "border-amber-200 dark:border-amber-900",
    href: "/sales/leads?filter=stale",
  },
  {
    key: "overdueInvoices" as const,
    label: "Overdue Invoices",
    icon: AlertTriangle,
    color: "text-rose-500",
    bgColor: "bg-rose-50 dark:bg-rose-950/30",
    borderColor: "border-rose-200 dark:border-rose-900",
    href: "/finance/invoices?status=overdue",
  },
  {
    key: "absentToday" as const,
    label: "Absent Today",
    icon: UserX,
    color: "text-slate-500",
    bgColor: "bg-slate-50 dark:bg-slate-900/50",
    borderColor: "border-slate-200 dark:border-slate-800",
    href: "/hr/attendance",
  },
];

export function HighPrioritySection({ data }: HighPrioritySectionProps) {
  // Only show alerts with values > 0
  const activeAlerts = alerts.filter((alert) => data[alert.key] > 0);

  if (activeAlerts.length === 0) {
    return (
      <Card className="border-green-200 dark:border-green-900 bg-green-50/50 dark:bg-green-950/20">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center">
              <span className="text-green-600 text-lg">✓</span>
            </div>
            <div>
              <p className="font-medium text-green-700 dark:text-green-400">
                All Clear!
              </p>
              <p className="text-sm text-green-600/70 dark:text-green-500/70">
                No high priority items need attention
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
      {alerts.map((alert) => {
        const value = data[alert.key];
        const Icon = alert.icon;
        const isActive = value > 0;

        return (
          <Link key={alert.key} href={alert.href}>
            <Card
              className={cn(
                "cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:shadow-md",
                isActive
                  ? `${alert.bgColor} ${alert.borderColor}`
                  : "opacity-50 grayscale",
              )}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center",
                      isActive ? alert.bgColor : "bg-muted",
                    )}
                  >
                    <Icon
                      className={cn(
                        "w-5 h-5",
                        isActive ? alert.color : "text-muted-foreground",
                      )}
                    />
                  </div>
                  <div>
                    <p
                      className={cn(
                        "text-2xl font-bold tabular-nums",
                        isActive ? alert.color : "text-muted-foreground",
                      )}
                    >
                      {value}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {alert.label}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
