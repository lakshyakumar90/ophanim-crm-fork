"use client";

import { useState, useEffect, useMemo } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import { leadsApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Bell,
  Plus,
  Trash2,
  Clock,
  Loader2,
  Calendar,
  Check,
} from "lucide-react";
import { formatIST } from "@/lib/date-utils";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface LeadReminderWidgetProps {
  leadId: string;
  reminders?: Reminder[];
  onCreateReminder?: (input: { reminderAt: string; note?: string }) => Promise<void>;
  onDeleteReminder?: (reminderId: string) => Promise<void>;
  onMarkDone?: (reminderId: string) => Promise<void>;
  onRefresh?: () => Promise<void> | void;
}

interface Reminder {
  id: string;
  leadId?: string;
  userId?: string;
  reminderAt: string;
  note: string | null;
  isSent: boolean;
  isDone: boolean;
  createdAt?: string;
}

function getApiErrorMessage(error: unknown, fallback: string): string {
  const message = (error as {
    response?: { data?: { error?: { message?: string } } };
  })?.response?.data?.error?.message;
  return message || fallback;
}

const HOURS = Array.from({ length: 12 }, (_, i) =>
  (i + 1).toString().padStart(2, "0"),
);
const MINUTES = ["00", "15", "30", "45"];

export function LeadReminderWidget({
  leadId,
  reminders: externalReminders,
  onCreateReminder,
  onDeleteReminder,
  onMarkDone,
  onRefresh,
}: LeadReminderWidgetProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Separate date and time state
  const [reminderDate, setReminderDate] = useState("");
  const [reminderHour, setReminderHour] = useState("09");
  const [reminderMinute, setReminderMinute] = useState("00");
  const [reminderPeriod, setReminderPeriod] = useState<"AM" | "PM">("AM");
  const [reminderNote, setReminderNote] = useState("");

  const hasExternalReminders = Array.isArray(externalReminders);
  const { data: swrReminders, mutate } = useSWR(
    !hasExternalReminders && leadId ? `lead-reminders-${leadId}` : null,
    () => leadsApi.getReminders(leadId),
    {
      refreshInterval: 0, // No polling
      revalidateOnFocus: false,
    },
  );

  const reminders = useMemo(
    () =>
      (hasExternalReminders
        ? externalReminders ?? []
        : swrReminders ?? []) as Reminder[],
    [hasExternalReminders, externalReminders, swrReminders],
  );

  const refreshReminderList = async () => {
    if (onRefresh) {
      await onRefresh();
      return;
    }
    await mutate();
  };

  // Client-side check for reminders every minute
  useEffect(() => {
    if (!reminders) return;

    const checkReminders = () => {
      const now = new Date();
      reminders.forEach((r: Reminder) => {
        if (r.isSent) return;
        const reminderTime = new Date(r.reminderAt);
        const timeDiff = reminderTime.getTime() - now.getTime();

        // Check if reminder is due within the last minute (and not sent)
        if (Math.abs(timeDiff) < 60000) {
          toast.info(`Reminder: ${r.note || "Check lead"}`, {
            description: formatIST(r.reminderAt, "h:mm a"),
            action: {
              label: "View",
              onClick: () => window.location.reload(), // Or scroll to it
            },
            duration: 10000,
          });
        }
      });
    };

    const interval = setInterval(checkReminders, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [reminders]);

  const handleCreateReminder = async () => {
    if (!reminderDate) {
      toast.error("Please select a date for the reminder");
      return;
    }

    setIsCreating(true);
    try {
      // Convert 12-hour to 24-hour format
      let hour24 = parseInt(reminderHour);
      if (reminderPeriod === "PM" && hour24 !== 12) {
        hour24 += 12;
      } else if (reminderPeriod === "AM" && hour24 === 12) {
        hour24 = 0;
      }

      const reminderDateTime = new Date(reminderDate);
      reminderDateTime.setHours(hour24, parseInt(reminderMinute), 0, 0);

      if (onCreateReminder) {
        await onCreateReminder({
          reminderAt: reminderDateTime.toISOString(),
          note: reminderNote || undefined,
        });
      } else {
        await leadsApi.createReminder(
          leadId,
          reminderDateTime.toISOString(),
          reminderNote || undefined,
        );
      }
      toast.success("Reminder set successfully");
      setIsDialogOpen(false);
      resetForm();
      await refreshReminderList();
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "Failed to create reminder"));
    } finally {
      setIsCreating(false);
    }
  };

  const resetForm = () => {
    setReminderDate("");
    setReminderHour("09");
    setReminderMinute("00");
    setReminderPeriod("AM");
    setReminderNote("");
  };

  const handleDeleteReminder = async (reminderId: string) => {
    try {
      if (onDeleteReminder) {
        await onDeleteReminder(reminderId);
      } else {
        await leadsApi.deleteReminder(leadId, reminderId);
      }
      toast.success("Reminder deleted");
      await refreshReminderList();
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "Failed to delete reminder"));
    }
  };

  const handleMarkDone = async (reminderId: string) => {
    try {
      if (onMarkDone) {
        await onMarkDone(reminderId);
      } else {
        await leadsApi.markReminderDone(reminderId);
      }
      toast.success("Reminder marked as done");
      await refreshReminderList();
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "Failed to mark reminder as done"));
    }
  };

  const isOverdue = (reminderAt: string) => {
    return new Date(reminderAt).getTime() < Date.now();
  };

  // Include overdue reminders (not just future ones)
  const pendingReminders = (reminders || []).filter(
    (r: Reminder) => !r.isSent && !r.isDone,
  );

  const today = new Date().toISOString().split("T")[0];

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center">
              <Bell className="h-3.5 w-3.5 text-primary" />
            </div>
            Reminders
          </CardTitle>
          <Dialog
            open={isDialogOpen}
            onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) resetForm();
            }}
          >
            <DialogTrigger asChild>
              <Button
                size="sm"
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5 text-primary" />
                  Set Reminder
                </DialogTitle>
                <DialogDescription>
                  Get notified about this lead at a specific time
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {/* Date */}
                <div className="space-y-2">
                  <Label
                    htmlFor="reminder-date"
                    className="flex items-center gap-2"
                  >
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    Date
                  </Label>
                  <Input
                    id="reminder-date"
                    type="date"
                    value={reminderDate}
                    onChange={(e) => setReminderDate(e.target.value)}
                    min={today}
                  />
                </div>

                {/* Time - 12 Hour Format */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    Time
                  </Label>
                  <div className="flex items-center gap-2">
                    <Select
                      value={reminderHour}
                      onValueChange={setReminderHour}
                    >
                      <SelectTrigger className="w-20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {HOURS.map((hour) => (
                          <SelectItem key={hour} value={hour}>
                            {hour}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <span className="text-lg font-semibold text-muted-foreground">
                      :
                    </span>
                    <Select
                      value={reminderMinute}
                      onValueChange={setReminderMinute}
                    >
                      <SelectTrigger className="w-20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MINUTES.map((min) => (
                          <SelectItem key={min} value={min}>
                            {min}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {/* AM/PM Toggle */}
                    <div className="flex rounded-lg border overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setReminderPeriod("AM")}
                        className={`px-3 py-2 text-sm font-medium transition-colors ${
                          reminderPeriod === "AM"
                            ? "bg-primary text-primary-foreground"
                            : "bg-background hover:bg-muted"
                        }`}
                      >
                        AM
                      </button>
                      <button
                        type="button"
                        onClick={() => setReminderPeriod("PM")}
                        className={`px-3 py-2 text-sm font-medium transition-colors ${
                          reminderPeriod === "PM"
                            ? "bg-primary text-primary-foreground"
                            : "bg-background hover:bg-muted"
                        }`}
                      >
                        PM
                      </button>
                    </div>
                  </div>
                </div>

                {/* Note */}
                <div className="space-y-2">
                  <Label htmlFor="reminder-note">Note (optional)</Label>
                  <Textarea
                    id="reminder-note"
                    placeholder="e.g., Follow up on proposal..."
                    value={reminderNote}
                    onChange={(e) => setReminderNote(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateReminder}
                  disabled={isCreating || !reminderDate}
                  className="bg-primary hover:bg-primary/90"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Setting...
                    </>
                  ) : (
                    "Set Reminder"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {pendingReminders.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No reminders set
          </p>
        ) : (
          <div className="space-y-2">
            {pendingReminders.map((reminder: Reminder) => {
              const overdue = isOverdue(reminder.reminderAt);
              return (
                <div
                  key={reminder.id}
                  className={cn(
                    "flex items-start justify-between gap-2 p-3 rounded-lg border",
                    overdue
                      ? "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800"
                      : "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800",
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 text-sm font-medium">
                      <Clock
                        className={cn(
                          "h-3.5 w-3.5",
                          overdue ? "text-red-600" : "text-amber-600",
                        )}
                      />
                      <span
                        className={overdue ? "text-red-700" : "text-amber-700"}
                      >
                        {formatIST(
                          reminder.reminderAt,
                          "EEE, MMM d 'at' h:mm a",
                        )}
                      </span>
                      {overdue && (
                        <Badge
                          variant="destructive"
                          className="text-[10px] px-1.5 py-0"
                        >
                          Overdue
                        </Badge>
                      )}
                    </div>
                    {reminder.note && (
                      <p className="text-xs text-muted-foreground mt-1 truncate">
                        {reminder.note}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className={cn(
                        "h-7 w-7",
                        overdue
                          ? "text-red-600 hover:bg-red-200 dark:hover:bg-red-900"
                          : "text-amber-600 hover:bg-amber-200 dark:hover:bg-amber-900",
                      )}
                      onClick={() => handleMarkDone(reminder.id)}
                      title="Mark as Done"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDeleteReminder(reminder.id)}
                      title="Delete Reminder"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Header button component
interface SetReminderButtonProps {
  leadId: string;
  onCreateReminder?: (input: { reminderAt: string; note?: string }) => Promise<void>;
  onRefresh?: () => Promise<void> | void;
}

export function SetReminderButton({
  leadId,
  onCreateReminder,
  onRefresh,
}: SetReminderButtonProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const [reminderDate, setReminderDate] = useState("");
  const [reminderHour, setReminderHour] = useState("09");
  const [reminderMinute, setReminderMinute] = useState("00");
  const [reminderPeriod, setReminderPeriod] = useState<"AM" | "PM">("AM");
  const [reminderNote, setReminderNote] = useState("");

  const { mutate } = useSWR(
    onRefresh ? null : leadId ? `lead-reminders-${leadId}` : null,
    () => leadsApi.getReminders(leadId),
  );

  const refreshReminderList = async () => {
    if (onRefresh) {
      await onRefresh();
      return;
    }
    await mutate();
  };

  const handleCreate = async () => {
    if (!reminderDate) {
      toast.error("Please select a date");
      return;
    }

    setIsCreating(true);
    try {
      let hour24 = parseInt(reminderHour);
      if (reminderPeriod === "PM" && hour24 !== 12) hour24 += 12;
      else if (reminderPeriod === "AM" && hour24 === 12) hour24 = 0;

      const dt = new Date(reminderDate);
      dt.setHours(hour24, parseInt(reminderMinute), 0, 0);

      if (onCreateReminder) {
        await onCreateReminder({
          reminderAt: dt.toISOString(),
          note: reminderNote || undefined,
        });
      } else {
        await leadsApi.createReminder(
          leadId,
          dt.toISOString(),
          reminderNote || undefined,
        );
      }
      toast.success("Reminder set!");
      setIsDialogOpen(false);
      setReminderDate("");
      setReminderHour("09");
      setReminderMinute("00");
      setReminderPeriod("AM");
      setReminderNote("");
      await refreshReminderList();
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "Failed to create reminder"));
    } finally {
      setIsCreating(false);
    }
  };

  const today = new Date().toISOString().split("T")[0];

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="border-primary/20 text-primary hover:bg-primary/5 hover:text-primary"
        >
          <Bell className="w-4 h-4 mr-2" />
          Set Reminder
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            Set Reminder
          </DialogTitle>
          <DialogDescription>Get notified about this lead</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              Date
            </Label>
            <Input
              type="date"
              value={reminderDate}
              onChange={(e) => setReminderDate(e.target.value)}
              min={today}
            />
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              Time
            </Label>
            <div className="flex items-center gap-2">
              <Select value={reminderHour} onValueChange={setReminderHour}>
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {HOURS.map((h) => (
                    <SelectItem key={h} value={h}>
                      {h}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-lg font-semibold text-muted-foreground">
                :
              </span>
              <Select value={reminderMinute} onValueChange={setReminderMinute}>
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MINUTES.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex rounded-lg border overflow-hidden">
                <button
                  type="button"
                  onClick={() => setReminderPeriod("AM")}
                  className={`px-3 py-2 text-sm font-medium ${
                    reminderPeriod === "AM"
                      ? "bg-primary text-primary-foreground"
                      : "bg-background hover:bg-muted"
                  }`}
                >
                  AM
                </button>
                <button
                  type="button"
                  onClick={() => setReminderPeriod("PM")}
                  className={`px-3 py-2 text-sm font-medium ${
                    reminderPeriod === "PM"
                      ? "bg-primary text-primary-foreground"
                      : "bg-background hover:bg-muted"
                  }`}
                >
                  PM
                </button>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Note (optional)</Label>
            <Textarea
              placeholder="e.g., Follow up on proposal..."
              value={reminderNote}
              onChange={(e) => setReminderNote(e.target.value)}
              rows={2}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={isCreating || !reminderDate}
            className="bg-primary hover:bg-primary/90"
          >
            {isCreating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Setting...
              </>
            ) : (
              "Set Reminder"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
