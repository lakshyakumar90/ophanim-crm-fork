"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import useSWR from "swr";
import { useRouter } from "next/navigation";
import {
  format,
  startOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameDay,
  isWeekend,
  parseISO,
  startOfMonth,
  endOfMonth,
} from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  CalendarDays,
  Filter,
  X,
  Bell,
  UserIcon,
  Users,
  Building2,
  Loader2,
  GripVertical,
  Lock,
  Trash2,
  Check,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useAuth, useIsAdmin, useIsManager } from "@/providers/auth-provider";
import { useHeaderRefresh } from "@/hooks/layout/useHeaderRefresh";
import {
  tasksApi,
  leadsApi,
  attendanceApi,
  usersApi,
  teamsApi,
  projectsApi,
} from "@/lib/api";
import { getDepartments } from "@/lib/supabase-queries";
import {
  type CalEvent,
  type CalendarEventType,
  dateToKey,
  DayColumn,
  EVENT_COLORS,
  MONTH_NAMES,
  TYPE_ICONS,
} from "@/components/calendar/calendar-primitives";

type EventType = CalendarEventType;

function getInitials(name: string) {
  return (name || "U")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// ─── Create Event Modal ──────────────────────────────────────────────────────

function CreateEventModal({
  open,
  onClose,
  defaultDate,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  defaultDate: Date | null;
  onCreated: () => void;
}) {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(defaultDate ? format(defaultDate, "yyyy-MM-dd") : "");
  const [time, setTime] = useState("09:00");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (defaultDate) setDate(format(defaultDate, "yyyy-MM-dd"));
  }, [defaultDate]);

  async function handleCreate() {
    if (!title || !date) return;

    setLoading(true);
    try {
      const dueDate = new Date(`${date}T${time}:00`).toISOString();

      await tasksApi.create({
        title: `[Reminder] ${title}`,
        dueDate,
        status: "todo",
        assignedTo: user?.id
      });

      onCreated();
      onClose();
      setTitle("");
    } catch (err) {
      console.error("Failed to create reminder", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-amber-500" />
            Add Reminder
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              What do you want to be reminded about?
            </label>
            <Input
              placeholder="e.g. Call client, Review proposal..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
              className="h-11 shadow-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Date
              </label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="h-11 shadow-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Time
              </label>
              <Input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="h-11 shadow-sm"
              />
            </div>
          </div>

          <p className="text-[11px] text-muted-foreground bg-muted/30 p-2 rounded-md border border-border/50">
            This reminder will be assigned to **you** and will appear on your calendar.
          </p>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose} disabled={loading} className="h-11 px-6">
              Cancel
            </Button>
            <Button 
              onClick={handleCreate} 
              disabled={!title || !date || loading}
              className="h-11 px-8 shadow-md"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Set Reminder"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── View Event Modal ────────────────────────────────────────────────────────

function ViewEventModal({
  event,
  onClose,
  onModified,
}: {
  event: CalEvent | null;
  onClose: () => void;
  onModified: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  if (!event) return null;

  const isTask = event.type === "task";
  const isReminder = event.type === "reminder";
  const isActionable = (isTask || isReminder) && event.raw?.status !== "completed" && event.raw?.status !== "cancelled";

  async function handleComplete() {
    if (!event) return;
    setLoading(true);
    try {
      if (isTask) {
        await tasksApi.update(event.raw.id, { status: "completed" });
      } else if (isReminder) {
        await leadsApi.markReminderDone(event.raw.id);
      }
      onModified();
      onClose();
    } catch (err) {
      console.error("Failed to complete event", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!event) return;
    setLoading(true);
    try {
      if (isTask) {
        await tasksApi.delete(event.raw.id);
      } else if (isReminder) {
        const leadId = event.raw.lead_id || event.raw.leadId || event.raw.lead?.id;
        if (leadId) await leadsApi.deleteReminder(leadId, event.raw.id);
      }
      onModified();
      onClose();
    } catch (err) {
      console.error("Failed to delete event", err);
    } finally {
      setLoading(false);
    }
  }

  function handleOpenFull() {
    if (!event) return;
    if (isTask) {
      router.push(`/tasks/${event.raw.id}`);
    } else if (isReminder) {
      const leadId = event.raw.lead_id || event.raw.leadId || event.raw.lead?.id;
      if (leadId) router.push(`/sales/leads/${leadId}?tab=reminders`);
    } else if (event.type === "attendance") {
      router.push(`/attendance`);
    }
  }

  return (
    <Dialog open={!!event} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 pr-6">
            {event.title}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          {event.subtitle && <p className="text-sm text-muted-foreground">{event.subtitle}</p>}
          <div className="text-sm space-y-1">
            <p><strong>Type:</strong> <span className="capitalize">{event.type.replace("_", " ")}</span></p>
            {event.date && <p><strong>Time:</strong> {format(event.date, "MMM d, yyyy h:mm a")}</p>}
            {event.userName && <p><strong>Assigned To:</strong> {event.userName}</p>}
            {isActionable && <Badge className={event.raw?.priority === "high" ? "bg-red-100 text-red-700 hover:bg-red-100" : ""} variant="outline">Pending</Badge>}
            {!isActionable && event.type !== "attendance" && event.type !== "leave" && <Badge variant="secondary">Completed</Badge>}
          </div>

          <div className="flex justify-end gap-2 pt-4">
            {isActionable && (
              <>
                <Button variant="destructive" size="sm" onClick={handleDelete} disabled={loading}>
                  <Trash2 className="h-4 w-4 mr-1" /> Delete
                </Button>
                <Button variant="default" size="sm" onClick={handleComplete} disabled={loading}>
                  <Check className="h-4 w-4 mr-1" /> Mark Complete
                </Button>
              </>
            )}
            <Button variant="outline" size="sm" onClick={handleOpenFull}>
              Open Detail Page
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function GlobalCalendarPage() {
  const { user, can } = useAuth();
  const isAdmin = useIsAdmin();
  const isManager = useIsManager();
  const isAdminOrGlobal = isAdmin || can("crm:admin") || !!user?.isGlobal;
  const router = useRouter();

  const today = new Date();

  // ── State ──────────────────────────────────────────────────────────────
  const [currentDate, setCurrentDate] = useState(today);
  // View: day (1 col) or week (7 cols) or month (30 cols of full month with H-scroll)
  const [viewMode, setViewMode] = useState<"day" | "week" | "month">("week");
  // Filters
  const [filterUserId, setFilterUserId] = useState<string>("all");
  const [filterTeamId, setFilterTeamId] = useState<string>("all");
  const [filterDeptId, setFilterDeptId] = useState<string>("all");
  const [filterType, setFilterType] = useState<EventType | "all">("all");
  const [showFilters, setShowFilters] = useState(false);
  const [showAttendance, setShowAttendance] = useState(true);
  // Custom range
  const [rangeStart, setRangeStart] = useState("");
  const [rangeEnd, setRangeEnd] = useState("");
  // View modal
  const [viewEventSelected, setViewEventSelected] = useState<CalEvent | null>(null);
  // Create modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createDefaultDate, setCreateDefaultDate] = useState<Date | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);

  // ── Derived date range ─────────────────────────────────────────────────
  const weekStart = useMemo(
    () => startOfWeek(currentDate, { weekStartsOn: 1 }),
    [currentDate],
  );

  const calDays = useMemo(() => {
    if (rangeStart && rangeEnd) {
      const start = parseISO(rangeStart);
      const end = parseISO(rangeEnd);
      const days: Date[] = [];
      let d = start;
      while (d <= end && days.length < 60) {
        days.push(d);
        d = addDays(d, 1);
      }
      return days;
    }
    if (viewMode === "week") {
      return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
    }
    if (viewMode === "day") {
      return [currentDate];
    }
    // Month view: all days of the month
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const days: Date[] = [];
    let d = monthStart;
    while (d <= monthEnd) {
      days.push(d);
      d = addDays(d, 1);
    }
    return days;
  }, [currentDate, weekStart, viewMode, rangeStart, rangeEnd]);

  const fetchStart = format(calDays[0], "yyyy-MM-dd");
  const fetchEnd = format(calDays[calDays.length - 1], "yyyy-MM-dd");

  // ── Data: users (for admin filter) ────────────────────────────────────
  const { data: usersData } = useSWR(
    isAdminOrGlobal ? "calendar-users" : null,
    () => usersApi.list({ limit: 200 }),
    { revalidateOnFocus: false },
  );
  const allUsers: any[] = isAdminOrGlobal ? (usersData?.data || []) : [];

  // Manager: fetch their team members
  const { data: myTeamData } = useSWR(
    !isAdminOrGlobal && isManager && user?.teamId ? ["calendar-team-members", user.teamId] : null,
    () => teamsApi.getMembers(user!.teamId!),
    { revalidateOnFocus: false },
  );
  const myTeamMembers: any[] = Array.isArray(myTeamData) ? myTeamData : [];

  // ── Data: departments & teams ──────────────────────────────────────────
  const { data: departments } = useSWR(isAdminOrGlobal ? "calendar-departments" : null, getDepartments, { revalidateOnFocus: false });
  const { data: teamsData } = useSWR(isAdminOrGlobal ? "calendar-teams" : null, () => teamsApi.list(), { revalidateOnFocus: false });

  // ── Data: tasks ────────────────────────────────────────────────────────
  const taskParams: Record<string, unknown> = {
    limit: 500,
    startDate: new Date(fetchStart + "T00:00:00").toISOString(),
    endDate: new Date(fetchEnd + "T23:59:59").toISOString(),
  };
  if (isAdminOrGlobal && filterUserId !== "all") taskParams.assignedTo = filterUserId;
  else if (!isAdminOrGlobal && !isManager) taskParams.assignedTo = user?.id;

  const { data: tasksData, mutate: mutateTasks } = useSWR(
    ["calendar-tasks", fetchStart, fetchEnd, filterUserId],
    () => tasksApi.list(taskParams),
    { revalidateOnFocus: false },
  );

  // ── Data: lead reminders ───────────────────────────────────────────────
  const reminderParams: any = { limit: 300, status: "pending" };
  if (filterUserId !== "all") reminderParams.userId = filterUserId;

  const { data: remindersData, mutate: mutateReminders } = useSWR(
    ["calendar-reminders", fetchStart, fetchEnd, filterUserId],
    () => leadsApi.getAllReminders(reminderParams),
    { revalidateOnFocus: false },
  );

  // ── Data: attendance ───────────────────────────────────────────────────
  const attParams: Record<string, unknown> = { startDate: fetchStart, endDate: fetchEnd, limit: 500 };
  if (filterUserId !== "all") attParams.userId = filterUserId;

  const { data: attData, mutate: mutateAtt } = useSWR(
    ["calendar-attendance", fetchStart, fetchEnd, filterUserId],
    () => attendanceApi.list(attParams),
    { revalidateOnFocus: false },
  );
  const { data: holidayData, mutate: mutateHoliday } = useSWR(
    ["calendar-holidays", currentDate.getFullYear()],
    () => attendanceApi.getHolidays(currentDate.getFullYear()),
    { revalidateOnFocus: false },
  );
  const { data: leaveData, mutate: mutateLeaves } = useSWR(
    ["calendar-leaves", fetchStart, fetchEnd],
    () => attendanceApi.getApprovedLeaves(fetchStart, fetchEnd),
    { revalidateOnFocus: false },
  );

  const refreshCalendarData = useCallback(async () => {
    await Promise.all([
      mutateTasks(),
      mutateReminders(),
      mutateAtt(),
      mutateHoliday(),
      mutateLeaves(),
    ]);
  }, [mutateTasks, mutateReminders, mutateAtt, mutateHoliday, mutateLeaves]);

  useHeaderRefresh({ onRefresh: refreshCalendarData, enabled: Boolean(user) });

  // ── Build events ───────────────────────────────────────────────────────
  const allEvents = useMemo<CalEvent[]>(() => {
    const events: CalEvent[] = [];

    // Tasks
    const tasks: any[] = Array.isArray(tasksData) ? tasksData : (tasksData as any)?.data || [];
    for (const t of tasks) {
      const due = t.dueDate || t.due_date;
      if (!due) continue;
      if (t.status === "completed" || t.status === "cancelled") continue;
      const assigned = t.assignedUser || t.assigned_user;

      // If manager, only show tasks assigned to team members
      if (!isAdminOrGlobal && isManager) {
        const assignedId = t.assignedTo || t.assigned_to || assigned?.id;
        const memberIds = myTeamMembers.map((m: any) => m.id);
        if (assignedId && !memberIds.includes(assignedId) && assignedId !== user?.id) continue;
      }
      // If employee, only show own tasks
      if (!isAdminOrGlobal && !isManager) {
        const assignedId = t.assignedTo || t.assigned_to || assigned?.id;
        if (assignedId && assignedId !== user?.id) continue;
      }

      events.push({
        id: `task-${t.id}`,
        title: t.title,
        subtitle: assigned?.fullName || assigned?.full_name || t.project?.name,
        type: "task",
        date: new Date(due),
        startTime: format(new Date(due), "HH:mm"),
        color: EVENT_COLORS.task,
        userId: t.assignedTo || t.assigned_to,
        userName: assigned?.fullName || assigned?.full_name,
        raw: t,
      });
    }

    // Lead reminders
    const reminders: any[] = (remindersData as any)?.data || [];
    for (const r of reminders) {
      const at = r.reminderAt || r.reminder_at;
      if (!at) continue;
      if (!isAdminOrGlobal && !isManager && r.user_id !== user?.id) continue;
      if (!isAdminOrGlobal && isManager) {
        const memberIds = myTeamMembers.map((m: any) => m.id);
        if (r.user_id && !memberIds.includes(r.user_id) && r.user_id !== user?.id) continue;
      }
      events.push({
        id: `reminder-${r.id}`,
        title: `Reminder: ${r.lead?.leadName || r.lead?.lead_name || "Lead"}`,
        subtitle: r.note,
        type: "reminder",
        date: new Date(at),
        startTime: format(new Date(at), "HH:mm"),
        color: EVENT_COLORS.reminder,
        userId: r.user_id,
        userName: r.user?.fullName || r.user?.full_name,
        raw: r,
      });
    }

    // Attendance
    const attRows: any[] = Array.isArray(attData) ? attData : (attData as any)?.data || [];
    for (const a of attRows) {
      const clockIn = a.clockInTime || a.clock_in_time;
      if (!clockIn) continue;
      if (!isAdminOrGlobal && !isManager && a.userId !== user?.id && a.user_id !== user?.id) continue;
      const aUserId = a.userId || a.user_id;
      if (!isAdminOrGlobal && isManager) {
        const memberIds = myTeamMembers.map((m: any) => m.id);
        if (aUserId && !memberIds.includes(aUserId) && aUserId !== user?.id) continue;
      }
      const attUser = a.user || {};
      events.push({
        id: `att-${a.id}`,
        title: `Clock in`,
        subtitle: attUser.fullName || attUser.full_name || a.full_name,
        type: "attendance",
        date: new Date(clockIn),
        startTime: format(new Date(clockIn), "HH:mm"),
        endTime: a.clockOutTime || a.clock_out_time ? format(new Date(a.clockOutTime || a.clock_out_time), "HH:mm") : undefined,
        color: EVENT_COLORS.attendance,
        userId: aUserId,
        raw: a,
      });
    }
    // Holidays
    const holidays: any[] = Array.isArray(holidayData) ? holidayData : [];
    for (const h of holidays) {
      const d = h.holiday_date || h.date;
      if (!d) continue;
      events.push({
        id: `holiday-${h.id}`,
        title: h.name || "Holiday",
        subtitle: "Company Holiday",
        type: "holiday",
        date: new Date(`${d}T00:00:00`),
        raw: h,
      });
    }

    // Weekends
    for (const day of calDays) {
      if (!isWeekend(day)) continue;
      events.push({
        id: `weekend-${dateToKey(day)}`,
        title: "Weekend",
        subtitle: "Weekly off",
        type: "weekend",
        date: day,
        color: EVENT_COLORS.weekend,
        raw: { date: dateToKey(day), kind: "weekend" },
      });
    }

    // Approved leaves
    const approvedLeaves: any[] = Array.isArray(leaveData) ? leaveData : [];
    for (const l of approvedLeaves) {
      const start = l.startDate || l.start_date;
      const end = l.endDate || l.end_date;
      if (!start || !end) continue;
      const uid = l.userId || l.user_id;
      if (!isAdminOrGlobal && !isManager && uid !== user?.id) continue;
      if (!isAdminOrGlobal && isManager) {
        const memberIds = myTeamMembers.map((m: any) => m.id);
        if (uid && !memberIds.includes(uid) && uid !== user?.id) continue;
      }
      let d = new Date(`${start}T00:00:00`);
      const endDate = new Date(`${end}T00:00:00`);
      while (d <= endDate) {
        events.push({
          id: `leave-${l.id}-${dateToKey(d)}`,
          title: `Leave: ${l.employeeName || l.employee_name || "User"}`,
          subtitle: l.leaveTypeName || l.leave_type_name || "Approved leave",
          type: "leave",
          date: d,
          color: EVENT_COLORS.leave,
          userId: uid,
          raw: l,
        });
        d = addDays(d, 1);
      }
    }

    return events;
  }, [tasksData, remindersData, attData, holidayData, leaveData, isAdminOrGlobal, isManager, myTeamMembers, user?.id]);

  // Filter valid user IDs based on department/team filters
  const validUserIds = useMemo(() => {
    let filteredUsers = isAdminOrGlobal ? allUsers : isManager ? myTeamMembers : [];
    if (filterDeptId !== "all") {
      filteredUsers = filteredUsers.filter(u => (u.departmentId || u.department_id) === filterDeptId);
    }
    if (filterTeamId !== "all") {
      filteredUsers = filteredUsers.filter(u => (u.teamId || u.team_id) === filterTeamId);
    }
    return new Set(filteredUsers.map(u => u.id));
  }, [isAdminOrGlobal, isManager, allUsers, myTeamMembers, filterDeptId, filterTeamId]);

  // Filter by type, attendance visibility, and valid users
  const filteredEvents = useMemo(() => {
    let evs = allEvents;
    if (!showAttendance) evs = evs.filter((e) => e.type !== "attendance");
    if (filterType !== "all") evs = evs.filter((e) => e.type === filterType);
    if (filterDeptId !== "all" || filterTeamId !== "all") {
      evs = evs.filter(
        (e) =>
          e.type === "holiday" ||
          (e.userId != null && validUserIds.has(e.userId)),
      );
    }
    return evs;
  }, [allEvents, filterType, showAttendance, filterDeptId, filterTeamId, validUserIds]);

  // Build event map: "yyyy-MM-dd" -> CalEvent[]
  const eventMap = useMemo<Record<string, CalEvent[]>>(() => {
    const map: Record<string, CalEvent[]> = {};
    for (const ev of filteredEvents) {
      const key = dateToKey(ev.date);
      if (!map[key]) map[key] = [];
      map[key].push(ev);
    }
    return map;
  }, [filteredEvents]);

  // ── Handlers ──────────────────────────────────────────────────────────

  const handleEventClick = (ev: CalEvent) => {
    if (ev.type === "task" || ev.type === "reminder") {
      setViewEventSelected(ev);
    } else if (ev.type === "attendance") {
      router.push(`/attendance`);
    } else {
      // Future-proofing other types
      setViewEventSelected(ev);
    }
  };

  // ── Navigation ──────────────────────────────────────────────────────────
  const goBack = () => {
    setRangeStart("");
    setRangeEnd("");
    if (viewMode === "week") setCurrentDate((d) => addDays(d, -7));
    else if (viewMode === "day") setCurrentDate((d) => addDays(d, -1));
    else setCurrentDate((d) => subMonths(d, 1));
  };
  const goForward = () => {
    setRangeStart("");
    setRangeEnd("");
    if (viewMode === "week") setCurrentDate((d) => addDays(d, 7));
    else if (viewMode === "day") setCurrentDate((d) => addDays(d, 1));
    else setCurrentDate((d) => addMonths(d, 1));
  };
  const goToday = () => {
    setRangeStart("");
    setRangeEnd("");
    setCurrentDate(today);
  };

  const headerLabel = useMemo(() => {
    if (rangeStart && rangeEnd) return `${rangeStart} → ${rangeEnd}`;
    if (viewMode === "day") {
      return format(currentDate, "MMMM d, yyyy");
    }
    if (viewMode === "week") {
      const end = addDays(weekStart, 6);
      if (weekStart.getMonth() === end.getMonth()) {
        return `${format(weekStart, "MMM d")} – ${format(end, "d, yyyy")}`;
      }
      return `${format(weekStart, "MMM d")} – ${format(end, "MMM d, yyyy")}`;
    }
    return `${MONTH_NAMES[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
  }, [viewMode, weekStart, currentDate, rangeStart, rangeEnd]);

  const userListForFilter = isAdminOrGlobal ? allUsers : isManager ? myTeamMembers : [];

  return (
    <div className="flex flex-col h-[calc(100dvh-3rem)] min-h-0 -m-3 lg:-m-4 bg-background overflow-hidden">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 flex flex-col gap-3 px-4 py-3 border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-20">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          {/* Title + nav */}
          <div className="flex items-center gap-3">
            <CalendarDays className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-bold tracking-tight">Calendar</h1>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* View toggle */}
            <div className="flex border rounded-md overflow-hidden">
              {(["day", "week", "month"] as const).map((v) => (
                <button
                  key={v}
                  className={cn(
                    "px-3 py-1.5 text-xs font-medium transition-colors capitalize",
                    viewMode === v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted",
                  )}
                  onClick={() => { setViewMode(v); setRangeStart(""); setRangeEnd(""); }}
                >
                  {v}
                </button>
              ))}
            </div>

            {/* Month/week nav */}
            <div className="flex items-center gap-1 border rounded-md">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={goBack}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium px-2 min-w-[180px] text-center">{headerLabel}</span>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={goForward}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={goToday}>
              Today
            </Button>

            {/* Filters toggle */}
            <Button
              variant={showFilters ? "default" : "outline"}
              size="sm"
              className="h-8 text-xs gap-1.5"
              onClick={() => setShowFilters((s) => !s)}
            >
              <Filter className="h-3.5 w-3.5" />
              Filters
              {filterType !== "all" || filterUserId !== "all" ? (
                <Badge className="h-4 w-4 p-0 flex items-center justify-center text-[9px] ml-0.5">!</Badge>
              ) : null}
            </Button>

            <div className="flex items-center gap-2 px-2 border-r border-border pr-3">
              <label htmlFor="show-attendance" className="text-xs font-medium cursor-pointer text-muted-foreground whitespace-nowrap">
                {showAttendance ? "Show Attendance ☑" : "[ Attendance Hidden ]"}
              </label>
              <Switch 
                checked={showAttendance} 
                onCheckedChange={setShowAttendance} 
                id="show-attendance"
                className="scale-75 origin-left"
              />
            </div>

            <Button
              size="sm"
              className="h-8 text-xs gap-1.5"
              onClick={() => { setCreateDefaultDate(today); setCreateModalOpen(true); }}
            >
              <Plus className="h-3.5 w-3.5" />
              Add
            </Button>
          </div>
        </div>

        {/* Filter bar */}
        {showFilters && (
          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-border/50">
            {/* Event type */}
            <Select value={filterType} onValueChange={(v: any) => setFilterType(v)}>
              <SelectTrigger className="h-8 w-[150px] text-xs">
                <SelectValue placeholder="Event type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="task">Tasks</SelectItem>
                <SelectItem value="reminder">Reminders</SelectItem>
                <SelectItem value="attendance">Attendance</SelectItem>
                <SelectItem value="leave">Leaves</SelectItem>
                <SelectItem value="holiday">Holidays</SelectItem>
                <SelectItem value="weekend">Weekends</SelectItem>
              </SelectContent>
            </Select>

            {/* User filter (admin or manager) */}
            {userListForFilter.length > 0 && (
              <Select value={filterUserId} onValueChange={setFilterUserId}>
                <SelectTrigger className="h-8 w-[170px] text-xs">
                  <SelectValue placeholder="All Users" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  {userListForFilter.map((u: any) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.fullName || u.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Team filter (admin only) */}
            {isAdminOrGlobal && Array.isArray(teamsData) && teamsData.length > 0 && (
              <Select value={filterTeamId} onValueChange={setFilterTeamId}>
                <SelectTrigger className="h-8 w-[160px] text-xs">
                  <SelectValue placeholder="All Teams" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Teams</SelectItem>
                  {teamsData.map((t: any) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Department filter (admin only) */}
            {isAdminOrGlobal && Array.isArray(departments) && departments.length > 0 && (
              <Select value={filterDeptId} onValueChange={setFilterDeptId}>
                <SelectTrigger className="h-8 w-[170px] text-xs">
                  <SelectValue placeholder="All Departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map((d: any) => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Custom range */}
            <div className="flex items-center gap-1">
              <Input
                type="date"
                value={rangeStart}
                onChange={(e) => setRangeStart(e.target.value)}
                className="h-8 w-[140px] text-xs"
                placeholder="From"
              />
              <span className="text-muted-foreground text-xs">–</span>
              <Input
                type="date"
                value={rangeEnd}
                onChange={(e) => setRangeEnd(e.target.value)}
                className="h-8 w-[140px] text-xs"
                placeholder="To"
              />
              {(rangeStart || rangeEnd) && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => { setRangeStart(""); setRangeEnd(""); }}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Legend strip ──────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 flex items-center gap-3 px-4 py-1 border-b border-border/40 text-[11px] bg-background/50">
        {(Object.entries(EVENT_COLORS) as [EventType, string][]).map(([type, cls]) => {
          const Icon = TYPE_ICONS[type];
          return (
            <div key={type} className="flex items-center gap-1 capitalize text-muted-foreground">
              <div className={cn("w-2.5 h-2.5 rounded border", cls.split(" ").filter(c => c.startsWith("bg-") || c.startsWith("border-")).join(" "))} />
              {type}
            </div>
          );
        })}
        <span className="ml-auto text-muted-foreground">{filteredEvents.length} event{filteredEvents.length !== 1 ? "s" : ""}</span>
      </div>

      {/* ── Calendar Grid (H-scrollable) ──────────────────────────────────── */}
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-x-auto overflow-y-hidden">
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
                  onAddClick={(d) => {
                    setCreateDefaultDate(d);
                    setCreateModalOpen(true);
                  }}
                  onEventClick={handleEventClick}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Create Event Modal ─────────────────────────────────────────────── */}
      <CreateEventModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        defaultDate={createDefaultDate}
        onCreated={() => {
          void mutateTasks();
          void mutateReminders();
        }}
      />

      <ViewEventModal
        event={viewEventSelected}
        onClose={() => setViewEventSelected(null)}
        onModified={() => {
          if (viewEventSelected?.type === "task") void mutateTasks();
          else if (viewEventSelected?.type === "reminder") void mutateReminders();
        }}
      />
    </div>
  );
}
