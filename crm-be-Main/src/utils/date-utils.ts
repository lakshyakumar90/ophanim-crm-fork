/**
 * IST (Indian Standard Time) Date/Time Utilities
 *
 * This module provides centralized date/time functions that always use
 * IST (UTC+5:30) regardless of the server's system timezone.
 */

import {
  format,
  addMonths,
  startOfMonth,
  endOfMonth,
  subYears,
} from "date-fns";
import { toZonedTime, formatInTimeZone } from "date-fns-tz";

const IST_TIMEZONE = "Asia/Kolkata";

/**
 * Get current date/time (Real UTC)
 * In a proper system, 'now' is just new Date().
 * The timezone application happens at display/format time.
 */
export function nowIST(): Date {
  return new Date();
}

/**
 * Convert any date to a JS Date object (Real UTC)
 */
export function toIST(date: Date | string | number): Date {
  if (!date) return new Date();
  return new Date(date);
}

/**
 * Get today's date in IST as YYYY-MM-DD string
 */
export function getTodayIST(): string {
  return formatInTimeZone(new Date(), IST_TIMEZONE, "yyyy-MM-dd");
}

/**
 * Get current timestamp as ISO string (UTC)
 * Database stores UTC.
 */
export function getTimestampIST(): string {
  return new Date().toISOString();
}

/**
 * Get year in IST
 */
export function getYearIST(): number {
  return parseInt(formatInTimeZone(new Date(), IST_TIMEZONE, "yyyy"));
}

/**
 * Get month in IST (1-12)
 */
export function getMonthIST(): number {
  return parseInt(formatInTimeZone(new Date(), IST_TIMEZONE, "M"));
}

/**
 * Get the start of today in IST as ISO string (UTC)
 * 00:00 IST -> UTC ISO
 */
export function getStartOfTodayIST(): string {
  const istDateStr = getTodayIST(); // yyyy-MM-dd (IST)
  // Create date at 00:00 IST
  const istStart = toZonedTime(`${istDateStr}T00:00:00`, IST_TIMEZONE);
  // Wait, toZonedTime converts FROM UTC to Zoned.
  // We want to construct a date that IS 00:00 in IST, and get its UTC equivalent.
  // actually standard approach:
  // 1. Get current time
  // 2. Format to yyyy-MM-dd in IST
  // 3. Append T00:00:00+05:30
  return new Date(`${istDateStr}T00:00:00+05:30`).toISOString();
}

/**
 * Get the end of today in IST as ISO string (UTC)
 * 23:59:59.999 IST -> UTC ISO
 */
export function getEndOfTodayIST(): string {
  const istDateStr = getTodayIST();
  return new Date(`${istDateStr}T23:59:59.999+05:30`).toISOString();
}

/**
 * Format date in IST with custom format
 */
export function formatDateIST(
  date: Date | string | number,
  formatStr: "date" | "datetime" | "time" = "datetime",
): string {
  const d = new Date(date);

  switch (formatStr) {
    case "date":
      return formatInTimeZone(d, IST_TIMEZONE, "yyyy-MM-dd");
    case "time":
      return formatInTimeZone(d, IST_TIMEZONE, "HH:mm:ss");
    case "datetime":
    default:
      return formatInTimeZone(d, IST_TIMEZONE, "yyyy-MM-dd HH:mm:ss");
  }
}

/**
 * Get start of a specific month in IST (returned as UTC ISO)
 */
export function getStartOfMonthIST(year: number, month: number): string {
  // month is 1-12
  const monthStr = String(month).padStart(2, "0");
  return new Date(`${year}-${monthStr}-01T00:00:00+05:30`).toISOString();
}

/**
 * Get end of a specific month in IST (returned as UTC ISO)
 */
export function getEndOfMonthIST(year: number, month: number): string {
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextMonthYear = month === 12 ? year + 1 : year;
  const nextMonthStr = String(nextMonth).padStart(2, "0");

  // Start of next month in IST, minus 1ms
  const startOfNextMonth = new Date(
    `${nextMonthYear}-${nextMonthStr}-01T00:00:00+05:30`,
  );
  return new Date(startOfNextMonth.getTime() - 1).toISOString();
}

// Alias exports for backward compatibility
export const getISTDate = getTodayIST;
export const getISTTimestamp = getTimestampIST;
