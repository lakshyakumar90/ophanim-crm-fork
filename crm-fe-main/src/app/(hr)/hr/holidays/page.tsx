"use client";

import { useState, useCallback, useMemo } from "react";
import useSWR, { mutate } from "swr";
import { attendanceApi } from "@/lib/api";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CalendarDays, ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
import {
  addDays,
  addMonths,
  endOfMonth,
  format,
  isSameDay,
  isWeekend,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { useHeaderRefresh } from "@/hooks/layout/useHeaderRefresh";
import { useAuth } from "@/providers/auth-provider";
import {
  type CalEvent,
  DayColumn,
  EVENT_COLORS,
  MONTH_NAMES,
  TYPE_ICONS,
  dateToKey,
} from "@/components/calendar/calendar-primitives";
import { cn } from "@/lib/utils";

const holidayTypes = ["national", "regional", "optional"] as const;

export default function HRHolidaysPage() {
  const { user, can } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<"day" | "week" | "month">("month");
  const [addOpen, setAddOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [createDefaultDate, setCreateDefaultDate] = useState<Date | null>(null);

  const [form, setForm] = useState({
    name: "",
    date: "",
    isOptional: false,
    holidayType: "national",
  });

  const currentYear = currentDate.getFullYear();

  const { data: holidays, isLoading } = useSWR(
    ["hr-holidays", currentYear],
    () => attendanceApi.getHolidays(currentYear),
  );

  const refreshHolidays = useCallback(async () => {
    await mutate(["hr-holidays", currentYear]);
  }, [currentYear]);

  useHeaderRefresh({
    onRefresh: refreshHolidays,
  });

  const holidayList: any[] = Array.isArray(holidays) ? holidays : [];

  const sorted = [...holidayList].sort((a, b) => {
    const da = a.holiday_date || a.date || "";
    const db = b.holiday_date || b.date || "";
    return da.localeCompare(db);
  });

  const today = new Date();
  const weekStart = useMemo(
    () => startOfWeek(currentDate, { weekStartsOn: 1 }),
    [currentDate],
  );

  const calDays = useMemo(() => {
    if (viewMode === "day") {
      return [currentDate];
    }
    if (viewMode === "week") {
      return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
    }

    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const days: Date[] = [];
    let d = monthStart;
    while (d <= monthEnd) {
      days.push(d);
      d = addDays(d, 1);
    }
    return days;
  }, [currentDate, weekStart, viewMode]);

  const holidaysByDate = useMemo(() => {
    const map = new Map<string, any>();
    for (const h of sorted) {
      const d = h.holiday_date || h.date;
      if (!d) continue;
      map.set(d, h);
    }
    return map;
  }, [sorted]);

  const events = useMemo<CalEvent[]>(() => {
    const out: CalEvent[] = [];

    for (const h of sorted) {
      const d = h.holiday_date || h.date;
      if (!d) continue;
      out.push({
        id: `holiday-${h.id}`,
        title: h.name || "Holiday",
        subtitle: h.holiday_type || (h.is_optional ? "Optional holiday" : "Holiday"),
        type: "holiday",
        date: new Date(`${d}T00:00:00`),
        color: EVENT_COLORS.holiday,
        raw: h,
      });
    }

    for (const day of calDays) {
      if (!isWeekend(day)) continue;
      const key = dateToKey(day);
      if (holidaysByDate.has(key)) continue;
      out.push({
        id: `weekend-${key}`,
        title: "Weekend",
        subtitle: "Weekly day-off",
        type: "weekend",
        date: day,
        color: EVENT_COLORS.weekend,
        raw: { kind: "weekend", date: key },
      });
    }

    return out;
  }, [calDays, holidaysByDate, sorted]);

  const eventMap = useMemo<Record<string, CalEvent[]>>(() => {
    const map: Record<string, CalEvent[]> = {};
    for (const ev of events) {
      const key = dateToKey(ev.date);
      if (!map[key]) map[key] = [];
      map[key]!.push(ev);
    }
    return map;
  }, [events]);

  const headerLabel = useMemo(() => {
    if (viewMode === "day") return format(currentDate, "MMMM d, yyyy");
    if (viewMode === "week") {
      const end = addDays(weekStart, 6);
      if (weekStart.getMonth() === end.getMonth()) {
        return `${format(weekStart, "MMM d")} – ${format(end, "d, yyyy")}`;
      }
      return `${format(weekStart, "MMM d")} – ${format(end, "MMM d, yyyy")}`;
    }
    return `${MONTH_NAMES[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
  }, [currentDate, viewMode, weekStart]);

  const canManageHolidays =
    user?.role === "admin" ||
    can("crm:admin") ||
    can("hr:manage") ||
    can("hr:attendance_manage");

  const handleAdd = async () => {
    if (!form.name.trim()) {
      toast.error("Holiday name is required");
      return;
    }
    if (!form.date) {
      toast.error("Date is required");
      return;
    }
    setIsSaving(true);
    try {
      const isOptional = form.holidayType === "optional" ? true : form.isOptional;
      await attendanceApi.createHoliday({
        name: form.name.trim(),
        date: form.date,
        isOptional,
      });
      toast.success("Holiday added successfully");
      setAddOpen(false);
      setForm({ name: "", date: "", isOptional: false, holidayType: "national" });
      mutate(["hr-holidays", currentYear]);
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message || "Failed to add holiday");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await attendanceApi.deleteHoliday(deleteId);
      toast.success("Holiday removed");
      setDeleteId(null);
      mutate(["hr-holidays", currentYear]);
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message || "Failed to delete holiday");
    }
  };

  const goBack = () => {
    if (viewMode === "day") setCurrentDate((d) => addDays(d, -1));
    else if (viewMode === "week") setCurrentDate((d) => addDays(d, -7));
    else setCurrentDate((d) => subMonths(d, 1));
  };

  const goForward = () => {
    if (viewMode === "day") setCurrentDate((d) => addDays(d, 1));
    else if (viewMode === "week") setCurrentDate((d) => addDays(d, 7));
    else setCurrentDate((d) => addMonths(d, 1));
  };

  const openCreate = (d?: Date) => {
    if (!canManageHolidays) return;
    setCreateDefaultDate(d || currentDate);
    setForm((f) => ({ ...f, date: format(d || currentDate, "yyyy-MM-dd") }));
    setAddOpen(true);
  };

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      <div className="shrink-0 flex flex-col gap-3 px-4 py-3 border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-20">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <CalendarDays className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-bold tracking-tight">Holiday Calendar</h1>
            <Badge variant="secondary">{sorted.length}</Badge>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex border rounded-md overflow-hidden">
              {(["day", "week", "month"] as const).map((v) => (
                <button
                  key={v}
                  className={cn(
                    "px-3 py-1.5 text-xs font-medium transition-colors capitalize",
                    viewMode === v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted",
                  )}
                  onClick={() => setViewMode(v)}
                >
                  {v}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1 border rounded-md">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={goBack}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium px-2 min-w-45 text-center">{headerLabel}</span>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={goForward}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setCurrentDate(today)}>
              Today
            </Button>

            {canManageHolidays ? (
              <Button size="sm" className="h-8 text-xs gap-1.5" onClick={() => openCreate(currentDate)}>
                <Plus className="h-3.5 w-3.5" />
                Add Holiday
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="shrink-0 flex items-center gap-3 px-4 py-1 border-b border-border/40 text-[11px] bg-background/50">
        {(["holiday", "weekend"] as const).map((type) => {
          const Icon = TYPE_ICONS[type];
          return (
            <div key={type} className="flex items-center gap-1 capitalize text-muted-foreground">
              <div className={cn("w-2.5 h-2.5 rounded border", EVENT_COLORS[type].split(" ").filter((c) => c.startsWith("bg-") || c.startsWith("border-")).join(" "))} />
              <Icon className="h-3 w-3" /> {type === "weekend" ? "Weekend day-off" : "Holiday"}
            </div>
          );
        })}
        <span className="ml-auto text-muted-foreground">
          {canManageHolidays ? "Tip: click a holiday card to remove it" : "View-only access"}
        </span>
      </div>

      {isLoading ? (
        <div className="p-6 text-sm text-muted-foreground">Loading holidays…</div>
      ) : (
        <div className="flex-1 overflow-x-auto overflow-y-auto">
          <div
            className="grid h-full"
            style={{ gridTemplateColumns: `repeat(${calDays.length}, minmax(160px, 1fr))`, minHeight: "500px" }}
          >
            {calDays.map((day) => {
              const key = dateToKey(day);
              return (
                <div key={key} className="group">
                  <DayColumn
                    date={day}
                    events={eventMap[key] || []}
                    isToday={isSameDay(day, today)}
                    isWeekend={isWeekend(day)}
                    showAddButton={canManageHolidays}
                    onAddClick={(d) => openCreate(d)}
                    onEventClick={(ev) => {
                      if (ev.type === "holiday" && canManageHolidays) {
                        const id = ev.raw?.id as string | undefined;
                        if (id) setDeleteId(id);
                      }
                    }}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Add Holiday Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Holiday</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="holiday-name">Name *</Label>
              <Input
                id="holiday-name"
                placeholder="e.g. Republic Day"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="holiday-date">Date *</Label>
              <Input
                id="holiday-date"
                type="date"
                value={form.date || (createDefaultDate ? format(createDefaultDate, "yyyy-MM-dd") : "")}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Holiday Type</Label>
              <Select value={form.holidayType} onValueChange={(v) => setForm((f) => ({ ...f, holidayType: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {holidayTypes.map((t) => (
                    <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3">
              <Switch
                id="holiday-optional"
                checked={form.isOptional}
                onCheckedChange={(v) => setForm((f) => ({ ...f, isOptional: v }))}
              />
              <Label htmlFor="holiday-optional">Optional holiday</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAdd} disabled={isSaving || !canManageHolidays}>
              {isSaving ? "Adding..." : "Add Holiday"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog
        open={Boolean(deleteId)}
        onOpenChange={(open) => { if (!open) setDeleteId(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Holiday</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this holiday? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
