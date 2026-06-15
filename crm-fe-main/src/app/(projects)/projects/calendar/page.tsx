"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
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
  Plus,
  CalendarDays,
  Filter,
  X,
  CheckSquare,
  FolderKanban,
  Flag,
  Loader2,
  GripVertical,
} from "lucide-react";
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
import { cn } from "@/lib/utils";
import { projectsApi, tasksApi } from "@/lib/api";
import { useHeaderRefresh } from "@/hooks/layout/useHeaderRefresh";

// ─── Helpers ───────────────────────────────────────────────────────────────

const PROJECT_COLORS = [
  "bg-blue-500/15 border-blue-500/40 text-blue-700 dark:text-blue-300",
  "bg-purple-500/15 border-purple-500/40 text-purple-700 dark:text-purple-300",
  "bg-green-500/15 border-green-500/40 text-green-700 dark:text-green-300",
  "bg-orange-500/15 border-orange-500/40 text-orange-700 dark:text-orange-300",
  "bg-pink-500/15 border-pink-500/40 text-pink-700 dark:text-pink-300",
  "bg-teal-500/15 border-teal-500/40 text-teal-700 dark:text-teal-300",
  "bg-indigo-500/15 border-indigo-500/40 text-indigo-700 dark:text-indigo-300",
  "bg-rose-500/15 border-rose-500/40 text-rose-700 dark:text-rose-300",
];

