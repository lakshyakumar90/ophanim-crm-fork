import { format, formatDistanceToNow, isAfter, isBefore, parseISO, addDays } from "date-fns";
import type { LeaveRequestStatus } from "@/types/hr-leaves";

export function formatLeaveDate(iso: string): string {
  try {
    return format(parseISO(iso.slice(0, 10)), "dd MMM yyyy");
  } catch {
    return iso;
  }
}

export function formatLeaveRelative(iso: string): string {
  try {
    return formatDistanceToNow(parseISO(iso), { addSuffix: true });
  } catch {
    return "";
  }
}

/** Weekends excluded (Mon–Fri), inclusive of start/end. */
export function countWorkingDays(startStr: string, endStr: string): number {
  let start = parseISO(startStr.slice(0, 10));
  const end = parseISO(endStr.slice(0, 10));
  if (isAfter(start, end)) return 0;
  let n = 0;
  while (!isAfter(start, end)) {
    const d = start.getDay();
    if (d !== 0 && d !== 6) n += 1;
    start = addDays(start, 1);
  }
  return n;
}

export function leaveStatusLabel(status: LeaveRequestStatus): string {
  switch (status) {
    case "manager_approved":
      return "Awaiting HR";
    case "pending":
      return "Pending";
    case "approved":
      return "Approved";
    case "rejected":
      return "Rejected";
    case "cancelled":
      return "Cancelled";
    default:
      return status;
  }
}

export function leaveStatusBadgeClass(status: LeaveRequestStatus): string {
  switch (status) {
    case "pending":
    case "manager_approved":
      return "bg-amber-100 text-amber-950 border-amber-200";
    case "approved":
      return "bg-emerald-100 text-emerald-900 border-emerald-200";
    case "rejected":
      return "bg-red-100 text-red-900 border-red-200";
    case "cancelled":
      return "bg-muted text-muted-foreground border-border";
    default:
      return "";
  }
}

export function slugifyLeaveTypeName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 64);
}

export function urgencyForDate(iso: string | null | undefined): "past" | "soon" | "ok" {
  if (!iso) return "ok";
  try {
    const d = parseISO(iso.slice(0, 10));
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (isBefore(d, today)) return "past";
    const three = addDays(today, 3);
    if (!isAfter(d, three)) return "soon";
    return "ok";
  } catch {
    return "ok";
  }
}
