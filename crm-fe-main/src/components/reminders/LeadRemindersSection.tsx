"use client";

import Link from "next/link";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UserCircle, Check, Trash2, ExternalLink } from "lucide-react";
import type { RemindersPageState } from "@/hooks/shared/useRemindersPage";

type LeadRemindersSectionProps = Pick<
  RemindersPageState,
  | "leadReminders"
  | "isLoadingLeads"
  | "showOwnerColumn"
  | "handleMarkLeadDone"
  | "handleDeleteLeadReminder"
>;

export function LeadRemindersSection(props: LeadRemindersSectionProps) {
  const {
    leadReminders,
    isLoadingLeads,
    showOwnerColumn,
    handleMarkLeadDone,
    handleDeleteLeadReminder,
  } = props;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserCircle className="h-5 w-5" />
          Lead Reminders
          <Badge variant="secondary">{leadReminders.length}</Badge>
        </CardTitle>
        <CardDescription>Follow-up reminders set on leads.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoadingLeads ? (
          <div className="text-sm text-muted-foreground">Loading lead reminders...</div>
        ) : leadReminders.length === 0 ? (
          <div className="text-sm text-muted-foreground">No lead reminders found.</div>
        ) : (
          <div className="rounded-xl border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Lead</TableHead>
                  <TableHead>Reminder At</TableHead>
                  <TableHead>Note</TableHead>
                  {showOwnerColumn && <TableHead>Set By</TableHead>}
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leadReminders.map((r: any) => {
                  const reminderAt = r.reminderAt || r.reminder_at;
                  const leadId = r.leadId || r.lead_id;
                  const leadName = r.lead?.leadName || r.lead?.lead_name || "Unknown Lead";
                  const setBy = r.user?.fullName || r.user?.full_name;
                  const nowIso = new Date().toISOString();
                  const isOverdue = !!reminderAt && reminderAt < nowIso;
                  return (
                    <TableRow
                      key={r.id}
                      className={cn(isOverdue && "bg-red-100 hover:bg-red-200")}
                    >
                      <TableCell className="font-medium">
                        <div className="truncate max-w-[200px]">{leadName}</div>
                      </TableCell>
                      <TableCell>
                        {reminderAt ? format(new Date(reminderAt), "MMM d, yyyy h:mm a") : "-"}
                        {isOverdue && (
                          <span className="block text-[11px] text-amber-700 font-semibold">overdue</span>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-muted-foreground">
                        {r.note || "-"}
                      </TableCell>
                      {showOwnerColumn && (
                        <TableCell>
                          {setBy ? (
                            <div className="flex items-center gap-2">
                              <span className="text-sm truncate">{setBy}</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                      )}
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                            title="Mark done"
                            onClick={() => handleMarkLeadDone(r.id)}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                            title="Delete reminder"
                            onClick={() => handleDeleteLeadReminder(leadId, r.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                          <Button asChild size="sm" variant="ghost" className="h-7 w-7 p-0" title="Open lead">
                            <Link href={leadId ? `/sales/leads/${leadId}` : "#"}>
                              <ExternalLink className="h-4 w-4" />
                            </Link>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
