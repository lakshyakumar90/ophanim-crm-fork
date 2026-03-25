import { format, formatDistanceToNow, isPast, isBefore, startOfDay } from "date-fns";

export function formatRecruitmentDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return format(new Date(iso), "MMM d, yyyy");
  } catch {
    return "—";
  }
}

export function formatRecruitmentDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return format(new Date(iso), "MMM d, yyyy 'at' h:mm a");
  } catch {
    return "—";
  }
}

export function formatRelativeTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true });
  } catch {
    return "—";
  }
}

/** Deadline is expired if date (calendar day) is before today */
export function isDeadlineExpired(deadline: string | null | undefined): boolean {
  if (!deadline) return false;
  try {
    const d = startOfDay(new Date(deadline));
    return isBefore(d, startOfDay(new Date()));
  } catch {
    return false;
  }
}

export function isFutureDate(isoDate: string): boolean {
  if (!isoDate) return false;
  try {
    return !isPast(startOfDay(new Date(isoDate)));
  } catch {
    return false;
  }
}

export function isFutureDateTime(iso: string): boolean {
  if (!iso) return false;
  try {
    return new Date(iso).getTime() > Date.now();
  } catch {
    return false;
  }
}
