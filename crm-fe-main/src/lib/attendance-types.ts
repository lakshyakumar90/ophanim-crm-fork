export type DateRangeType =
  | "today"
  | "yesterday"
  | "thisWeek"
  | "lastWeek"
  | "thisMonth"
  | "lastMonth"
  | "thisQuarter"
  | "halfYear"
  | "custom";

export const statusColors: Record<string, string> = {
  present: "bg-green-100 text-green-700",
  late: "bg-amber-100 text-amber-700",
  half_day: "bg-orange-100 text-orange-700",
  absent: "bg-red-100 text-red-700",
  leave: "bg-blue-100 text-blue-700",
  holiday: "bg-violet-100 text-violet-700",
  week_off: "bg-slate-100 text-slate-600",
};

export const PIE_COLORS = {
  present: "#22c55e",
  late: "#f59e0b",
  halfDay: "#f97316",
  absent: "#ef4444",
  leave: "#3b82f6",
} as const;

export const ATTENDANCE_SWR_KEYS = {
  weekly: "attendance-weekly",
  today: "attendance-today",
  summary: "attendance-summary",
  rule: "attendance-rule",
  myHistory: "my-history",
  myMonthSummary: "my-month-summary",
  analytics: "attendance-analytics",
  holidays: "holidays-current-year",
  users: "attendance-users",
} as const;

export type UserDaySession = {
  id?: string;
  clockInTime?: string | null;
  clockOutTime?: string | null;
  totalHours?: number | null;
};

export type UsersTodayItem = {
  user: {
    id: string;
    fullName: string;
    avatarUrl?: string | null;
    role?: string | null;
    designation?: string | null;
    shiftType?: string | null;
  };
  status: string;
  attendance?: {
    clockInTime?: string | null;
    clockOutTime?: string | null;
    totalHours?: number | null;
    sessions?: UserDaySession[];
  } | null;
};

export type ShiftWindow = {
  shiftType: string;
  shiftStart: Date;
  shiftEnd: Date;
};

export function formatStatusLabel(status: string): string {
  if (status === "week_off") return "Week Off";
  if (status === "half_day") return "Half Day";
  return status ? status.charAt(0).toUpperCase() + status.slice(1) : "—";
}
