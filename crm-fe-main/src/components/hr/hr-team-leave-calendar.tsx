"use client";

import { useMemo, useRef, useState } from "react";
import useSWR from "swr";
import {
  format,
  startOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameDay,
  parseISO,
  startOfMonth,
  endOfMonth,
} from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Filter,
  Plus,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { api, attendanceApi, teamsApi } from "@/lib/api";
import { getDepartments } from "@/lib/supabase-queries";
import {
  type CalEvent,
  dateToKey,
  DayColumn,
  EVENT_COLORS,
  MONTH_NAMES,
  TYPE_ICONS,
} from "@/components/calendar/calendar-primitives";

export interface HrApprovedLeaveRow {
  id: string;
  userId: string;
  employeeName: string;
  leaveTypeName: string;
  startDate: string;
  endDate: string;
}

export function HRTeamLeaveCalendar({
  approvedLeaves,
  onAddLeave,
}: {
  approvedLeaves: HrApprovedLeaveRow[];
  /** Shown in the calendar toolbar (e.g. HR “Add Leave”). */
  onAddLeave?: () => void;
}) {
  const today = new Date();
  const [currentDate, setCurrentDate] = useState(today);
  const [viewMode, setViewMode] = useState<"day" | "week" | "month">("week");
  const [showFilters, setShowFilters] = useState(false);
  const [filterUserId, setFilterUserId] = useState<string>("all");
  const [filterTeamId, setFilterTeamId] = useState<string>("all");
  const [filterDeptId, setFilterDeptId] = useState<string>("all");
  const [rangeStart, setRangeStart] = useState("");
  const [rangeEnd, setRangeEnd] = useState("");
  const [detailEvent, setDetailEvent] = useState<CalEvent | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

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

  const holidayYears = useMemo(() => {
    const ys = new Set<number>();
    for (const d of calDays) ys.add(d.getFullYear());
    if (ys.size === 0) ys.add(currentDate.getFullYear());
    return [...ys].sort((a, b) => a - b);
  }, [calDays, currentDate]);

  const holidayYearsKey = holidayYears.join(",");

  const { data: holidayRows } = useSWR(
    holidayYearsKey ? ["hr-cal-holidays", holidayYearsKey] : null,
    async () => {
      const merged: any[] = [];
      const seen = new Set<string>();
      for (const y of holidayYears) {
        const rows = await attendanceApi.getHolidays(y);
        if (!Array.isArray(rows)) continue;
        for (const h of rows) {
          const id = String(h?.id ?? `${h?.holiday_date || h?.date}-${h?.name}`);
          if (seen.has(id)) continue;
          seen.add(id);
          merged.push(h);
        }
      }
      return merged;
    },
    { revalidateOnFocus: false },
  );
  const holidays: any[] = Array.isArray(holidayRows) ? holidayRows : [];

  const { data: departments } = useSWR(
    "hr-cal-departments",
    getDepartments,
    { revalidateOnFocus: false },
  );
  const { data: teamsData } = useSWR("hr-cal-teams", () => teamsApi.list(), {
    revalidateOnFocus: false,
  });
  const { data: employeesRes } = useSWR("hr-cal-employees", async () => {
    try {
      const res = await api.get("/hr/employees");
      const body = res.data as { data?: unknown[] };
      return body?.data || [];
    } catch {
      return [];
    }
  });

  const employees: any[] = Array.isArray(employeesRes) ? employeesRes : [];

  const validUserIds = useMemo(() => {
    let ids = new Set(employees.map((e: any) => e.id));
    if (filterDeptId !== "all") {
      ids = new Set(
        employees
          .filter(
            (e: any) =>
              (e.departmentId || e.department_id) === filterDeptId,
          )
          .map((e: any) => e.id),
      );
    }
    if (filterTeamId !== "all") {
      const byTeam = new Set(
        employees
          .filter((e: any) => (e.teamId || e.team_id) === filterTeamId)
          .map((e: any) => e.id),
      );
      ids = new Set([...ids].filter((id) => byTeam.has(id)));
    }
    if (filterUserId !== "all") {
      ids = new Set([filterUserId].filter((id) => ids.has(id)));
    }
    return ids;
  }, [employees, filterDeptId, filterTeamId, filterUserId]);

  const allEvents = useMemo<CalEvent[]>(() => {
    const events: CalEvent[] = [];

    for (const d of calDays) {
      const wd = d.getDay();
      if (wd === 0 || wd === 6) {
        events.push({
          id: `weekend-${dateToKey(d)}`,
          title: "Weekend",
          subtitle:
            wd === 0
              ? "Sunday — company non-working day"
              : "Saturday — company non-working day",
          type: "weekend",
          date: new Date(d.getFullYear(), d.getMonth(), d.getDate()),
          raw: { kind: "weekend" },
        });
      }
    }

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

    for (const l of approvedLeaves) {
      if (filterUserId !== "all" && l.userId !== filterUserId) continue;
      if (
        (filterDeptId !== "all" || filterTeamId !== "all") &&
        !validUserIds.has(l.userId)
      ) {
        continue;
      }
      const start = l.startDate;
      const end = l.endDate;
      if (!start || !end) continue;
      let d = new Date(`${start}T00:00:00`);
      const endDate = new Date(`${end}T00:00:00`);
      while (d <= endDate) {
        events.push({
          id: `leave-${l.id}-${dateToKey(d)}`,
          title: `Leave: ${l.employeeName}`,
          subtitle: l.leaveTypeName,
          type: "leave",
          date: new Date(d),
          userId: l.userId,
          raw: l,
        });
        d = addDays(d, 1);
      }
    }

    return events;
  }, [
    calDays,
    approvedLeaves,
    holidays,
    filterUserId,
    filterDeptId,
    filterTeamId,
    validUserIds,
  ]);

  const filteredEvents = useMemo(() => {
    let evs = allEvents;
    if (filterDeptId !== "all" || filterTeamId !== "all") {
      evs = evs.filter(
        (e) =>
          e.type === "holiday" ||
          e.type === "weekend" ||
          (e.userId != null && validUserIds.has(e.userId)),
      );
    }
    return evs;
  }, [allEvents, filterDeptId, filterTeamId, validUserIds]);

  const eventMap = useMemo(() => {
    const map: Record<string, CalEvent[]> = {};
    for (const ev of filteredEvents) {
      const key = dateToKey(ev.date);
      if (!map[key]) map[key] = [];
      map[key].push(ev);
    }
    return map;
  }, [filteredEvents]);

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

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border bg-card">
      <div className="shrink-0 flex flex-col gap-3 px-4 py-3 border-b border-border bg-background/80">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <CalendarDays className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-bold tracking-tight">Team Leave Calendar</h2>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex border rounded-md overflow-hidden">
              {(["day", "week", "month"] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  className={cn(
                    "px-3 py-1.5 text-xs font-medium transition-colors capitalize",
                    viewMode === v
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted",
                  )}
                  onClick={() => {
                    setViewMode(v);
                    setRangeStart("");
                    setRangeEnd("");
                  }}
                >
                  {v}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1 border rounded-md">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={goBack}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium px-2 min-w-[180px] text-center">
                {headerLabel}
              </span>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={goForward}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={goToday}>
              Today
            </Button>
            <Button
              variant={showFilters ? "default" : "outline"}
              size="sm"
              className="h-8 text-xs gap-1.5"
              onClick={() => setShowFilters((s) => !s)}
            >
              <Filter className="h-3.5 w-3.5" />
              Filters
            </Button>
            {onAddLeave && (
              <Button
                size="sm"
                className="h-8 text-xs gap-1.5"
                onClick={onAddLeave}
              >
                <Plus className="h-3.5 w-3.5" />
                Add Leave
              </Button>
            )}
          </div>
        </div>

        {showFilters && (
          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-border/50">
            <Select value={filterUserId} onValueChange={setFilterUserId}>
              <SelectTrigger className="h-8 w-[200px] text-xs">
                <SelectValue placeholder="Employee" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All employees</SelectItem>
                {employees.map((u: any) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.fullName || u.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {Array.isArray(teamsData) && teamsData.length > 0 && (
              <Select value={filterTeamId} onValueChange={setFilterTeamId}>
                <SelectTrigger className="h-8 w-[160px] text-xs">
                  <SelectValue placeholder="Team" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All teams</SelectItem>
                  {teamsData.map((t: any) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {Array.isArray(departments) && departments.length > 0 && (
              <Select value={filterDeptId} onValueChange={setFilterDeptId}>
                <SelectTrigger className="h-8 w-[170px] text-xs">
                  <SelectValue placeholder="Department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All departments</SelectItem>
                  {departments.map((d: any) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <div className="flex items-center gap-1">
              <Input
                type="date"
                value={rangeStart}
                onChange={(e) => setRangeStart(e.target.value)}
                className="h-8 w-[140px] text-xs"
              />
              <span className="text-muted-foreground text-xs">–</span>
              <Input
                type="date"
                value={rangeEnd}
                onChange={(e) => setRangeEnd(e.target.value)}
                className="h-8 w-[140px] text-xs"
              />
              {(rangeStart || rangeEnd) && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => {
                    setRangeStart("");
                    setRangeEnd("");
                  }}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="shrink-0 flex flex-wrap items-center gap-3 px-4 py-1 border-b border-border/40 text-[11px] bg-background/50">
        {(["leave", "holiday", "weekend"] as const).map((type) => {
          const Icon = TYPE_ICONS[type];
          const cls = EVENT_COLORS[type];
          return (
            <div
              key={type}
              className="flex items-center gap-1 capitalize text-muted-foreground"
            >
              <div
                className={cn(
                  "w-2.5 h-2.5 rounded border",
                  cls
                    .split(" ")
                    .filter((c) => c.startsWith("bg-") || c.startsWith("border-"))
                    .join(" "),
                )}
              />
              <Icon className="h-3 w-3" />
              {type}
            </div>
          );
        })}
        <span className="ml-auto text-muted-foreground">
          {filteredEvents.length} item{filteredEvents.length !== 1 ? "s" : ""}{" "}
          <span className="opacity-70">(incl. weekends)</span>
        </span>
      </div>

      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-y-auto overflow-x-auto"
      >
        <div
          className="grid min-h-full w-full"
          style={{
            gridTemplateColumns: `repeat(${calDays.length}, minmax(160px, 1fr))`,
          }}
        >
          {calDays.map((day) => {
            const key = dateToKey(day);
            return (
              <div
                key={key}
                className="group flex h-full min-h-0 min-w-0 flex-col"
              >
                <DayColumn
                  date={day}
                  events={eventMap[key] || []}
                  isToday={isSameDay(day, today)}
                  isWeekend={
                    day.getDay() === 0 || day.getDay() === 6
                  }
                  scrollEventsInParent
                  onAddClick={() => {}}
                  onEventClick={(ev) => setDetailEvent(ev)}
                  showAddButton={false}
                />
              </div>
            );
          })}
        </div>
      </div>

      <Dialog open={!!detailEvent} onOpenChange={(o) => !o && setDetailEvent(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{detailEvent?.title}</DialogTitle>
          </DialogHeader>
          {detailEvent?.subtitle && (
            <p className="text-sm text-muted-foreground">{detailEvent.subtitle}</p>
          )}
          <p className="text-xs text-muted-foreground">
            {detailEvent ? format(detailEvent.date, "EEEE, MMMM d, yyyy") : ""}
          </p>
        </DialogContent>
      </Dialog>
    </div>
  );
}
