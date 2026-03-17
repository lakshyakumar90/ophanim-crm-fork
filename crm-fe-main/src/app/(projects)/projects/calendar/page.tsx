"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  FolderKanban,
  CalendarDays,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { projectsApi, tasksApi } from "@/lib/api";
import { useHeaderRefresh } from "@/hooks/use-header-refresh";
import { cn } from "@/lib/utils";
import type { Project } from "@/types";

// ── Helpers ──────────────────────────────────────────────────────────────────

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  // 0=Sun … 6=Sat
  return new Date(year, month, 1).getDay();
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Deterministic project color palette (hue rotated)
const PROJECT_COLORS = [
  "bg-blue-100 text-blue-800 border-blue-200",
  "bg-purple-100 text-purple-800 border-purple-200",
  "bg-green-100 text-green-800 border-green-200",
  "bg-orange-100 text-orange-800 border-orange-200",
  "bg-pink-100 text-pink-800 border-pink-200",
  "bg-teal-100 text-teal-800 border-teal-200",
  "bg-indigo-100 text-indigo-800 border-indigo-200",
  "bg-rose-100 text-rose-800 border-rose-200",
];

function getProjectColor(index: number) {
  return PROJECT_COLORS[index % PROJECT_COLORS.length];
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface CalendarEvent {
  id: string;
  title: string;
  date: string; // "YYYY-MM-DD"
  projectId: string;
  projectName: string;
  type: "task" | "project-end";
  colorClass: string;
  href: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ProjectCalendarPage() {
  const today = new Date();
  const [year, setYear] = useState(() => {
    if (typeof window === "undefined") return today.getFullYear();
    return (
      Number(new URLSearchParams(window.location.search).get("year")) ||
      today.getFullYear()
    );
  });
  const [month, setMonth] = useState(() => {
    if (typeof window === "undefined") return today.getMonth();
    const m = Number(new URLSearchParams(window.location.search).get("month"));
    return m >= 1 && m <= 12 ? m - 1 : today.getMonth();
  });
  const [filterProjectId, setFilterProjectId] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    return new URLSearchParams(window.location.search).get("projectId") || "";
  });

  const [projects, setProjects] = useState<Project[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [projectColorMap, setProjectColorMap] = useState<
    Record<string, string>
  >({});

  // ── URL sync ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams();
    params.set("year", String(year));
    params.set("month", String(month + 1));
    if (filterProjectId) params.set("projectId", filterProjectId);
    window.history.replaceState(null, "", `?${params.toString()}`);
  }, [year, month, filterProjectId]);

  // ── Data fetch ────────────────────────────────────────────────────────────
  const fetchData = useCallback(
    async (quiet = false) => {
      if (!quiet) setIsLoading(true);
      try {
        // Calculate date range for the current month view (±1 week buffer)
        const startDt = new Date(year, month, 1);
        const endDt = new Date(year, month + 1, 0);

        const [projectList, tasksResult] = await Promise.all([
          projectsApi.list(),
          tasksApi.list({ limit: 1000 }),
        ]);

        const allProjects: Project[] = Array.isArray(projectList)
          ? projectList
          : [];
        setProjects(allProjects);

        // Build color map (stable by project id index)
        const colorMap: Record<string, string> = {};
        allProjects.forEach((p, i) => {
          colorMap[p.id] = getProjectColor(i);
        });
        setProjectColorMap(colorMap);

        const allTasks: any[] = Array.isArray(tasksResult)
          ? tasksResult
          : (tasksResult as any)?.data || [];

        const calEvents: CalendarEvent[] = [];

        // Task due dates
        for (const task of allTasks) {
          if (!task.due_date && !task.dueDate) continue;
          if (task.status === "completed" || task.status === "cancelled")
            continue;
          const rawDate: string = task.due_date || task.dueDate;
          const d = new Date(rawDate);
          if (d < startDt || d > endDt) continue;
          const projId: string = task.projectId || task.project_id || "";
          if (filterProjectId && projId !== filterProjectId) continue;
          const proj = allProjects.find((p) => p.id === projId);
          const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
          calEvents.push({
            id: `task-${task.id}`,
            title: task.title,
            date: dateStr,
            projectId: projId,
            projectName: proj?.name || "Unknown Project",
            type: "task",
            colorClass: colorMap[projId] || PROJECT_COLORS[0],
            href: projId
              ? `/projects/${projId}/tasks`
              : "/projects/tasks",
          });
        }

        // Project end dates
        for (const proj of allProjects) {
          if (!proj.endDate) continue;
          if (filterProjectId && proj.id !== filterProjectId) continue;
          const d = new Date(proj.endDate);
          if (d < startDt || d > endDt) continue;
          const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
          calEvents.push({
            id: `proj-end-${proj.id}`,
            title: `🏁 ${proj.name} deadline`,
            date: dateStr,
            projectId: proj.id,
            projectName: proj.name,
            type: "project-end",
            colorClass: colorMap[proj.id] || PROJECT_COLORS[0],
            href: `/projects/${proj.id}/overview`,
          });
        }

        setEvents(calEvents);
      } catch (error) {
        console.error("Failed to fetch calendar data", error);
      } finally {
        setIsLoading(false);
      }
    },
    [year, month, filterProjectId],
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useHeaderRefresh({ onRefresh: () => fetchData(true), isRefreshing: isLoading });

  // ── Calendar grid ─────────────────────────────────────────────────────────
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  // Build event map: "YYYY-MM-DD" → CalendarEvent[]
  const eventMap: Record<string, CalendarEvent[]> = {};
  for (const ev of events) {
    if (!eventMap[ev.date]) eventMap[ev.date] = [];
    eventMap[ev.date].push(ev);
  }

  const prevMonth = () => {
    if (month === 0) {
      setMonth(11);
      setYear((y) => y - 1);
    } else {
      setMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (month === 11) {
      setMonth(0);
      setYear((y) => y + 1);
    } else {
      setMonth((m) => m + 1);
    }
  };

  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  // Cells: blanks + days
  const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
    ...Array(totalCells - firstDay - daysInMonth).fill(null),
  ];

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex flex-col gap-4 p-6 bg-background/50 backdrop-blur-sm border-b sticky top-0 z-10">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight">
              Project Calendar
            </h1>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Project filter */}
            <Select
              value={filterProjectId || "all"}
              onValueChange={(v) =>
                setFilterProjectId(v === "all" ? "" : v)
              }
            >
              <SelectTrigger className="w-[200px] h-8 text-xs">
                <SelectValue placeholder="All Projects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Projects</SelectItem>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Month navigation */}
            <div className="flex items-center gap-1 border rounded-md">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={prevMonth}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium px-2 min-w-[130px] text-center">
                {MONTH_NAMES[month]} {year}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={nextMonth}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Today button */}
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={() => {
                setYear(today.getFullYear());
                setMonth(today.getMonth());
              }}
            >
              Today
            </Button>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 p-6 overflow-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-[50vh]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Event count summary */}
            {events.length > 0 && (
              <p className="text-xs text-muted-foreground mb-3">
                {events.length} event{events.length !== 1 ? "s" : ""} in{" "}
                {MONTH_NAMES[month]} {year}
                {filterProjectId ? ` for selected project` : ""}
              </p>
            )}

            {/* Day-of-week headers */}
            <div className="grid grid-cols-7 mb-1">
              {DAY_LABELS.map((d) => (
                <div
                  key={d}
                  className="text-center text-xs font-semibold text-muted-foreground py-2"
                >
                  {d}
                </div>
              ))}
            </div>

            {/* Calendar cells */}
            <div className="grid grid-cols-7 border-l border-t rounded-lg overflow-hidden">
              {cells.map((day, idx) => {
                const dateStr =
                  day !== null
                    ? `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
                    : null;
                const dayEvents = dateStr ? (eventMap[dateStr] || []) : [];
                const isToday = dateStr === todayStr;
                const isWeekend = idx % 7 === 0 || idx % 7 === 6;

                return (
                  <div
                    key={idx}
                    className={cn(
                      "min-h-[100px] border-r border-b p-1.5 flex flex-col transition-colors",
                      day === null
                        ? "bg-muted/20"
                        : isWeekend
                          ? "bg-slate-50/50 dark:bg-slate-900/20"
                          : "bg-background hover:bg-muted/20",
                    )}
                  >
                    {day !== null && (
                      <>
                        {/* Day number */}
                        <span
                          className={cn(
                            "text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full self-end mb-1",
                            isToday
                              ? "bg-primary text-primary-foreground"
                              : "text-muted-foreground",
                          )}
                        >
                          {day}
                        </span>

                        {/* Events in day */}
                        <div className="flex flex-col gap-0.5 overflow-hidden">
                          {dayEvents.slice(0, 3).map((ev) => (
                            <Link
                              key={ev.id}
                              href={ev.href}
                              className={cn(
                                "text-[10px] leading-tight px-1.5 py-0.5 rounded border truncate hover:opacity-80 transition-opacity",
                                ev.colorClass,
                              )}
                              title={`${ev.title} (${ev.projectName})`}
                            >
                              {ev.title}
                            </Link>
                          ))}
                          {dayEvents.length > 3 && (
                            <span className="text-[10px] text-muted-foreground px-1">
                              +{dayEvents.length - 3} more
                            </span>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            {projects.length > 0 && (
              <div className="mt-6 flex flex-wrap gap-2">
                <span className="text-xs text-muted-foreground font-medium self-center">
                  Projects:
                </span>
                {projects
                  .filter(
                    (p) =>
                      !filterProjectId || p.id === filterProjectId,
                  )
                  .slice(0, 12)
                  .map((proj) => (
                    <Link
                      key={proj.id}
                      href={`/projects/${proj.id}/overview`}
                      className="flex items-center gap-1.5"
                    >
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px] gap-1 cursor-pointer hover:opacity-80 transition-opacity",
                          projectColorMap[proj.id] || PROJECT_COLORS[0],
                        )}
                      >
                        <FolderKanban className="h-2.5 w-2.5" />
                        {proj.name}
                      </Badge>
                    </Link>
                  ))}
              </div>
            )}

            {/* Empty state */}
            {events.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <CalendarDays className="h-12 w-12 mb-3 opacity-20" />
                <p className="text-sm">
                  No events in {MONTH_NAMES[month]} {year}
                </p>
                <p className="text-xs mt-1 opacity-70">
                  Task due dates and project deadlines appear here.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
