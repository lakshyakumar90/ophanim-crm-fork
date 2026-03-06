/**
 * IST (Indian Standard Time) Date/Time Utilities
 *
 * This module provides centralized date/time formatting functions
 * that always use IST (UTC+5:30) regardless of the user's system timezone.
 */

import { formatInTimeZone, toZonedTime } from "date-fns-tz";
import { formatDistanceToNowStrict } from "date-fns";
import { enUS } from "date-fns/locale";

// IST timezone identifier
const IST_TIMEZONE = "Asia/Kolkata";

/**
 * Get current date/time in IST (returned as JS Date object, but theoretically represents IST)
 * Note: JS Date is always UTC. providing "IST" Date usually means shifting it.
 * Better to use Real UTC for logic, and formatInTimeZone for display.
 */
export function nowIST(): Date {
  return new Date();
}

/**
 * Format a date in IST timezone
 * @param date - The date to format
 * @param formatStr - The format string
 * @returns Formatted date string in IST
 */
export function formatIST(
  date: Date | string | number | null | undefined,
  formatStr: string,
): string {
  if (!date) return "-";
  const inputDate = new Date(date);
  return formatInTimeZone(inputDate, IST_TIMEZONE, formatStr);
}

/**
 * Format distance to now in IST
 * @param date - The date to compare
 * @returns Formatted distance string
 */
export function formatDistanceToNowIST(
  date: Date | string | number,
  options?: { addSuffix?: boolean },
): string {
  if (!date) return "-";
  const inputDate = new Date(date);
  // formatDistanceToNow calculates difference. Timezone doesn't matter for diff between two absolute timestamps.
  // But to be safe, we ensure input is Date object.
  return formatDistanceToNowStrict(inputDate, {
    addSuffix: options?.addSuffix,
    locale: enUS,
  });
}

/**
 * Get today's date in IST as YYYY-MM-DD string
 */
export function getTodayIST(): string {
  return formatIST(new Date(), "yyyy-MM-dd");
}

/**
 * Format date for display (e.g., "Jan 15, 2024")
 */
export function formatDateIST(date: Date | string | number): string {
  return formatIST(date, "MMM d, yyyy");
}

/**
 * Format date with time (e.g., "Jan 15, 2024 at 3:30 PM")
 */
export function formatDateTimeIST(date: Date | string | number): string {
  return formatIST(date, "MMM d, yyyy 'at' h:mm a");
}

/**
 * Format time only (e.g., "3:30 PM")
 */
export function formatTimeIST(date: Date | string | number): string {
  return formatIST(date, "h:mm a");
}

/**
 * Format for locale string replacement (e.g., "1/15/2024, 3:30:00 PM")
 */
export function toLocaleStringIST(date: Date | string | number): string {
  return formatIST(date, "M/d/yyyy, h:mm:ss a");
}

/**
 * Format for locale date string replacement (e.g., "1/15/2024")
 */
export function toLocaleDateStringIST(date: Date | string | number): string {
  return formatIST(date, "M/d/yyyy");
}

/**
 * Format for locale time string replacement (e.g., "3:30:00 PM")
 */
export function toLocaleTimeStringIST(date: Date | string | number): string {
  return formatIST(date, "h:mm:ss a");
}

/**
 * Format weekday with date (e.g., "Monday, January 15, 2024")
 */
export function formatFullDateIST(date: Date | string | number): string {
  return formatIST(date, "EEEE, MMMM d, yyyy");
}

// Re-export format for custom formatting with IST conversion
export { formatIST as format };

// Backward compatibility / Alias
export const formatStoredIST = formatIST;
export const formatStoredDate = formatDateIST;
export const formatStoredTime = formatTimeIST;

/**
 * Compatibility helper for Duration calculation.
 * Returns Real UTC timestamp.
 */
export function nowISTAsUTC(): number {
  return Date.now();
}

/**
 * Compatibility helper for Duration calculation.
 * Returns Real UTC timestamp.
 */
export function parseStoredIST(dateStr: string | Date | number): number {
  if (!dateStr) return 0;
  return new Date(dateStr).getTime();
}

/**
 * Convert decimal hours into a readable duration string.
 * Examples:
 * - 1.39 -> "1h 23m"
 * - 0.01 -> "1m"
 * - 2 -> "2h"
 */
export function formatHoursToReadable(
  hours: number | null | undefined,
  fallback: string = "--",
): string {
  if (typeof hours !== "number" || Number.isNaN(hours)) return fallback;
  const totalMinutes = Math.max(0, Math.round(hours * 60));
  if (totalMinutes === 0) return "0m";
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

/**
 * Helper to convert any input to true IST Date object (shifted).
 * Use only if strictly necessary for component internals that rely on local time being IST.
 */
export function toIST(date: Date | string | number): Date {
  return toZonedTime(new Date(date), IST_TIMEZONE);
}