function getProjectColorClass(index: number) {
  return PROJECT_COLORS[index % PROJECT_COLORS.length];
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function dateToKey(d: Date) {
  return format(d, "yyyy-MM-dd");
}

// ─── Types ─────────────────────────────────────────────────────────────────

type EventType = "task" | "project-end";

interface CalEvent {
  id: string;
  title: string;
  subtitle?: string;
  type: EventType;
  date: Date;
  colorClass: string;
  projectId?: string;
  projectName?: string;
  raw: any;
}

// ─── Event Card ────────────────────────────────────────────────────────────

function EventCard({
  event,
  onDragStart,
}: {
  event: CalEvent;
  onDragStart: (e: React.DragEvent, event: CalEvent) => void;
}) {
  const Icon = event.type === "project-end" ? Flag : CheckSquare;
  const isDraggable = event.type === "task";

  return (
    <div
      draggable={isDraggable}
      onDragStart={(e) => onDragStart(e, event)}
      className={cn(
        "group relative flex items-start gap-1.5 px-2 py-1.5 rounded-md border text-[11px] leading-tight select-none transition-all hover:scale-[1.02] hover:shadow-md",
        event.colorClass,
        isDraggable ? "cursor-grab active:cursor-grabbing" : "cursor-default"
      )}
      title={event.title}
    >
      <Icon className="h-3 w-3 mt-0.5 shrink-0 opacity-70" />
      <div className="flex-1 min-w-0">
        <div className="font-medium truncate">{event.title}</div>
        {event.projectName && (
          <div className="text-[10px] opacity-70 truncate flex items-center gap-1">
            <FolderKanban className="h-2.5 w-2.5" />
            {event.projectName}
          </div>
        )}
      </div>
      {isDraggable && (
        <GripVertical className="h-3 w-3 opacity-0 group-hover:opacity-30 shrink-0" />
      )}
    </div>
  );
}

// ─── Day Column ────────────────────────────────────────────────────────────

function DayColumn({
  date,
  events,
  isToday,
  onDrop,
  onDragOver,
  onDragLeave,
  isDragTarget,
  onAddClick,
  draggedEvent,
}: {
  date: Date;
  events: CalEvent[];
  isToday: boolean;
  onDrop: (date: Date) => void;
  onDragOver: (date: Date) => void;
  onDragLeave: () => void;
  isDragTarget: boolean;
  onAddClick: (date: Date) => void;
  draggedEvent: CalEvent | null;
}) {
  return (
    <div
      className={cn(
        "relative flex flex-col min-h-[500px] border-r border-border/50 transition-colors",
        isDragTarget && draggedEvent ? "bg-primary/5 border-primary/30" : "",
      )}
      onDragOver={(e) => { e.preventDefault(); onDragOver(date); }}
      onDragLeave={onDragLeave}
      onDrop={(e) => { e.preventDefault(); onDrop(date); }}
    >
      <div
        className={cn(
          "sticky top-0 z-10 flex flex-col items-center py-3 border-b border-border/50 bg-background/80 backdrop-blur-sm",
          isToday && "bg-primary/5",
        )}
      >
        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
          {format(date, "EEE")}
        </span>
        <div
          className={cn(
            "mt-1 w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold transition-colors",
            isToday
              ? "bg-primary text-primary-foreground"
              : "text-foreground hover:bg-muted cursor-default",
          )}
        >
          {format(date, "d")}
        </div>
      </div>

      <div className="flex-1 p-2 space-y-1 overflow-y-auto">
        {events.map((ev) => (
          <EventCard
            key={ev.id}
            event={ev}
            onDragStart={(e, ev) => ev.type === "task" && draggedEvent !== ev}
          />
        ))}
      </div>

      <button
        onClick={() => onAddClick(date)}
        className="absolute bottom-2 right-2 w-6 h-6 rounded-full bg-primary/10 hover:bg-primary/20 text-primary flex items-center justify-center transition-all opacity-0 group-hover:opacity-100"
        title={`Add task on ${format(date, "MMM d")}`}
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// ─── Create Task Modal ─────────────────────────────────────────────────────

function CreateTaskModal({
  open,
  onClose,
  defaultDate,
  defaultProjectId,
  projects,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  defaultDate: Date | null;
  defaultProjectId: string;
  projects: any[];
  onCreated: () => void;
}) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [projectId, setProjectId] = useState("none");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setTitle("");
      setDate(defaultDate ? format(defaultDate, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"));
      setProjectId(defaultProjectId || "none");
    }
  }, [open, defaultDate, defaultProjectId]);

  async function handleCreate() {
    if (!title || !date) return;
    setLoading(true);
    try {
      const dueDate = new Date(`${date}T09:00:00`).toISOString();
      await tasksApi.create({
        title,
        dueDate,
        status: "pending",
        projectId: projectId !== "none" ? projectId : undefined,
      });
      onCreated();
      onClose();
    } catch (err) {
      console.error("Failed to create task", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Create Project Task
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <Input
            placeholder="Task title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
          />
          <div className="flex gap-2">
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="flex-1"
            />
          </div>
          <Select value={projectId} onValueChange={setProjectId}>
            <SelectTrigger>
              <SelectValue placeholder="Select project (optional)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No Project</SelectItem>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={!title || !date || loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Task"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────

export default function ProjectCalendarPage() {
  const today = new Date();

  // ── State ──────────────────────────────────────────────────────────────
  const [currentDate, setCurrentDate] = useState(today);
  const [viewMode, setViewMode] = useState<"week" | "month">("week");
  const [filterProjectId, setFilterProjectId] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);
  const [rangeStart, setRangeStart] = useState("");
  const [rangeEnd, setRangeEnd] = useState("");

  const [draggedEvent, setDraggedEvent] = useState<CalEvent | null>(null);
  const [dragTarget, setDragTarget] = useState<string | null>(null);
  
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createDefaultDate, setCreateDefaultDate] = useState<Date | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);

  // ── Derived range ──────────────────────────────────────────────────────
  const weekStart = useMemo(() => startOfWeek(currentDate, { weekStartsOn: 1 }), [currentDate]);

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

  // ── Data ───────────────────────────────────────────────────────────────
  const { data: projectsData } = useSWR("calendar-projects", () => projectsApi.list(), { revalidateOnFocus: false });
  const allProjects: any[] = Array.isArray(projectsData) ? projectsData : [];

  const projectColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    allProjects.forEach((p, i) => {
      map[p.id] = getProjectColorClass(i);
    });
    return map;
  }, [allProjects]);

  const { data: tasksData, mutate: mutateTasks, isLoading: isTasksLoading } = useSWR(
    ["calendar-project-tasks", fetchStart, fetchEnd],
    () => tasksApi.list({
      limit: 1000,
      startDate: new Date(fetchStart + "T00:00:00").toISOString(),
      endDate: new Date(fetchEnd + "T23:59:59").toISOString(),
    }),
    { revalidateOnFocus: false }
  );

  useHeaderRefresh({ onRefresh: () => mutateTasks(), isRefreshing: isTasksLoading });

  // ── Build Events ───────────────────────────────────────────────────────
  const events = useMemo<CalEvent[]>(() => {
    const evs: CalEvent[] = [];
    
    // 1. Projects Deadlines
    for (const proj of allProjects) {
      if (!proj.endDate) continue;
      if (filterProjectId !== "all" && proj.id !== filterProjectId) continue;
      evs.push({
        id: `proj-${proj.id}`,
        title: `🏁 ${proj.name} Deadline`,
        type: "project-end",
        date: new Date(proj.endDate),
        colorClass: projectColorMap[proj.id] || PROJECT_COLORS[0],
        projectId: proj.id,
        projectName: proj.name,
        raw: proj,
      });
    }

    // 2. Tasks
    const tasks: any[] = Array.isArray(tasksData) ? tasksData : (tasksData as any)?.data || [];
    for (const t of tasks) {
      const due = t.dueDate || t.due_date;
      if (!due) continue;
      if (t.status === "completed" || t.status === "cancelled") continue;
      const projId = t.projectId || t.project_id || "";
      if (filterProjectId !== "all" && projId !== filterProjectId) continue;
      
      const proj = allProjects.find((p) => p.id === projId);
      
      evs.push({
        id: `task-${t.id}`,
        title: t.title,
        type: "task",
        date: new Date(due),
        colorClass: projId ? projectColorMap[projId] : "bg-muted text-foreground border-border",
        projectId: projId,
        projectName: proj?.name || "No Project",
        raw: t,
      });
    }

    return evs;
  }, [allProjects, tasksData, filterProjectId, projectColorMap]);

  const eventMap = useMemo(() => {
    const map: Record<string, CalEvent[]> = {};
    for (const ev of events) {
      const key = dateToKey(ev.date);
      if (!map[key]) map[key] = [];
      map[key].push(ev);
    }
    return map;
  }, [events]);

  // ── Drag & Drop ────────────────────────────────────────────────────────
  function handleDragStart(_e: React.DragEvent, event: CalEvent) {
    if (event.type === "task") setDraggedEvent(event);
  }

  function handleDrop(targetDate: Date) {
    if (!draggedEvent || draggedEvent.type !== "task") return;
    setDragTarget(null);

    const taskId = draggedEvent.raw.id;
    const newDue = new Date(targetDate);
    newDue.setHours(new Date(draggedEvent.raw.dueDate || draggedEvent.raw.due_date).getHours() || 9, 0);
    
    tasksApi.update(taskId, { dueDate: newDue.toISOString() }).then(() => {
      void mutateTasks();
    });
    setDraggedEvent(null);
  }

  // ── Nav ────────────────────────────────────────────────────────────────
  const goBack = () => {
    setRangeStart(""); setRangeEnd("");
    if (viewMode === "week") setCurrentDate((d) => addDays(d, -7));
    else setCurrentDate((d) => subMonths(d, 1));
  };
  const goForward = () => {
    setRangeStart(""); setRangeEnd("");
    if (viewMode === "week") setCurrentDate((d) => addDays(d, 7));
    else setCurrentDate((d) => addMonths(d, 1));
  };
  const goToday = () => {
    setRangeStart(""); setRangeEnd("");
    setCurrentDate(today);
  };

  const headerLabel = useMemo(() => {
    if (rangeStart && rangeEnd) return `${rangeStart} → ${rangeEnd}`;
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
    <div className="flex flex-col h-full bg-background overflow-hidden">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 flex flex-col gap-3 px-6 py-4 border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-20">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <CalendarDays className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-bold tracking-tight">Project Calendar</h1>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex border rounded-md overflow-hidden">
              {(["week", "month"] as const).map((v) => (
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

            <Button
              variant={showFilters ? "default" : "outline"}
              size="sm"
              className="h-8 text-xs gap-1.5"
              onClick={() => setShowFilters((s) => !s)}
            >
              <Filter className="h-3.5 w-3.5" />
              Filters
              {filterProjectId !== "all" || (rangeStart && rangeEnd) ? (
                <Badge className="h-4 w-4 p-0 flex items-center justify-center text-[9px] ml-0.5">!</Badge>
              ) : null}
            </Button>

            <Button
              size="sm"
              className="h-8 text-xs gap-1.5"
              onClick={() => { setCreateDefaultDate(today); setCreateModalOpen(true); }}
            >
              <Plus className="h-3.5 w-3.5" />
              Add Task
            </Button>
          </div>
        </div>

        {/* Filter bar */}
        {showFilters && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/50">
            <Select value={filterProjectId} onValueChange={setFilterProjectId}>
              <SelectTrigger className="h-8 w-[200px] text-xs">
                <SelectValue placeholder="All Projects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Projects</SelectItem>
                {allProjects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

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
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setRangeStart(""); setRangeEnd(""); }}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Legend ──────────────────────────────────────────────────────── */}
      {allProjects.length > 0 && filterProjectId === "all" && (
        <div className="flex-shrink-0 flex items-center gap-2 px-6 py-1.5 border-b border-border/40 text-[11px] bg-background/50 overflow-x-auto whitespace-nowrap">
          <span className="text-muted-foreground font-medium mr-1">Projects:</span>
          {allProjects.slice(0, 10).map((proj) => (
            <div key={proj.id} className="flex items-center gap-1">
              <div className={cn("w-2.5 h-2.5 rounded border", projectColorMap[proj.id]?.split(" ").filter(c => c.startsWith("bg-") || c.startsWith("border-")).join(" "))} />
              {proj.name}
            </div>
          ))}
          {allProjects.length > 10 && <span className="text-muted-foreground">+{allProjects.length - 10} more</span>}
        </div>
      )}

      {/* ── Calendar Grid ───────────────────────────────────────────────── */}
      <div ref={scrollRef} className="flex-1 overflow-x-auto overflow-y-auto">
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
                  onDrop={handleDrop}
                  onDragOver={(d) => setDragTarget(dateToKey(d))}
                  onDragLeave={() => setDragTarget(null)}
                  isDragTarget={dragTarget === key}
                  draggedEvent={draggedEvent}
                  onAddClick={(d) => {
                    setCreateDefaultDate(d);
                    setCreateModalOpen(true);
                  }}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Create Modal ────────────────────────────────────────────────── */}
      <CreateTaskModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        defaultDate={createDefaultDate}
        defaultProjectId={filterProjectId !== "all" ? filterProjectId : ""}
        projects={allProjects}
        onCreated={() => mutateTasks()}
      />
    </div>
  );
}
