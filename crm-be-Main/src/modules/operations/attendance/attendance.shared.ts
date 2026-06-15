import { supabaseAdmin } from "../../../config/supabase.js";
import { ApiError } from "../../../utils/responses.js";
import { ERROR_CODES } from "../../../utils/error-codes.js";
import { USER_ROLES, SHIFT_TYPES } from "../../../config/constants.js";
import { logActivity } from "../../shared/activity-events.service.js";
import {
  parsePaginationParams,
  calculatePaginationMeta,
  calculateOffset,
  parseSortParams,
  parseArrayParam,
  parseDateRange,
} from "../../../utils/pagination.js";
import { getCurrentTimestamp } from "../../../utils/helpers.js";
import type { PaginatedResult, AuthUser } from "../../../types/api.types.js";
import type {
  ClockInInput,
  ClockOutInput,
  ManualAttendanceInput,
  UpdateAttendanceInput,
  AttendanceListQuery,
  AttendanceRulesInput,
  CreateHolidayInput,
} from "./attendance.validator.js";

export interface AttendanceRecord {
  id: string;
  userId: string;
  date: string;
  clockInTime: string | null;
  clockOutTime: string | null;
  totalHours: number | null;
  breakDuration: number;
  status: string;
  location: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AttendanceRow {
  id: string;
  user_id: string;
  date: string;
  attendance_date?: string | null;
  clock_in_time: string | null;
  clock_out_time: string | null;
  session_status?: string | null;
  total_hours: number | null;
  break_duration: number;
  status: string;
  attendance_status?: string | null;
  location: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export function normalizeAttendanceStatus(value: string | null | undefined): string {
  if (!value) return "present";
  const normalized = value.toLowerCase();
  if (normalized === "week_off") return "holiday";
  return normalized;
}

export function toCompatAttendanceStatus(value: string | null | undefined): string {
  const normalized = normalizeAttendanceStatus(value);

  switch (normalized) {
    case "present":
    case "late":
      return "PRESENT";
    case "half_day":
      return "HALF_DAY";
    case "absent":
    case "leave":
      return "ABSENT";
    case "holiday":
      return "HOLIDAY";
    default:
      return "PRESENT";
  }
}

export function calculateWorkedHours(
  clockInTime: string | null,
  clockOutTime: string | null,
  breakDuration: number | null | undefined = 0,
): number | null {
  if (!clockInTime || !clockOutTime) return null;
  const clockIn = new Date(clockInTime);
  const clockOut = new Date(clockOutTime);
  if (Number.isNaN(clockIn.getTime()) || Number.isNaN(clockOut.getTime())) {
    return null;
  }

  const totalMinutes =
    (clockOut.getTime() - clockIn.getTime()) / 60000 - (breakDuration || 0);
  const safeMinutes = Math.max(0, totalMinutes);
  return Math.round((safeMinutes / 60) * 100) / 100;
}

export function mapAttendanceRowToRecord(data: AttendanceRow): AttendanceRecord {
  const status = normalizeAttendanceStatus(data.status || data.attendance_status);
  const hasClockIn = Boolean(data.clock_in_time);
  const hideTimes = !hasClockIn || status === "absent";
  return {
    id: data.id,
    userId: data.user_id,
    date: data.date || data.attendance_date || "",
    clockInTime: hideTimes ? null : data.clock_in_time,
    clockOutTime: hideTimes ? null : data.clock_out_time,
    totalHours: data.total_hours,
    breakDuration: data.break_duration,
    status,
    location: data.location,
    notes: data.notes,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

import {
  getTimestampIST,
} from "../../../utils/date-utils.js";
import { formatInTimeZone } from "date-fns-tz";

export const IST_TIMEZONE = "Asia/Kolkata";
export const AUTO_LOGOUT_GRACE_MINUTES = 15;
export const AUTO_MERGE_WINDOW_MINUTES = 2;
export const DEFAULT_SHIFT_DURATION_MINUTES = 9 * 60;

export function parseTimeToHHMM(value: string | null | undefined, fallback: string): string {
  const raw = (value || fallback).trim();
  const [h = "00", m = "00"] = raw.split(":");
  return `${h.padStart(2, "0")}:${m.padStart(2, "0")}`;
}

export function parseMinutes(hhmm: string): number {
  const [h = "0", m = "0"] = hhmm.split(":");
  return parseInt(h, 10) * 60 + parseInt(m, 10);
}

export function getShiftDateTimes(
  effectiveDate: string,
  shiftType: string,
  rules?: {
    work_start_time?: string | null;
    work_end_time?: string | null;
    auto_logout_time?: string | null;
  } | null,
): { shiftStart: Date; shiftEnd: Date; autoLogoutAt: Date } {
  const fallbackStart = shiftType === SHIFT_TYPES.NIGHT_SHIFT ? "19:00" : "09:00";
  const fallbackEnd = shiftType === SHIFT_TYPES.NIGHT_SHIFT ? "04:00" : "18:00";
  const startHHMM = parseTimeToHHMM(rules?.work_start_time, fallbackStart);
  const endHHMM = parseTimeToHHMM(rules?.work_end_time, fallbackEnd);

  const shiftStart = new Date(`${effectiveDate}T${startHHMM}:00+05:30`);
  const shiftEndBase = new Date(`${effectiveDate}T${endHHMM}:00+05:30`);
  const startMinutes = parseMinutes(startHHMM);
  const endMinutes = parseMinutes(endHHMM);
  const crossesMidnight = endMinutes <= startMinutes;
  const shiftEnd = new Date(
    shiftEndBase.getTime() + (crossesMidnight ? 24 * 60 * 60 * 1000 : 0),
  );

  // Default fixed auto-logout times: 04:30 for night shift, 18:30 for day shift.
  // Admin can override by setting auto_logout_time in attendance_rules;
  // setting it to null reverts to these fixed defaults.
  const defaultAutoLogout = shiftType === SHIFT_TYPES.NIGHT_SHIFT ? "04:30" : "18:30";
  const autoLogoutHHMM = parseTimeToHHMM(rules?.auto_logout_time ?? null, defaultAutoLogout);
  const autoLogoutMinutes = parseMinutes(autoLogoutHHMM);
  const autoLogoutBase = new Date(`${effectiveDate}T${autoLogoutHHMM}:00+05:30`);
  const autoLogoutCrossesMidnight = autoLogoutMinutes <= startMinutes;
  const autoLogoutAt = new Date(
    autoLogoutBase.getTime() + (autoLogoutCrossesMidnight ? 24 * 60 * 60 * 1000 : 0),
  );

  return { shiftStart, shiftEnd, autoLogoutAt };
}

export function evaluateClockInWindow(now: Date, shiftStart: Date): { status: string } {
  return {
    status: now > shiftStart ? "late" : "present",
  };
}

export function getShiftDurationMinutes(rules?: any | null): number {
  const hoursRaw = rules?.full_day_hours;
  const hours = typeof hoursRaw === "number" ? hoursRaw : Number(hoursRaw);

  if (!Number.isFinite(hours) || hours <= 0 || hours > 24) {
    return DEFAULT_SHIFT_DURATION_MINUTES;
  }

  return Math.round(hours * 60);
}

export function calculateAutoLogoutTime(
  clockInTime: Date,
  shiftDurationMinutes: number = DEFAULT_SHIFT_DURATION_MINUTES,
): Date {
  return new Date(clockInTime.getTime() + shiftDurationMinutes * 60 * 1000);
}

export function calculateScheduledAutoLogoutTime(
  clockInTime: Date,
  effectiveDate: string,
  shiftType: string,
  rules?: {
    work_start_time?: string | null;
    work_end_time?: string | null;
    auto_logout_time?: string | null;
  } | null,
): Date {
  const { shiftStart, shiftEnd, autoLogoutAt } = getShiftDateTimes(
    effectiveDate,
    shiftType,
    rules,
  );

  const isLate = clockInTime > shiftStart;

  if (isLate) {
    // Late clock-in: auto-logout exactly one shift-duration after clock-in.
    // e.g. shift 9am-6pm (9 h), clock-in 10am → auto-logout 7pm.
    const shiftDurationMs = shiftEnd.getTime() - shiftStart.getTime();
    return new Date(clockInTime.getTime() + shiftDurationMs);
  }

  // On-time clock-in: always use the computed autoLogoutAt.
  // When auto_logout_time rule is null, getShiftDateTimes() falls back to
  // the fixed defaults (04:30 night / 18:30 day) — no grace appended.
  return autoLogoutAt;
}

/**
 * Get user's shift type
 */
export async function getUserShiftType(userId: string): Promise<string> {
  const { data: user, error } = await supabaseAdmin
    .from("users")
    .select("shift_type")
    .eq("id", userId)
    .single();

  if (error || !user) {
    // Default to day_shift if user not found
    return SHIFT_TYPES.DAY_SHIFT;
  }

  return (user.shift_type as string) || SHIFT_TYPES.DAY_SHIFT;
}

/**
 * Get attendance rules for a specific shift type
 */
export async function getAttendanceRulesForShift(
  shiftType: string,
): Promise<any | null> {
  const { data: rules, error } = await supabaseAdmin
    .from("attendance_rules")
    .select("*")
    .eq("shift_type", shiftType)
    .single();

  if (error || !rules) {
    return null;
  }

  return rules;
}

/**
 * Get effective attendance date based on shift type and current time
 * For night shift users between 00:00-04:00, use yesterday's date
 */
export function getEffectiveAttendanceDate(
  shiftType: string,
  currentTime: Date = new Date(),
): string {
  const today = formatInTimeZone(currentTime, IST_TIMEZONE, "yyyy-MM-dd");
  const currentHour = parseInt(
    formatInTimeZone(currentTime, IST_TIMEZONE, "HH"),
  );
  const currentMin = parseInt(
    formatInTimeZone(currentTime, IST_TIMEZONE, "mm"),
  );

  // For night shift, if current time is between 00:00 and 04:00, use yesterday's date
  if (shiftType === SHIFT_TYPES.NIGHT_SHIFT) {
    if (currentHour < 4 || (currentHour === 4 && currentMin === 0)) {
      const yesterday = new Date(currentTime);
      yesterday.setDate(yesterday.getDate() - 1);
      return formatInTimeZone(yesterday, IST_TIMEZONE, "yyyy-MM-dd");
    }
  }

  return today;
}

export type TodayAttendanceResponse = (AttendanceRecord & {
  sessionsCount: number;
  sessions: AttendanceRecord[];
  today: {
    totalHours: number;
    sessionsCount: number;
  };
}) | null;

export function deriveSessionStatusByHours(
  baseStatus: string,
  totalHours: number,
  rules?: any | null,
): string {
  const halfDayHours = (rules?.half_day_hours as number) || 4;
  const fullDayHours = (rules?.full_day_hours as number) || 8;

  if (totalHours < halfDayHours) return "half_day";
  if (totalHours >= fullDayHours) {
    return baseStatus === "late" ? "late" : "present";
  }
  return baseStatus;
}

export async function getLatestOpenSession(userId: string): Promise<AttendanceRow | null> {
  const { data } = await supabaseAdmin
    .from("attendance")
    .select("*")
    .eq("user_id", userId)
    .is("clock_out_time", null)
    .not("clock_in_time", "is", null)
    .order("clock_in_time", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (data as AttendanceRow | null) || null;
}

export async function closeMalformedOpenSessions(userId: string): Promise<number> {
  const { data, error } = await supabaseAdmin
    .from("attendance")
    .delete()
    .eq("user_id", userId)
    .is("clock_in_time", null)
    .select("id");

  if (error) {
    console.log(error);
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
  }

  return (data || []).length;
}

export async function closeDueOpenSessions(userId: string): Promise<number> {
  const nowISO = new Date().toISOString();
  const staleFallbackISO = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();

  // Split into two separate queries to avoid PostgREST nested and() parse error
  const [{ data: dueByLogout, error: err1 }, { data: dueByStale, error: err2 }] =
    await Promise.all([
      supabaseAdmin
        .from("attendance")
        .select("*")
        .eq("user_id", userId)
        .is("clock_out_time", null)
        .not("clock_in_time", "is", null)
        .not("auto_logout_time", "is", null)
        .lte("auto_logout_time", nowISO),
      supabaseAdmin
        .from("attendance")
        .select("*")
        .eq("user_id", userId)
        .is("clock_out_time", null)
        .not("clock_in_time", "is", null)
        .lte("clock_in_time", staleFallbackISO),
    ]);

  if (err1) throw new ApiError(ERROR_CODES.DATABASE_ERROR, err1.message);
  if (err2) throw new ApiError(ERROR_CODES.DATABASE_ERROR, err2.message);

  // Merge by id to deduplicate rows found by both queries
  const rowMap = new Map<string, any>();
  for (const r of [...(dueByLogout || []), ...(dueByStale || [])]) {
    rowMap.set(r.id, r);
  }
  const dueRows = [...rowMap.values()];

  if (dueRows.length === 0) {
    return 0;
  }

  let updatedCount = 0;
  for (const row of dueRows as any[]) {
    if (!row.clock_in_time) {
      continue;
    }
    const clockOutAt = row.auto_logout_time || nowISO;
    const workedHours = calculateWorkedHours(
      row.clock_in_time,
      clockOutAt,
      row.break_duration ?? 0,
    );
    const status = deriveSessionStatusByHours(row.status, workedHours ?? 0, null);

    const { error: updateError } = await supabaseAdmin
      .from("attendance")
      .update({
        clock_out_time: clockOutAt,
        logout_time: nowISO,
        session_status: "COMPLETED",
        logout_type: "AUTO_SHIFT",
        total_hours: workedHours,
        status,
        attendance_status: toCompatAttendanceStatus(status),
        auto_logged_out: true,
        updated_at: getCurrentTimestamp(),
      } as any)
      .eq("id", row.id);

    if (updateError) {
      throw new ApiError(ERROR_CODES.DATABASE_ERROR, updateError.message);
    }

    updatedCount += 1;
  }

  return updatedCount;
}

export async function getTodaySessions(
  userId: string,
  date: string,
): Promise<AttendanceRow[]> {
  const { data, error } = await supabaseAdmin
    .from("attendance")
    .select("*")
    .eq("user_id", userId)
    .eq("date", date)
    .order("clock_in_time", { ascending: true });

  if (error) {
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
  }

  return ((data || []) as AttendanceRow[]).filter((row) => Boolean(row.clock_in_time));
}

export function calculateDayTotalHours(rows: AttendanceRow[]): number {
  let total = 0;
  for (const row of rows) {
    const worked = calculateWorkedHours(
      row.clock_in_time,
      row.clock_out_time,
      row.break_duration ?? 0,
    );
    if (typeof worked === "number") {
      total += worked;
    } else if (typeof row.total_hours === "number") {
      total += row.total_hours;
    }
  }

  return Math.round(total * 100) / 100;
}

export type AttendanceUserContext = {
  id: string;
  shift_type: string | null;
  role: string | null;
  department_id: string | null;
  team_id: string | null;
};

export type DerivedDayAttendance = {
  date: string;
  status: string;
  totalHours: number;
  overtimeHours: number;
  hasSession: boolean;
  sessionCount: number;
  clockInTime: string | null;
  clockOutTime: string | null;
  isHoliday: boolean;
  isLeave: boolean;
  isWorkingDay: boolean;
  lateArrival: boolean;
  earlyDeparture: boolean;
};

export function toISTDate(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00+05:30`);
}

export function formatISTDate(date: Date): string {
  return formatInTimeZone(date, IST_TIMEZONE, "yyyy-MM-dd");
}

export function normalizeWeeklyOffDays(values: unknown): number[] {
  const raw = Array.isArray(values) ? values : [6, 7];
  const normalized = new Set<number>();

  for (const value of raw) {
    const n = Number(value);
    if (!Number.isFinite(n)) continue;
    if (n === 0) {
      // Legacy convention used 0 for Sunday; normalize to ISO Sunday=7.
      normalized.add(7);
      continue;
    }
    if (n >= 1 && n <= 7) {
      normalized.add(n);
    }
  }

  if (normalized.size === 0) {
    normalized.add(6);
    normalized.add(7);
  }

  return [...normalized];
}

export function getDateRangeStrings(startDate: string, endDate: string): string[] {
  const result: string[] = [];
  const start = toISTDate(startDate);
  const end = toISTDate(endDate);
  const cursor = new Date(start);

  while (cursor.getTime() <= end.getTime()) {
    result.push(formatISTDate(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  return result;
}

export function getHolidayDateString(holiday: any): string | null {
  return (holiday?.holiday_date as string | null) || (holiday?.date as string | null) || null;
}

export function isHolidayApplicableToUser(holiday: any, user: AttendanceUserContext): boolean {
  const holidayDeptId = holiday?.department_id || null;
  const holidayTeamId = holiday?.team_id || null;
  const holidayRoleRaw = (holiday?.role || holiday?.user_role || null) as string | null;
  const holidayRole = holidayRoleRaw?.toLowerCase() || null;

  if (holidayDeptId && holidayDeptId !== user.department_id) return false;
  if (holidayTeamId && holidayTeamId !== user.team_id) return false;
  if (holidayRole && user.role && holidayRole !== String(user.role).toLowerCase()) return false;

  return true;
}

export function getDayStatusFromSessions(
  rows: AttendanceRow[],
  rules: any | null,
): {
  status: string;
  totalHours: number;
  overtimeHours: number;
  clockInTime: string | null;
  clockOutTime: string | null;
  lateArrival: boolean;
  earlyDeparture: boolean;
} {
  const totalHours = calculateDayTotalHours(rows);
  const halfDayHours = Number(rules?.half_day_hours) || 4;
  const fullDayHours = Number(rules?.full_day_hours) || 8;
  const hasLate = rows.some((r) => normalizeAttendanceStatus(r.status || r.attendance_status) === "late");

  let status = "present";
  if (totalHours < halfDayHours) status = "half_day";
  else if (hasLate) status = "late";

  let earliestIn: string | null = null;
  let latestOut: string | null = null;
  for (const row of rows) {
    if (row.clock_in_time && (!earliestIn || new Date(row.clock_in_time) < new Date(earliestIn))) {
      earliestIn = row.clock_in_time;
    }
    if (row.clock_out_time && (!latestOut || new Date(row.clock_out_time) > new Date(latestOut))) {
      latestOut = row.clock_out_time;
    }
  }

  const overtimeHours = Math.max(0, Math.round((totalHours - fullDayHours) * 100) / 100);
  const workStart = rules?.work_start_time || "09:30";
  const workEnd = rules?.work_end_time || "18:30";
  const datePart = rows[0]?.date || formatInTimeZone(new Date(), IST_TIMEZONE, "yyyy-MM-dd");
  const shiftStart = earliestIn ? new Date(`${datePart}T${workStart}:00+05:30`) : null;
  const shiftEnd = latestOut ? new Date(`${datePart}T${workEnd}:00+05:30`) : null;
  const lateArrival = Boolean(earliestIn && shiftStart && new Date(earliestIn) > shiftStart);
  const earlyDeparture = Boolean(latestOut && shiftEnd && new Date(latestOut) < shiftEnd);

  return {
    status,
    totalHours,
    overtimeHours,
    clockInTime: earliestIn,
    clockOutTime: latestOut,
    lateArrival,
    earlyDeparture,
  };
}

export async function deriveAttendanceDaysForUsers(
  userIds: string[],
  startDate: string,
  endDate: string,
): Promise<Map<string, Map<string, DerivedDayAttendance>>> {
  const today = formatInTimeZone(new Date(), IST_TIMEZONE, "yyyy-MM-dd");
  const boundedEnd = endDate > today ? today : endDate;
  const allDates = getDateRangeStrings(startDate, boundedEnd);

  const result = new Map<string, Map<string, DerivedDayAttendance>>();
  if (userIds.length === 0 || allDates.length === 0) {
    return result;
  }

  const [{ data: users }, { data: rules }, { data: holidaysByHolidayDate }, { data: holidaysByDateColumn }, { data: sessions }, { data: leaves }] =
    await Promise.all([
      supabaseAdmin
        .from("users")
        .select("id, shift_type, role, department_id, team_id")
        .in("id", userIds),
      supabaseAdmin.from("attendance_rules").select("*"),
      supabaseAdmin
        .from("holidays")
        .select("*")
        .gte("holiday_date", startDate)
        .lte("holiday_date", boundedEnd),
      supabaseAdmin
        .from("holidays")
        .select("*")
        .gte("date", startDate)
        .lte("date", boundedEnd),
      supabaseAdmin
        .from("attendance")
        .select("*")
        .in("user_id", userIds)
        .not("clock_in_time", "is", null)
        .gte("date", startDate)
        .lte("date", boundedEnd),
      supabaseAdmin
        .from("leave_requests")
        .select("user_id, start_date, end_date, status")
        .in("user_id", userIds)
        .eq("status", "approved")
        .lte("start_date", boundedEnd)
        .gte("end_date", startDate),
    ]);

  const userMap = new Map<string, AttendanceUserContext>();
  for (const u of (users || []) as any[]) {
    userMap.set(u.id, {
      id: u.id,
      shift_type: u.shift_type || SHIFT_TYPES.DAY_SHIFT,
      role: u.role || null,
      department_id: u.department_id || null,
      team_id: u.team_id || null,
    });
  }

  const rulesByShift = new Map<string, any>();
  for (const rule of (rules || []) as any[]) {
    if (rule.shift_type) rulesByShift.set(rule.shift_type, rule);
  }

  const holidaysByDate = new Map<string, any[]>();
  const mergedHolidays = new Map<string, any>();
  for (const holiday of [...(holidaysByHolidayDate || []), ...(holidaysByDateColumn || [])]) {
    if (holiday?.id) {
      mergedHolidays.set(String(holiday.id), holiday);
    } else {
      const key = `${holiday?.name || ""}|${getHolidayDateString(holiday) || ""}`;
      mergedHolidays.set(key, holiday);
    }
  }

  for (const holiday of mergedHolidays.values()) {
    const date = getHolidayDateString(holiday);
    if (!date) continue;
    const list = holidaysByDate.get(date) || [];
    list.push(holiday);
    holidaysByDate.set(date, list);
  }

  const leaveDays = new Set<string>();
  for (const leave of leaves || []) {
    const start = leave.start_date as string;
    const end = leave.end_date as string;
    for (const day of getDateRangeStrings(start, end)) {
      if (day < startDate || day > boundedEnd) continue;
      leaveDays.add(`${leave.user_id}|${day}`);
    }
  }

  const sessionsByUserDate = new Map<string, AttendanceRow[]>();
  for (const s of (sessions || []) as AttendanceRow[]) {
    const key = `${s.user_id}|${s.date}`;
    const list = sessionsByUserDate.get(key) || [];
    list.push(s);
    sessionsByUserDate.set(key, list);
  }

  for (const userId of userIds) {
    const user = userMap.get(userId);
    if (!user) continue;
    const shiftRules = rulesByShift.get(user.shift_type || SHIFT_TYPES.DAY_SHIFT) || null;
    const weeklyOffDays = normalizeWeeklyOffDays(shiftRules?.weekly_off_days);

    const byDate = new Map<string, DerivedDayAttendance>();
    for (const date of allDates) {
      const dayKey = `${userId}|${date}`;
      const daySessions = sessionsByUserDate.get(dayKey) || [];
      const dayDate = toISTDate(date);
      // Use ISO day-of-week ("i"): 1=Mon, 2=Tue, …, 6=Sat, 7=Sun — locale-independent
      const dayOfWeek = parseInt(formatInTimeZone(dayDate, IST_TIMEZONE, "i"));
      const isWeekOff = weeklyOffDays.includes(dayOfWeek);
      const holidayRows = holidaysByDate.get(date) || [];
      // isHoliday only covers declared company holidays, NOT weekends
      const isHoliday = holidayRows.some((h) => isHolidayApplicableToUser(h, user));
      const isLeave = leaveDays.has(dayKey);

      if (daySessions.length > 0) {
        const sessionDerived = getDayStatusFromSessions(daySessions, shiftRules);
        byDate.set(date, {
          date,
          status: sessionDerived.status,
          totalHours: sessionDerived.totalHours,
          overtimeHours: sessionDerived.overtimeHours,
          lateArrival: sessionDerived.lateArrival,
          earlyDeparture: sessionDerived.earlyDeparture,
          hasSession: true,
          sessionCount: daySessions.length,
          clockInTime: sessionDerived.clockInTime,
          clockOutTime: sessionDerived.clockOutTime,
          isHoliday,
          isLeave,
          isWorkingDay: !isHoliday && !isLeave && !isWeekOff,
        });
        continue;
      }

      // week_off is a distinct status from holiday
      const status = isLeave ? "leave" : isWeekOff ? "week_off" : isHoliday ? "holiday" : "absent";
      byDate.set(date, {
        date,
        status,
        totalHours: 0,
        overtimeHours: 0,
        lateArrival: false,
        earlyDeparture: false,
        hasSession: false,
        sessionCount: 0,
        clockInTime: null,
        clockOutTime: null,
        isHoliday,
        isLeave,
        isWorkingDay: !isHoliday && !isLeave && !isWeekOff,
      });
    }

    result.set(userId, byDate);
  }

  return result;
}
