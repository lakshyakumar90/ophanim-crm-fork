import { supabaseAdmin } from "../config/supabase.js";
import { ApiError } from "../utils/responses.js";
import { ERROR_CODES } from "../utils/error-codes.js";
import { USER_ROLES, SHIFT_TYPES } from "../config/constants.js";
import {
  parsePaginationParams,
  calculatePaginationMeta,
  calculateOffset,
  parseSortParams,
  parseArrayParam,
  parseDateRange,
} from "../utils/pagination.js";
import { getCurrentTimestamp } from "../utils/helpers.js";
import type { PaginatedResult, AuthUser } from "../types/api.types.js";
import type {
  ClockInInput,
  ClockOutInput,
  ManualAttendanceInput,
  UpdateAttendanceInput,
  AttendanceListQuery,
  AttendanceRulesInput,
  CreateHolidayInput,
} from "../validators/attendance.validator.js";

interface AttendanceRecord {
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

interface AttendanceRow {
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

function normalizeAttendanceStatus(value: string | null | undefined): string {
  if (!value) return "present";
  const normalized = value.toLowerCase();
  if (normalized === "week_off") return "holiday";
  return normalized;
}

function toCompatAttendanceStatus(value: string | null | undefined): string {
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

function calculateWorkedHours(
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

function mapAttendanceRowToRecord(data: AttendanceRow): AttendanceRecord {
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
} from "../utils/date-utils.js";
import { formatInTimeZone } from "date-fns-tz";

const IST_TIMEZONE = "Asia/Kolkata";
const AUTO_LOGOUT_GRACE_MINUTES = 15;
const AUTO_MERGE_WINDOW_MINUTES = 2;
const DEFAULT_SHIFT_DURATION_MINUTES = 9 * 60;

function parseTimeToHHMM(value: string | null | undefined, fallback: string): string {
  const raw = (value || fallback).trim();
  const [h = "00", m = "00"] = raw.split(":");
  return `${h.padStart(2, "0")}:${m.padStart(2, "0")}`;
}

function parseMinutes(hhmm: string): number {
  const [h = "0", m = "0"] = hhmm.split(":");
  return parseInt(h, 10) * 60 + parseInt(m, 10);
}

function getShiftDateTimes(
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

  let autoLogoutAt: Date;
  if (rules?.auto_logout_time) {
    const autoLogoutHHMM = parseTimeToHHMM(
      rules.auto_logout_time,
      shiftType === SHIFT_TYPES.NIGHT_SHIFT ? "04:15" : "18:15",
    );
    const autoLogoutMinutes = parseMinutes(autoLogoutHHMM);
    const autoLogoutBase = new Date(`${effectiveDate}T${autoLogoutHHMM}:00+05:30`);
    const autoLogoutCrossesMidnight = autoLogoutMinutes <= startMinutes;
    autoLogoutAt = new Date(
      autoLogoutBase.getTime() + (autoLogoutCrossesMidnight ? 24 * 60 * 60 * 1000 : 0),
    );
  } else {
    autoLogoutAt = new Date(
      shiftEnd.getTime() + AUTO_LOGOUT_GRACE_MINUTES * 60 * 1000,
    );
  }

  return { shiftStart, shiftEnd, autoLogoutAt };
}

function evaluateClockInWindow(now: Date, shiftStart: Date): { status: string } {
  return {
    status: now > shiftStart ? "late" : "present",
  };
}

function getShiftDurationMinutes(rules?: any | null): number {
  const hoursRaw = rules?.full_day_hours;
  const hours = typeof hoursRaw === "number" ? hoursRaw : Number(hoursRaw);

  if (!Number.isFinite(hours) || hours <= 0 || hours > 24) {
    return DEFAULT_SHIFT_DURATION_MINUTES;
  }

  return Math.round(hours * 60);
}

function calculateAutoLogoutTime(
  clockInTime: Date,
  shiftDurationMinutes: number = DEFAULT_SHIFT_DURATION_MINUTES,
): Date {
  return new Date(clockInTime.getTime() + shiftDurationMinutes * 60 * 1000);
}

function calculateScheduledAutoLogoutTime(
  clockInTime: Date,
  effectiveDate: string,
  shiftType: string,
  rules?: {
    work_start_time?: string | null;
    work_end_time?: string | null;
    auto_logout_time?: string | null;
  } | null,
): Date {
  const { shiftStart, autoLogoutAt } = getShiftDateTimes(
    effectiveDate,
    shiftType,
    rules,
  );
  const lateByMs = Math.max(0, clockInTime.getTime() - shiftStart.getTime());
  return new Date(autoLogoutAt.getTime() + lateByMs);
}

/**
 * Get user's shift type
 */
async function getUserShiftType(userId: string): Promise<string> {
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
async function getAttendanceRulesForShift(
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
function getEffectiveAttendanceDate(
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

type TodayAttendanceResponse = (AttendanceRecord & {
  sessionsCount: number;
  sessions: AttendanceRecord[];
  today: {
    totalHours: number;
    sessionsCount: number;
  };
}) | null;

function deriveSessionStatusByHours(
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

async function getLatestOpenSession(userId: string): Promise<AttendanceRow | null> {
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

async function closeMalformedOpenSessions(userId: string): Promise<number> {
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

async function closeDueOpenSessions(userId: string): Promise<number> {
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

async function getTodaySessions(
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

function calculateDayTotalHours(rows: AttendanceRow[]): number {
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

type AttendanceUserContext = {
  id: string;
  shift_type: string | null;
  role: string | null;
  department_id: string | null;
  team_id: string | null;
};

type DerivedDayAttendance = {
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
};

function toISTDate(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00+05:30`);
}

function formatISTDate(date: Date): string {
  return formatInTimeZone(date, IST_TIMEZONE, "yyyy-MM-dd");
}

function normalizeWeeklyOffDays(values: unknown): number[] {
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

function getDateRangeStrings(startDate: string, endDate: string): string[] {
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

function getHolidayDateString(holiday: any): string | null {
  return (holiday?.holiday_date as string | null) || (holiday?.date as string | null) || null;
}

function isHolidayApplicableToUser(holiday: any, user: AttendanceUserContext): boolean {
  const holidayDeptId = holiday?.department_id || null;
  const holidayTeamId = holiday?.team_id || null;
  const holidayRoleRaw = (holiday?.role || holiday?.user_role || null) as string | null;
  const holidayRole = holidayRoleRaw?.toLowerCase() || null;

  if (holidayDeptId && holidayDeptId !== user.department_id) return false;
  if (holidayTeamId && holidayTeamId !== user.team_id) return false;
  if (holidayRole && user.role && holidayRole !== String(user.role).toLowerCase()) return false;

  return true;
}

function getDayStatusFromSessions(
  rows: AttendanceRow[],
  rules: any | null,
): { status: string; totalHours: number; overtimeHours: number; clockInTime: string | null; clockOutTime: string | null } {
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

  return {
    status,
    totalHours,
    overtimeHours,
    clockInTime: earliestIn,
    clockOutTime: latestOut,
  };
}

async function deriveAttendanceDaysForUsers(
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

/**
 * Clock in
 */
export async function clockIn(
  userId: string,
  input: ClockInInput,
): Promise<AttendanceRecord> {
  const now = new Date();
  const nowISO = new Date().toISOString();

  await closeMalformedOpenSessions(userId);
  await closeDueOpenSessions(userId);

  const shiftType = await getUserShiftType(userId);

  const activeSession = await getLatestOpenSession(userId);
  if (activeSession) {
    throw new ApiError(ERROR_CODES.ALREADY_EXISTS, "User already clocked in");
  }

  const effectiveDate = getEffectiveAttendanceDate(shiftType, now);
  const rules = await getAttendanceRulesForShift(shiftType);
  const { shiftStart } = getShiftDateTimes(effectiveDate, shiftType, rules);
  const { status } = evaluateClockInWindow(now, shiftStart);

  const { data: lastCompleted, error: lastCompletedError } = await supabaseAdmin
    .from("attendance")
    .select("*")
    .eq("user_id", userId)
    .not("clock_out_time", "is", null)
    .order("clock_out_time", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lastCompletedError) {
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, lastCompletedError.message);
  }

  if (lastCompleted?.clock_out_time) {
    const previousOutMs = new Date(lastCompleted.clock_out_time).getTime();
    const withinMergeWindowMs = AUTO_MERGE_WINDOW_MINUTES * 60 * 1000;
    const elapsedSinceClockOutMs = now.getTime() - previousOutMs;
    if (elapsedSinceClockOutMs >= 0 && elapsedSinceClockOutMs <= withinMergeWindowMs) {
      const resumedClockIn = lastCompleted.clock_in_time || nowISO;
      const resumedStatus = evaluateClockInWindow(
        new Date(resumedClockIn),
        shiftStart,
      ).status;
      const resumedAutoLogout =
        calculateScheduledAutoLogoutTime(
          new Date(resumedClockIn),
          effectiveDate,
          shiftType,
          rules,
        ).toISOString();

      const { data: merged, error: mergeError } = await supabaseAdmin
        .from("attendance")
        .update({
          clock_out_time: null,
          logout_time: null,
          session_status: "ACTIVE",
          logout_type: null,
          total_hours: null,
          status: resumedStatus,
          attendance_status: toCompatAttendanceStatus(resumedStatus),
          shift_end_time: resumedAutoLogout,
          auto_logout_time: resumedAutoLogout,
          auto_logged_out: false,
          updated_at: getCurrentTimestamp(),
        } as any)
        .eq("id", lastCompleted.id)
        .select("*")
        .single();

      if (mergeError || !merged) {
        console.log(mergeError)
        throw new ApiError(ERROR_CODES.DATABASE_ERROR, mergeError?.message);
      }

      await supabaseAdmin.from("user_activities").insert({
        user_id: userId,
        activity_type: "auto_merge_session",
        title: "Attendance session resumed",
        description: "Reopened previous session within merge window",
        metadata: {
          merge_window_minutes: AUTO_MERGE_WINDOW_MINUTES,
          previous_clock_out_time: lastCompleted.clock_out_time,
          resumed_clock_in_time: resumedClockIn,
          resumed_at: nowISO,
          shift_type: shiftType,
        },
        created_at: getTimestampIST(),
      });

      return mapAttendanceRowToRecord(merged as unknown as AttendanceRow);
    }
  }

  const autoLogoutAt = calculateScheduledAutoLogoutTime(
    now,
    effectiveDate,
    shiftType,
    rules,
  );
  const autoLogoutISO = autoLogoutAt.toISOString();

  const insertPayload = {
    user_id: userId,
    date: effectiveDate,
    attendance_date: effectiveDate,
    clock_in_time: nowISO,
    clock_out_time: null,
    shift_end_time: autoLogoutISO,
    auto_logout_time: autoLogoutISO,
    logout_time: null,
    session_status: "ACTIVE",
    logout_type: null,
    status,
    attendance_status: toCompatAttendanceStatus(status),
    location: input.location,
    notes: input.notes,
    break_duration: 0,
  } as any;

  let data: AttendanceRow | null = null;
  let error: any = null;

  ({ data, error } = await supabaseAdmin
    .from("attendance")
    .insert(insertPayload)
    .select("*")
    .single());

  if (error?.code === "23505") {
    const activeAfterRace = await getLatestOpenSession(userId);
    if (activeAfterRace) {
      throw new ApiError(ERROR_CODES.ALREADY_EXISTS, "User already clocked in");
    }
  }

  if (error || !data) {
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, error?.message);
  }

  await supabaseAdmin.from("user_activities").insert({
    user_id: userId,
    activity_type: "clock_in",
    title: "User clocked in",
    description: status === "late" ? "Clocked in late" : "Clocked in on time",
    metadata: {
      location: input.location,
      time: nowISO,
      status,
      shift_type: shiftType,
      shift_start_time: formatInTimeZone(
        shiftStart,
        IST_TIMEZONE,
        "yyyy-MM-dd'T'HH:mm:ssXXX",
      ),
      shift_end_time: autoLogoutISO,
      auto_logout_at: autoLogoutISO,
    },
    created_at: getTimestampIST(),
  });

  return mapAttendanceRowToRecord(data);
}

/**
 * Clock out
 */
export async function clockOut(
  userId: string,
  input: ClockOutInput,
): Promise<AttendanceRecord> {
  const nowISO = new Date().toISOString();
  const shiftType = await getUserShiftType(userId);

  await closeMalformedOpenSessions(userId);

  const existing = await getLatestOpenSession(userId);
  if (!existing || !existing.clock_in_time) {
    throw new ApiError(
      ERROR_CODES.NOT_FOUND,
      "No active clock-in session found",
    );
  }

  const clockIn = new Date(existing.clock_in_time);
  const clockOut = new Date(nowISO);
  const breakDuration = input.breakDuration || existing.break_duration || 0;
  const totalMinutes =
    (clockOut.getTime() - clockIn.getTime()) / 60000 - breakDuration;
  const totalHours = Math.round((Math.max(0, totalMinutes) / 60) * 100) / 100;

  const rules = await getAttendanceRulesForShift(shiftType);
  const status = deriveSessionStatusByHours(existing.status, totalHours, rules);

  const updateNotes = input.notes
    ? existing.notes
      ? `${existing.notes}\n${input.notes}`
      : input.notes
    : existing.notes;

  const { data, error } = await supabaseAdmin
    .from("attendance")
    .update({
      clock_out_time: nowISO,
      logout_time: nowISO,
      session_status: "COMPLETED",
      logout_type: "MANUAL",
      total_hours: totalHours,
      break_duration: breakDuration,
      status,
      attendance_status: toCompatAttendanceStatus(status),
      notes: updateNotes,
      updated_at: getCurrentTimestamp(),
    } as any)
    .eq("id", existing.id)
    .select("*")
    .single();

  if (error || !data) {
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, error?.message);
  }

  await supabaseAdmin.from("user_activities").insert({
    user_id: userId,
    activity_type: "clock_out",
    title: "User clocked out",
    description: `Worked ${totalHours} hours`,
    metadata: {
      total_hours: totalHours,
      status,
      shift_type: shiftType,
    },
    created_at: getTimestampIST(),
  });

  return mapAttendanceRowToRecord(data as unknown as AttendanceRow);
}

/**
 * Get my attendance for today (session-aware)
 */
export async function getMyTodayAttendance(
  userId: string,
): Promise<TodayAttendanceResponse> {
  const now = new Date();
  const shiftType = await getUserShiftType(userId);
  const effectiveDate = getEffectiveAttendanceDate(shiftType, now);

  let dayRows = await getTodaySessions(userId, effectiveDate);

  if (dayRows.length === 0 && shiftType === SHIFT_TYPES.NIGHT_SHIFT) {
    const today = formatInTimeZone(now, IST_TIMEZONE, "yyyy-MM-dd");
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const alternateDate =
      effectiveDate === today
        ? formatInTimeZone(yesterday, IST_TIMEZONE, "yyyy-MM-dd")
        : today;
    dayRows = await getTodaySessions(userId, alternateDate);
  }

  if (dayRows.length === 0) {
    // Determine the status for today even though there are no sessions
    const rules = await getAttendanceRulesForShift(shiftType);
    const weeklyOffDays = normalizeWeeklyOffDays(rules?.weekly_off_days);
    // Use ISO day-of-week ("i"): 1=Mon, …, 6=Sat, 7=Sun — locale-independent
    const dayOfWeek = parseInt(formatInTimeZone(new Date(effectiveDate), IST_TIMEZONE, "i"));
    const isWeekOff = weeklyOffDays.includes(dayOfWeek);

    const { data: userData } = await supabaseAdmin
      .from("users")
      .select("id, role, department_id, team_id")
      .eq("id", userId)
      .maybeSingle();

    let isHoliday = false;
    if (!isWeekOff) {
      const { data: holidays } = await supabaseAdmin
        .from("holidays")
        .select("*")
        .or(`holiday_date.eq.${effectiveDate},date.eq.${effectiveDate}`);
      if (holidays && holidays.length > 0 && userData) {
        isHoliday = holidays.some((h: any) =>
          isHolidayApplicableToUser(h, {
            id: userId,
            shift_type: shiftType,
            role: userData.role,
            department_id: userData.department_id,
            team_id: userData.team_id,
          }),
        );
      }
    }

    let isLeave = false;
    if (!isWeekOff && !isHoliday) {
      const { data: leaves } = await supabaseAdmin
        .from("leave_requests")
        .select("id")
        .eq("user_id", userId)
        .eq("status", "approved")
        .lte("start_date", effectiveDate)
        .gte("end_date", effectiveDate)
        .limit(1);
      isLeave = (leaves || []).length > 0;
    }

    const todayStatus = isLeave ? "leave" : isWeekOff ? "week_off" : isHoliday ? "holiday" : "absent";

    return {
      id: "",
      userId,
      date: effectiveDate,
      clockInTime: null,
      clockOutTime: null,
      totalHours: 0,
      breakDuration: 0,
      status: todayStatus,
      location: null,
      notes: null,
      createdAt: "",
      updatedAt: "",
      isNoSession: true,
      sessionsCount: 0,
      sessions: [],
      today: { totalHours: 0, sessionsCount: 0 },
    } as any;
  }

  const sessions = dayRows.map((row) => mapAttendanceRowToRecord(row));
  const activeRow =
    dayRows.find((row) => !row.clock_out_time) || dayRows[dayRows.length - 1];

  if (!activeRow) return null;

  const totalHours = calculateDayTotalHours(dayRows);
  const baseRecord = mapAttendanceRowToRecord(activeRow);

  return {
    ...baseRecord,
    totalHours,
    sessionsCount: sessions.length,
    sessions,
    today: {
      totalHours,
      sessionsCount: sessions.length,
    },
  };
}

export async function getMyShiftStatus(userId: string) {
  const now = new Date();

  const { data: openRecord } = await supabaseAdmin
    .from("attendance")
    .select(
      "id, date, status, clock_in_time, shift_end_time, auto_logout_time, clock_out_time, session_status",
    )
    .eq("user_id", userId)
    .is("clock_out_time", null)
    .not("clock_in_time", "is", null)
    .order("clock_in_time", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!openRecord) {
    return {
      isClockedIn: false,
      status: "Not Clocked In",
      attendanceStatus: null,
      clockInTime: null,
      autoLogoutTime: null,
      remainingMinutes: 0,
      remainingTime: "00:00:00",
    };
  }

  const clockIn = new Date(openRecord.clock_in_time);
  const autoLogout = (openRecord as any).auto_logout_time
    ? new Date((openRecord as any).auto_logout_time)
    : openRecord.shift_end_time
      ? new Date(openRecord.shift_end_time)
    : calculateAutoLogoutTime(clockIn);

  const remainingMs = Math.max(0, autoLogout.getTime() - now.getTime());
  const remainingMinutes = Math.ceil(remainingMs / 60000);
  const totalSeconds = Math.floor(remainingMs / 1000);
  const hours = Math.floor(totalSeconds / 3600)
    .toString()
    .padStart(2, "0");
  const minutes = Math.floor((totalSeconds % 3600) / 60)
    .toString()
    .padStart(2, "0");
  const seconds = Math.floor(totalSeconds % 60)
    .toString()
    .padStart(2, "0");

  return {
    isClockedIn: true,
    status: remainingMs > 0 ? "Active" : "Auto Logout Due",
    attendanceStatus: openRecord.status,
    clockInTime: openRecord.clock_in_time,
    autoLogoutTime: autoLogout.toISOString(),
    remainingMinutes,
    remainingTime: `${hours}:${minutes}:${seconds}`,
  };
}

/**
 * Get paginated attendance list
 */
export async function getAttendanceList(
  query: AttendanceListQuery,
  authUser: AuthUser,
): Promise<PaginatedResult<AttendanceRecord>> {
  const pagination = parsePaginationParams(query);
  const { sortBy, ascending } = parseSortParams(
    query,
    ["date", "clock_in_time", "status", "total_hours"],
    "date",
  );

  let baseQuery = supabaseAdmin
    .from("attendance")
    .select("*", { count: "exact" });

  // Role-based filtering
  if (authUser.role === USER_ROLES.EMPLOYEE) {
    baseQuery = baseQuery.eq("user_id", authUser.id);
  } else if (authUser.role === USER_ROLES.MANAGER && authUser.departmentId) {
    // Managers see their own attendance + all users in their department
    const { data: deptUsers } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("department_id", authUser.departmentId);

    const deptUserIds = (deptUsers || []).map(
      (u: any) => (u as { id: string }).id,
    );
    // Ensure manager's own ID is included
    if (!deptUserIds.includes(authUser.id)) {
      deptUserIds.push(authUser.id);
    }

    baseQuery = baseQuery.in("user_id", deptUserIds);
  }

  // Apply filters
  if (query.departmentId) {
    // Filter by department via team linkage
    // First find teams in department
    const { data: teams } = await supabaseAdmin
      .from("teams")
      .select("id")
      .eq("department_id", query.departmentId);

    const teamIds = (teams || []).map((t: any) => t.id);

    if (teamIds.length > 0) {
      const { data: usersInDept } = await supabaseAdmin
        .from("users")
        .select("id")
        .in("team_id", teamIds);

      const userIds = (usersInDept || []).map((u: any) => u.id);

      if (userIds.length > 0) {
        baseQuery = baseQuery.in("user_id", userIds);
      } else {
        // No users in department, return empty
        baseQuery = baseQuery.eq("id", "00000000-0000-0000-0000-000000000000");
      }
    } else {
      // No teams in department, so no users logic for now (assuming users must be in teams)
      // Or if users are not in teams but somehow in dep? No, our link is user->team->dep
      baseQuery = baseQuery.eq("id", "00000000-0000-0000-0000-000000000000");
    }
  }

  if (query.userId) {
    baseQuery = baseQuery.eq("user_id", query.userId);
  }

  if (query.status) {
    const statuses = parseArrayParam(query.status);
    if (statuses.length > 0) {
      baseQuery = baseQuery.in("status", statuses);
    }
  }

  const dateRange = parseDateRange(query);
  if (dateRange.startDate) {
    baseQuery = baseQuery.gte(
      "date",
      formatInTimeZone(dateRange.startDate, IST_TIMEZONE, "yyyy-MM-dd"),
    );
  }
  if (dateRange.endDate) {
    baseQuery = baseQuery.lte(
      "date",
      formatInTimeZone(dateRange.endDate, IST_TIMEZONE, "yyyy-MM-dd"),
    );
  }

  // Pagination and sorting
  const offset = calculateOffset(pagination);
  baseQuery = baseQuery
    .order(sortBy, { ascending })
    .range(offset, offset + pagination.limit - 1);

  const { data, error, count } = await baseQuery;

  if (error) {
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
  }

  const records = (data || []).map((a: any) =>
    mapAttendanceRowToRecord(a as unknown as AttendanceRow),
  );

  return {
    data: records,
    meta: calculatePaginationMeta(count || 0, pagination),
  };
}

/**
 * Create manual attendance (admin only)
 */
export async function createManualAttendance(
  input: ManualAttendanceInput,
): Promise<AttendanceRecord> {
  if (!input.clockInTime) {
    throw new ApiError(
      ERROR_CODES.INVALID_INPUT,
      "clockInTime is required for attendance sessions",
    );
  }

  if (["absent", "leave", "holiday"].includes(input.status)) {
    throw new ApiError(
      ERROR_CODES.INVALID_INPUT,
      "Manual attendance only supports session statuses: present, late, half_day",
    );
  }

  if (
    input.clockOutTime &&
    new Date(input.clockOutTime).getTime() < new Date(input.clockInTime).getTime()
  ) {
    throw new ApiError(
      ERROR_CODES.INVALID_INPUT,
      "clockOutTime must be greater than or equal to clockInTime",
    );
  }

  if (!input.clockOutTime) {
    const openSession = await getLatestOpenSession(input.userId);
    if (openSession) {
      throw new ApiError(ERROR_CODES.ALREADY_EXISTS, "User already clocked in");
    }
  }

  const shiftType = await getUserShiftType(input.userId);
  const rules = await getAttendanceRulesForShift(shiftType);
  const workedHours = calculateWorkedHours(
    input.clockInTime,
    input.clockOutTime ?? null,
    0,
  );
  const effectiveStatus = input.clockOutTime
    ? deriveSessionStatusByHours(input.status, workedHours ?? 0, rules)
    : input.status;

  const { data, error } = await supabaseAdmin
    .from("attendance")
    .insert({
      user_id: input.userId,
      date: input.date,
      attendance_date: input.date,
      clock_in_time: input.clockInTime,
      clock_out_time: input.clockOutTime,
      logout_time: input.clockOutTime || null,
      session_status: input.clockOutTime ? "COMPLETED" : "ACTIVE",
      logout_type: input.clockOutTime ? "MANUAL" : null,
      total_hours: workedHours,
      status: effectiveStatus,
      attendance_status: toCompatAttendanceStatus(effectiveStatus),
      notes: input.notes,
      break_duration: 0,
    })
    .select()
    .single();

  if (error) {
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
  }

  return mapAttendanceRowToRecord(data as unknown as AttendanceRow);
}

/**
 * Update attendance (admin only)
 */
export async function updateAttendance(
  attendanceId: string,
  input: UpdateAttendanceInput,
): Promise<AttendanceRecord> {
  if (
    input.status !== undefined &&
    ["absent", "leave", "holiday"].includes(input.status)
  ) {
    throw new ApiError(
      ERROR_CODES.INVALID_INPUT,
      "Attendance records only support session statuses: present, late, half_day",
    );
  }

  const { data: existing, error: existingError } = await supabaseAdmin
    .from("attendance")
    .select("*")
    .eq("id", attendanceId)
    .single();

  if (existingError || !existing) {
    throw ApiError.notFound("Attendance record");
  }

  const finalClockIn =
    input.clockInTime !== undefined ? input.clockInTime : existing.clock_in_time;
  const finalClockOut =
    input.clockOutTime !== undefined ? input.clockOutTime : existing.clock_out_time;
  const finalBreakDuration =
    input.breakDuration !== undefined
      ? input.breakDuration
      : (existing.break_duration as number | null) || 0;

  if (!finalClockIn) {
    throw new ApiError(
      ERROR_CODES.INVALID_INPUT,
      "Attendance records must have clockInTime",
    );
  }

  if (
    finalClockOut &&
    new Date(finalClockOut).getTime() < new Date(finalClockIn).getTime()
  ) {
    throw new ApiError(
      ERROR_CODES.INVALID_INPUT,
      "clockOutTime must be greater than or equal to clockInTime",
    );
  }

  if (!finalClockOut) {
    const { data: openRows, error: openError } = await supabaseAdmin
      .from("attendance")
      .select("id")
      .eq("user_id", existing.user_id)
      .is("clock_out_time", null)
      .neq("id", attendanceId)
      .not("clock_in_time", "is", null)
      .limit(1);

    if (openError) {
      throw new ApiError(ERROR_CODES.DATABASE_ERROR, openError.message);
    }
    if ((openRows || []).length > 0) {
      throw new ApiError(ERROR_CODES.ALREADY_EXISTS, "User already clocked in");
    }
  }

  const shiftType = await getUserShiftType(existing.user_id as string);
  const rules = await getAttendanceRulesForShift(shiftType);
  const baseStatus = (input.status || existing.status || "present") as string;
  const workedHours = calculateWorkedHours(
    finalClockIn,
    finalClockOut,
    finalBreakDuration,
  );
  const effectiveStatus = finalClockOut
    ? deriveSessionStatusByHours(baseStatus, workedHours ?? 0, rules)
    : baseStatus;

  const updateData: Record<string, unknown> = {};
  if (input.clockInTime !== undefined) updateData["clock_in_time"] = input.clockInTime;
  if (input.clockOutTime !== undefined) updateData["clock_out_time"] = input.clockOutTime;
  if (input.breakDuration !== undefined) updateData["break_duration"] = input.breakDuration;
  updateData["status"] = effectiveStatus;
  updateData["attendance_status"] = toCompatAttendanceStatus(effectiveStatus);
  updateData["total_hours"] = workedHours;
  updateData["session_status"] = finalClockOut ? "COMPLETED" : "ACTIVE";
  updateData["logout_time"] = finalClockOut ? finalClockOut : null;
  updateData["logout_type"] = finalClockOut
    ? existing.logout_type === "AUTO_SHIFT"
      ? "AUTO_SHIFT"
      : "MANUAL"
    : null;
  if (input.notes !== undefined) updateData["notes"] = input.notes;
  updateData["updated_at"] = getCurrentTimestamp();

  const { data, error } = await supabaseAdmin
    .from("attendance")
    .update(updateData)
    .eq("id", attendanceId)
    .select()
    .single();

  if (error) {
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
  }

  return mapAttendanceRowToRecord(data as unknown as AttendanceRow);
}

/**
 * Get attendance rules
 * Returns all shift rules or specific shift rule if shiftType provided
 */
export async function getAttendanceRules(shiftType?: string) {
  let query = supabaseAdmin.from("attendance_rules").select("*");

  if (shiftType) {
    query = query.eq("shift_type", shiftType);
  }

  const { data, error } = await query;

  if (error) {
    return null;
  }

  // If shiftType specified, return single rule, otherwise return all
  if (shiftType && data && data.length > 0) {
    return data[0];
  }

  return data || [];
}

/**
 * Update attendance rules (admin only)
 */
export async function updateAttendanceRules(input: AttendanceRulesInput) {
  const { data: existing } = await supabaseAdmin
    .from("attendance_rules")
    .select("id")
    .single();

  if (existing) {
    const { data, error } = await supabaseAdmin
      .from("attendance_rules")
      .update({
        work_start_time: input.workStartTime,
        work_end_time: input.workEndTime,
        late_threshold_minutes: input.lateThresholdMinutes,
        half_day_hours: input.halfDayHours,
        full_day_hours: input.fullDayHours,
        weekly_off_days: input.weeklyOffDays,
        updated_at: getCurrentTimestamp(),
      })
      .eq("id", existing.id)
      .select()
      .single();

    if (error) {
      throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
    }

    return data;
  } else {
    const { data, error } = await supabaseAdmin
      .from("attendance_rules")
      .insert({
        work_start_time: input.workStartTime,
        work_end_time: input.workEndTime,
        late_threshold_minutes: input.lateThresholdMinutes,
        half_day_hours: input.halfDayHours,
        full_day_hours: input.fullDayHours,
        weekly_off_days: input.weeklyOffDays,
      })
      .select()
      .single();

    if (error) {
      throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
    }

    return data;
  }
}

/**
 * Get holidays
 */
export async function getHolidays(year?: number) {
  let query = supabaseAdmin.from("holidays").select("*").order("date");

  if (year) {
    query = query.gte("date", `${year}-01-01`).lte("date", `${year}-12-31`);
  }

  const { data, error } = await query;

  if (error) {
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
  }

  return (data || []).map((holiday: any) => ({
    ...holiday,
    date: holiday.date || holiday.holiday_date,
  }));
}

/**
 * Create holiday (admin only)
 */
export async function createHoliday(input: CreateHolidayInput) {
  const { data: holidayColumns, error: holidayColumnsError } = await supabaseAdmin
    .from("information_schema.columns")
    .select("column_name")
    .eq("table_schema", "public")
    .eq("table_name", "holidays")
    .in("column_name", ["department_id", "team_id", "role", "user_role"]);

  const availableCols = new Set(
    holidayColumnsError ? [] : (holidayColumns || []).map((c: any) => c.column_name as string),
  );
  const payload: Record<string, unknown> = {
    name: input.name,
    date: input.date,
    holiday_date: input.date,
    is_optional: input.isOptional,
  };
  if (availableCols.has("department_id")) payload["department_id"] = input.departmentId || null;
  if (availableCols.has("team_id")) payload["team_id"] = input.teamId || null;
  if (availableCols.has("role")) payload["role"] = input.role || null;
  if (availableCols.has("user_role")) payload["user_role"] = input.role || null;

  const { data, error } = await supabaseAdmin
    .from("holidays")
    .insert(payload)
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new ApiError(
        ERROR_CODES.ALREADY_EXISTS,
        "Holiday already exists for this date",
      );
    }
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
  }

  return data;
}

/**
 * Delete holiday (admin only)
 */
export async function deleteHoliday(holidayId: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from("holidays")
    .delete()
    .eq("id", holidayId);

  if (error) {
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
  }
}

export async function getAttendanceSummary(
  userId: string,
  month: number,
  year: number,
) {
  const monthStr = String(month).padStart(2, "0");
  const startDate = `${year}-${monthStr}-01`;
  const daysInMonth = new Date(year, month, 0).getDate();
  const endDate = `${year}-${monthStr}-${String(daysInMonth).padStart(2, "0")}`;
  const derived = await deriveAttendanceDaysForUsers([userId], startDate, endDate);
  const dayMap = derived.get(userId) || new Map<string, DerivedDayAttendance>();

  const summary = {
    totalDays: dayMap.size,
    workingDays: 0,
    present: 0,
    late: 0,
    halfDay: 0,
    absent: 0,
    leave: 0,
    holiday: 0,
    week_off: 0,
    totalHours: 0,
  };

  for (const day of dayMap.values()) {
    if (day.isWorkingDay) summary.workingDays++;
    if (day.status === "present") summary.present++;
    if (day.status === "late") summary.late++;
    if (day.status === "half_day") summary.halfDay++;
    if (day.status === "absent") summary.absent++;
    if (day.status === "leave") summary.leave++;
    if (day.status === "holiday") summary.holiday++;
    if (day.status === "week_off") summary.week_off++;
    summary.totalHours += day.totalHours || 0;
  }

  summary.totalHours = Math.round(summary.totalHours * 100) / 100;

  return summary;
}

/**
 * Get attendance analytics for admin dashboard
 */
export async function getAttendanceAnalytics(
  startDate: string,
  endDate: string,
  departmentId?: string,
) {
  let usersQuery = supabaseAdmin
    .from("users")
    .select("id, team_id, department_id")
    .eq("is_active", true);

  if (departmentId) {
    const { data: teams } = await supabaseAdmin
      .from("teams")
      .select("id")
      .eq("department_id", departmentId);
    const teamIds = (teams || []).map((t: any) => t.id);
    if (teamIds.length > 0) {
      usersQuery = usersQuery.or(
        `department_id.eq.${departmentId},team_id.in.(${teamIds.join(",")})`,
      );
    } else {
      usersQuery = usersQuery.eq("department_id", departmentId);
    }
  }

  const { data: users, error: usersError } = await usersQuery;
  if (usersError) {
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, usersError.message);
  }
  const userIds = (users || []).map((u: any) => u.id as string);
  const totalUsers = userIds.length;

  const analytics = {
    totalUsers: totalUsers || 0,
    present: 0,
    late: 0,
    halfDay: 0,
    half_day: 0,
    absent: 0,
    leave: 0,
    holiday: 0,
    week_off: 0,
    totalRecords: 0,
    workingDays: 0,
    totalHours: 0,
    avgHours: 0,
    attendanceRate: 0,
    punctualityRate: 0,
  };

  if (userIds.length === 0) {
    return analytics;
  }

  const derived = await deriveAttendanceDaysForUsers(userIds, startDate, endDate);

  for (const byDate of derived.values()) {
    for (const day of byDate.values()) {
      analytics.totalRecords += 1;
      if (day.isWorkingDay) analytics.workingDays += 1;
      if (day.status === "present") analytics.present++;
      if (day.status === "late") analytics.late++;
      if (day.status === "half_day") analytics.halfDay++;
      if (day.status === "absent") analytics.absent++;
      if (day.status === "leave") analytics.leave++;
      if (day.status === "holiday") analytics.holiday++;
      if (day.status === "week_off") analytics.week_off++;
      analytics.totalHours += day.totalHours || 0;
    }
  }
  analytics.half_day = analytics.halfDay;

  if (analytics.totalRecords > 0) {
    analytics.avgHours =
      Math.round((analytics.totalHours / analytics.totalRecords) * 100) / 100;
    analytics.attendanceRate =
      analytics.workingDays > 0
        ? Math.round(
            ((analytics.present + analytics.late + analytics.halfDay) /
              analytics.workingDays) *
              100,
          )
        : 0;
    analytics.punctualityRate =
      Math.round(
        (analytics.present / (analytics.present + analytics.late)) * 100,
      ) || 0;
  }

  analytics.totalHours = Math.round(analytics.totalHours * 100) / 100;

  return analytics;
}

/**
 * Get all users attendance for a specific date (admin only)
 */
export async function getAllUsersAttendance(
  date: string,
  departmentId?: string,
) {
  // Get all active users with their attendance for the date
  let usersQuery = supabaseAdmin
    .from("users")
    .select("id, full_name, email, role, avatar_url, shift_type")
    .eq("is_active", true)
    .order("full_name");

  if (departmentId) {
    const { data: teams } = await supabaseAdmin
      .from("teams")
      .select("id")
      .eq("department_id", departmentId);
    const teamIds = (teams || []).map((t: any) => t.id);
    if (teamIds.length > 0) {
      usersQuery = usersQuery.in("team_id", teamIds);
    } else {
      usersQuery = usersQuery.eq("id", "00000000-0000-0000-0000-000000000000");
    }
  }

  const { data: users, error: usersError } = await usersQuery;

  if (usersError) {
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, usersError.message);
  }

  const { data: attendanceData, error: attendanceError } = await supabaseAdmin
    .from("attendance")
    .select("*")
    .eq("date", date)
    .not("clock_in_time", "is", null);

  if (attendanceError) {
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, attendanceError.message);
  }
  const sessionRows = (attendanceData || []) as AttendanceRow[];
  const userIds = (users || []).map((u: any) => u.id as string);
  const derived = await deriveAttendanceDaysForUsers(userIds, date, date);
  const sessionsByUser = new Map<string, AttendanceRow[]>();
  for (const row of sessionRows) {
    const list = sessionsByUser.get(row.user_id) || [];
    list.push(row);
    sessionsByUser.set(row.user_id, list);
  }
  for (const list of sessionsByUser.values()) {
    list.sort((a, b) => {
      const aTime = a.clock_in_time ? new Date(a.clock_in_time).getTime() : 0;
      const bTime = b.clock_in_time ? new Date(b.clock_in_time).getTime() : 0;
      return aTime - bTime;
    });
  }

  // Create a map of user attendance
  // Priority: active session > record for requested date > latest clock_in_time
  const attendanceMap = new Map<string, AttendanceRow>();
  for (const r of sessionRows) {
    const userId = r.user_id;
    const existing = attendanceMap.get(userId);
    if (!existing) {
      attendanceMap.set(userId, r);
      continue;
    }

    const existingIsActive = !existing.clock_out_time;
    const currentIsActive = !r.clock_out_time;

    if (currentIsActive && !existingIsActive) {
      attendanceMap.set(userId, r);
      continue;
    }

    if (currentIsActive === existingIsActive) {
      if (r.date === date && existing.date !== date) {
        attendanceMap.set(userId, r);
        continue;
      }
      const existingClockIn = existing.clock_in_time
        ? new Date(existing.clock_in_time).getTime()
        : 0;
      const currentClockIn = r.clock_in_time ? new Date(r.clock_in_time).getTime() : 0;
      if (currentClockIn > existingClockIn) {
        attendanceMap.set(userId, r);
      }
    }
  }

  // Combine users with their attendance
  const result = (users || []).map((user: any) => {
    const derivedDay = derived.get(user.id)?.get(date);
    const userSessions = sessionsByUser.get(user.id) || [];
    const source = attendanceMap.get(user.id);
    let attendance = source ? mapAttendanceRowToRecord(source) : null;
    const firstClockIn = userSessions[0]?.clock_in_time || derivedDay?.clockInTime || null;
    const lastClockOut =
      [...userSessions]
        .reverse()
        .find((s) => Boolean(s.clock_out_time))
        ?.clock_out_time || derivedDay?.clockOutTime || null;

    if (attendance) {
      attendance = {
        ...attendance,
        status: derivedDay?.status || attendance.status,
        totalHours:
          typeof derivedDay?.totalHours === "number"
            ? derivedDay.totalHours
            : attendance.totalHours,
        clockInTime: firstClockIn,
        clockOutTime: lastClockOut,
        sessionsCount: userSessions.length,
        sessions: userSessions.map((s) => mapAttendanceRowToRecord(s)),
      } as AttendanceRecord & {
        sessionsCount: number;
        sessions: AttendanceRecord[];
      };
    } else if (userSessions.length > 0) {
      const first = mapAttendanceRowToRecord(userSessions[0]!);
      attendance = {
        ...first,
        status: derivedDay?.status || first.status,
        totalHours:
          typeof derivedDay?.totalHours === "number"
            ? derivedDay.totalHours
            : calculateDayTotalHours(userSessions),
        clockInTime: firstClockIn,
        clockOutTime: lastClockOut,
        sessionsCount: userSessions.length,
        sessions: userSessions.map((s) => mapAttendanceRowToRecord(s)),
      } as AttendanceRecord & {
        sessionsCount: number;
        sessions: AttendanceRecord[];
      };
    }
    return {
      user: {
        id: user.id,
        fullName: user.full_name,
        email: user.email,
        role: user.role,
        avatarUrl: user.avatar_url,
        shiftType: user.shift_type || null,
      },
      attendance: attendance || null,
      status: derivedDay?.status || "absent",
    };
  });

  return result;
}

/**
 * Get user attendance history (for detail view)
 */
export async function getUserAttendanceHistory(
  userId: string,
  startDate: string,
  endDate: string,
) {
  const { data, error } = await supabaseAdmin
    .from("attendance")
    .select("*")
    .eq("user_id", userId)
    .gte("date", startDate)
    .lte("date", endDate)
    .order("date", { ascending: false });

  if (error) {
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
  }

  const records = (data || [])
    .filter((a: any) => Boolean(a.clock_in_time))
    .map((a: any) => {
    const mapped = mapAttendanceRowToRecord(a as AttendanceRow);
    const recalculatedHours = calculateWorkedHours(
      mapped.clockInTime,
      mapped.clockOutTime,
      mapped.breakDuration,
    );
    return {
      ...mapped,
      totalHours: recalculatedHours ?? mapped.totalHours,
    };
  });
  const derived = await deriveAttendanceDaysForUsers([userId], startDate, endDate);
  const dayMap = derived.get(userId) || new Map<string, DerivedDayAttendance>();

  const groupedDailyMap = new Map<
    string,
    {
      date: string;
      status: string;
      totalHours: number;
      firstClockIn: string | null;
      lastClockOut: string | null;
      location: string | null;
      sessionsCount: number;
      sessions: Array<{
        id: string;
        clockInTime: string | null;
        clockOutTime: string | null;
        totalHours: number | null;
        location: string | null;
        status: string;
      }>;
    }
  >();

  for (const record of records) {
    const existing = groupedDailyMap.get(record.date) || {
      date: record.date,
      status: "absent",
      totalHours: 0,
      firstClockIn: null as string | null,
      lastClockOut: null as string | null,
      location: null as string | null,
      sessionsCount: 0,
      sessions: [],
    };

    existing.sessionsCount += 1;
    existing.totalHours =
      Math.round((existing.totalHours + (record.totalHours || 0)) * 100) / 100;

    if (
      record.clockInTime &&
      (!existing.firstClockIn || new Date(record.clockInTime) < new Date(existing.firstClockIn))
    ) {
      existing.firstClockIn = record.clockInTime;
    }

    if (
      record.clockOutTime &&
      (!existing.lastClockOut || new Date(record.clockOutTime) > new Date(existing.lastClockOut))
    ) {
      existing.lastClockOut = record.clockOutTime;
    }

    if (!existing.location && record.location) {
      existing.location = record.location;
    } else if (
      existing.location &&
      record.location &&
      existing.location !== record.location
    ) {
      existing.location = "Multiple";
    }

    existing.sessions.push({
      id: record.id,
      clockInTime: record.clockInTime,
      clockOutTime: record.clockOutTime,
      totalHours: record.totalHours,
      location: record.location,
      status: record.status,
    });

    groupedDailyMap.set(record.date, existing);
  }

  const daily = Array.from(groupedDailyMap.values())
    .map((day) => ({
      ...day,
      status: dayMap.get(day.date)?.status || day.status,
      totalHours: Math.round(day.totalHours * 100) / 100,
      sessions: day.sessions.sort((a, b) => {
        const aTime = a.clockInTime ? new Date(a.clockInTime).getTime() : 0;
        const bTime = b.clockInTime ? new Date(b.clockInTime).getTime() : 0;
        return aTime - bTime;
      }),
    }))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Calculate summary for the period by distinct attendance date
  const summary = {
    totalDays: dayMap.size,
    workingDays: 0,
    present: 0,
    late: 0,
    halfDay: 0,
    absent: 0,
    leave: 0,
    holiday: 0,
    totalHours: 0,
    avgHours: 0,
  };

  for (const day of dayMap.values()) {
    if (day.isWorkingDay) summary.workingDays++;
    if (day.status === "present") summary.present++;
    if (day.status === "late") summary.late++;
    if (day.status === "half_day") summary.halfDay++;
    if (day.status === "absent") summary.absent++;
    if (day.status === "leave") summary.leave++;
    if (day.status === "holiday") summary.holiday++;
    summary.totalHours += day.totalHours || 0;
  }

  if (summary.totalDays > 0) {
    summary.avgHours =
      Math.round((summary.totalHours / summary.totalDays) * 100) / 100;
  }
  summary.totalHours = Math.round(summary.totalHours * 100) / 100;

  return { records, daily, summary };
}

/**
 * Admin clock in for any user (bypasses restrictions)
 * If record exists for today, it resets the clock-in time and clears clock-out
 */
export async function restoreAttendanceByAdmin(
  attendanceId: string,
  adminId: string,
): Promise<AttendanceRecord> {
  const nowISO = getTimestampIST();

  const { data: attendance, error: findError } = await supabaseAdmin
    .from("attendance")
    .select("*")
    .eq("id", attendanceId)
    .single();

  if (findError || !attendance) {
    throw ApiError.notFound("Attendance record");
  }

  const autoLogoutTime = (attendance as any).auto_logout_time;
  if (!autoLogoutTime) {
    throw new ApiError(
      ERROR_CODES.INVALID_INPUT,
      "Attendance record has no auto logout time",
    );
  }

  if (new Date(nowISO).getTime() >= new Date(autoLogoutTime).getTime()) {
    throw new ApiError(
      ERROR_CODES.INVALID_INPUT,
      "Shift already completed. Restore is not allowed.",
    );
  }

  if ((attendance as any).session_status !== "COMPLETED") {
    throw new ApiError(
      ERROR_CODES.INVALID_INPUT,
      "Only completed attendance can be restored",
    );
  }

  const { data, error } = await supabaseAdmin
    .from("attendance")
    .update({
      session_status: "ACTIVE",
      logout_time: null,
      clock_out_time: null,
      total_hours: null,
      logout_type: null,
      restored_by_admin_id: adminId,
      restored_at: nowISO,
      updated_at: getCurrentTimestamp(),
    } as any)
    .eq("id", attendanceId)
    .select()
    .single();

  if (error || !data) {
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, error?.message);
  }

  return mapAttendanceRowToRecord(data as unknown as AttendanceRow);
}

/**
 * Get weekly hours for a user
 * Returns an array of 7 days (Mon-Sun) with hours worked and weekend indicator
 */
export async function getWeeklyHours(userId: string, weekStartDate: string) {
  // weekStartDate should be a Monday in YYYY-MM-DD format
  const startDate = new Date(`${weekStartDate}T00:00:00+05:30`);
  const weekStartDateStr = formatInTimeZone(startDate, IST_TIMEZONE, "yyyy-MM-dd");

  // Generate all 7 days of the week
  const days: Array<{
    day: string;
    date: string;
    hours: number;
    isWeekend: boolean;
    clockInTime: string | null;
    clockOutTime: string | null;
  }> = [];
  const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  for (let i = 0; i < 7; i++) {
    const currentDate = new Date(startDate);
    currentDate.setDate(startDate.getDate() + i);
    const dateStr = formatInTimeZone(currentDate, IST_TIMEZONE, "yyyy-MM-dd");

    days.push({
      day: dayNames[i]!,
      date: dateStr,
      hours: 0,
      isWeekend: i >= 5, // Saturday (5) and Sunday (6)
      clockInTime: null as string | null,
      clockOutTime: null as string | null,
    });
  }
  const dayByDate = new Map(days.map((d) => [d.date, d]));

  // Fetch attendance records for the week
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 6);
  const endDateStr = formatInTimeZone(endDate, IST_TIMEZONE, "yyyy-MM-dd");

  const { data, error } = await supabaseAdmin
    .from("attendance")
    .select("date, total_hours, clock_in_time, clock_out_time, break_duration")
    .eq("user_id", userId)
    .gte("date", weekStartDateStr)
    .lte("date", endDateStr);

  if (error) {
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
  }

  // Map hours to corresponding days
  type AttendanceWeekRow = {
    date: string;
    total_hours: number | null;
    clock_in_time: string | null;
    clock_out_time: string | null;
    break_duration: number | null;
  };

  for (const record of data || []) {
    const r = record as AttendanceWeekRow;
    const day = dayByDate.get(r.date);
    if (day) {
      const recalculatedHours = calculateWorkedHours(
        r.clock_in_time,
        r.clock_out_time,
        r.break_duration ?? 0,
      );
      if (r.clock_in_time) {
        if (!day.clockInTime || new Date(r.clock_in_time) < new Date(day.clockInTime)) {
          day.clockInTime = r.clock_in_time;
        }
      }
      if (r.clock_out_time) {
        if (!day.clockOutTime || new Date(r.clock_out_time) > new Date(day.clockOutTime)) {
          day.clockOutTime = r.clock_out_time;
        }
      }
      if (typeof recalculatedHours === "number") {
        day.hours = Math.round((day.hours + recalculatedHours) * 100) / 100;
      } else if (typeof r.total_hours === "number") {
        day.hours = Math.round((day.hours + r.total_hours) * 100) / 100;
      }
    }
  }

  return days;
}

/**
 * Auto-logout users who forgot to clock out at the end of their shift
 * Called by cron job every 5 minutes
 */
export async function bulkAutoLogoutDueSessions(): Promise<number> {
  const { data, error } = await supabaseAdmin.rpc(
    "bulk_auto_logout_due_attendance",
  );

  if (error) {
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
  }

  if (typeof data === "number") {
    return data;
  }

  return 0;
}
