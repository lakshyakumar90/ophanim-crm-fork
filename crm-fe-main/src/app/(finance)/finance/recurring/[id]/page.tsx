"use client";

import { useCallback } from "react";
import { useParams } from "next/navigation";
import useSWR from "swr";
import { recurringApi, type RecurringSchedule } from "@/lib/finance-api";
import { useAuth, useIsAdmin, useIsManager } from "@/providers/auth-provider";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CalendarClock, ArrowLeft, Play, Pause, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { toast } from "sonner";
import { useHeaderRefresh } from "@/hooks/layout/useHeaderRefresh";

const FREQUENCY_LABELS: Record<string, string> = {
  weekly: "Weekly",
  monthly: "Monthly",
  quarterly: "Quarterly",
  yearly: "Yearly",
};

export default function RecurringScheduleDetailPage() {
  const { user } = useAuth();
  const isAdmin = useIsAdmin();
  const isManager = useIsManager();
  const router = useRouter();
  const params = useParams();
  const scheduleId = params.id as string;

  const {
    data: schedule,
    isLoading,
    mutate,
  } = useSWR<RecurringSchedule>(
    user && scheduleId ? ["recurring-schedule", scheduleId] : null,
    () => recurringApi.get(scheduleId),
  );

  const refreshRecurringSchedule = useCallback(async () => {
    await mutate();
  }, [mutate]);

  useHeaderRefresh({
    onRefresh: refreshRecurringSchedule,
    enabled: Boolean(user && scheduleId),
  });

  const handlePause = async () => {
    try {
      await recurringApi.pause(scheduleId);
      toast.success("Schedule paused");
      mutate();
    } catch (error) {
      toast.error("Failed to pause schedule");
    }
  };

  const handleResume = async () => {
    try {
      await recurringApi.resume(scheduleId);
      toast.success("Schedule resumed");
      mutate();
    } catch (error) {
      toast.error("Failed to resume schedule");
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this schedule?")) return;
    try {
      await recurringApi.delete(scheduleId);
      toast.success("Schedule deleted");
      router.push("/finance/recurring");
    } catch (error) {
      toast.error("Failed to delete schedule");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-3xl">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!schedule) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Schedule not found</p>
        <Link href="/finance/recurring">
          <Button variant="link">Back to Recurring</Button>
        </Link>
      </div>
    );
  }

  const lineItems = (schedule.line_items_template as any[]) || [];

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/finance/recurring">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <CalendarClock className="h-6 w-6 text-primary" />
              {schedule.name}
            </h1>
            <p className="text-muted-foreground">{schedule.client_name}</p>
          </div>
          <Badge
            className={
              schedule.is_active
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300"
                : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400"
            }
          >
            {schedule.is_active ? "Active" : "Paused"}
          </Badge>
        </div>

        <div className="flex gap-2">
          {schedule.is_active ? (
            <Button variant="outline" onClick={handlePause}>
              <Pause className="h-4 w-4 mr-2" />
              Pause
            </Button>
          ) : (
            <Button variant="outline" onClick={handleResume}>
              <Play className="h-4 w-4 mr-2" />
              Resume
            </Button>
          )}
          {isAdmin && (
            <Button
              variant="outline"
              onClick={handleDelete}
              className="text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          )}
        </div>
      </div>

      {/* Schedule Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Schedule Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Client</p>
              <p className="font-medium">{schedule.client_name}</p>
              <p className="text-muted-foreground text-xs">
                {schedule.client_email}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Frequency</p>
              <p className="font-medium">
                {FREQUENCY_LABELS[schedule.frequency]}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Next Run</p>
              <p className="font-medium">
                {schedule.next_run_date
                  ? format(new Date(schedule.next_run_date), "dd MMM yyyy")
                  : "—"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Base Amount</p>
              <p className="font-bold text-lg">
                ₹{Number(schedule.base_amount).toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Start Date</p>
              <p className="font-medium">
                {format(new Date(schedule.start_date), "dd MMM yyyy")}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">End Date</p>
              <p className="font-medium">
                {schedule.end_date
                  ? format(new Date(schedule.end_date), "dd MMM yyyy")
                  : "No end date"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Options */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Options</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Auto-send email</span>
            <Badge variant="outline">
              {schedule.auto_send_email ? "Yes" : "No"}
            </Badge>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Requires approval</span>
            <Badge variant="outline">
              {schedule.requires_approval ? "Yes" : "No"}
            </Badge>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Tax Rate</span>
            <span>{schedule.tax_rate || 0}%</span>
          </div>
        </CardContent>
      </Card>

      {/* Line Items Template */}
      {lineItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Line Items Template</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lineItems.map((item: any, index: number) => (
                  <TableRow key={index}>
                    <TableCell>{item.description}</TableCell>
                    <TableCell className="text-right">
                      {item.quantity}
                    </TableCell>
                    <TableCell className="text-right">
                      ₹{Number(item.unit_price).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      ₹{(item.quantity * item.unit_price).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Lead Info */}
      {schedule.lead && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Linked Lead</CardTitle>
          </CardHeader>
          <CardContent>
            <Link
              href={`/sales/leads/${schedule.lead.id}`}
              className="text-primary hover:underline"
            >
              {(schedule.lead as any).lead_name} -{" "}
              {(schedule.lead as any).company_name}
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
