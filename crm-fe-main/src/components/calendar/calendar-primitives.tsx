"use client";

import { format } from "date-fns";
import {
  Plus,
  Clock,
  CheckSquare,
  Bell,
  Calendar,
  Landmark,
  Home,
} from "lucide-react";
import { cn } from "@/lib/utils";

/** Event types supported by the shared calendar UI (global + HR leaves). */
export type CalendarEventType =
  | "task"
  | "reminder"
  | "attendance"
  | "leave"
  | "holiday"
  | "weekend";

export interface CalEvent {
  id: string;
  title: string;
  subtitle?: string;
  type: CalendarEventType;
  date: Date;
  startTime?: string;
  endTime?: string;
  color?: string;
  userId?: string;
  userName?: string;
  userAvatar?: string;
  raw: any;
}

export const EVENT_COLORS: Record<CalendarEventType, string> = {
  task: "bg-blue-500/15 border-blue-500/40 text-blue-700 dark:text-blue-300",
  reminder: "bg-amber-500/15 border-amber-500/40 text-amber-700 dark:text-amber-300",
  attendance: "bg-green-500/15 border-green-500/40 text-green-700 dark:text-green-300",
  leave: "bg-rose-500/15 border-rose-500/40 text-rose-700 dark:text-rose-300",
  holiday:
    "bg-gray-500/15 border-gray-500/40 text-gray-700 dark:text-gray-300",
  weekend:
    "bg-violet-500/12 border-violet-500/35 text-violet-800 dark:text-violet-200",
};

export const TYPE_ICONS: Record<CalendarEventType, React.ElementType> = {
  task: CheckSquare,
  reminder: Bell,
  attendance: Clock,
  leave: Calendar,
  holiday: Landmark,
  weekend: Home,
};

export const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function dateToKey(d: Date) {
  return format(d, "yyyy-MM-dd");
}

export function EventCard({
  event,
  onClick,
}: {
  event: CalEvent;
  onClick: (event: CalEvent) => void;
}) {
  const Icon = TYPE_ICONS[event.type];
  const isOverdue =
    (event.type === "task" || event.type === "reminder") &&
    event.date &&
    event.date.getTime() < Date.now() &&
    event.raw?.status !== "completed" &&
    event.raw?.status !== "cancelled";

  const colorClass = event.color ?? EVENT_COLORS[event.type];

  return (
    <div
      onClick={() => onClick(event)}
      className={cn(
        "group relative flex items-start gap-1.5 px-2 py-1.5 rounded-md border text-[11px] leading-tight select-none transition-all cursor-pointer hover:scale-[1.02] hover:shadow-md",
        isOverdue
          ? "bg-red-500/15 border-red-500/40 text-red-700 dark:text-red-300"
          : colorClass,
      )}
      title={event.title}
    >
      <Icon className="h-3 w-3 mt-0.5 shrink-0 opacity-70" />
      <div className="flex-1 min-w-0">
        <div className="font-medium truncate">{event.title}</div>
        {(event.subtitle || event.userName) && (
          <div className="text-[10px] opacity-60 truncate">
            {event.subtitle || event.userName}
          </div>
        )}
        {event.startTime && (
          <div className="text-[10px] opacity-60">{event.startTime}</div>
        )}
      </div>
    </div>
  );
}

export function DayColumn({
  date,
  events,
  isToday,
  isWeekend = false,
  /** Parent provides vertical scroll; events stack in column (e.g. HR team calendar). */
  scrollEventsInParent = false,
  onAddClick,
  onEventClick,
  showAddButton = true,
}: {
  date: Date;
  events: CalEvent[];
  isToday: boolean;
  /** Muted column styling for Sat/Sun (or configured non-working days). */
  isWeekend?: boolean;
  scrollEventsInParent?: boolean;
  onAddClick: (date: Date) => void;
  onEventClick: (event: CalEvent) => void;
  showAddButton?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative flex flex-col border-r border-border/50 transition-colors",
        scrollEventsInParent
          ? "flex h-full min-h-0 w-full min-w-0 flex-col"
          : "min-h-[500px]",
        isWeekend && "bg-muted/25",
      )}
    >
      <div
        className={cn(
          "sticky top-0 z-10 flex flex-col items-center py-3 border-b border-border/50 bg-background/80 backdrop-blur-sm",
          isToday && "bg-primary/5",
          isWeekend && !isToday && "bg-muted/40",
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

      <div
        className={cn(
          "flex-1 min-h-0 p-2 space-y-1",
          scrollEventsInParent ? "" : "overflow-y-auto",
        )}
      >
        {events.map((ev) => (
          <EventCard key={ev.id} event={ev} onClick={onEventClick} />
        ))}
      </div>

      {showAddButton && (
        <button
          type="button"
          onClick={() => onAddClick(date)}
          className="absolute bottom-2 right-2 w-6 h-6 rounded-full bg-primary/10 hover:bg-primary/20 text-primary flex items-center justify-center transition-all opacity-0 group-hover:opacity-100"
          title={`Add event on ${format(date, "MMM d")}`}
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
