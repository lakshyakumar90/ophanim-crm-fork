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
  clock_in_time: string | null;
  clock_out_time: string | null;
  total_hours: number | null;
  break_duration: number;
  status: string;
  location: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

function mapAttendanceRowToRecord(data: AttendanceRow): AttendanceRecord {
  return {
    id: data.id,
    userId: data.user_id,
    date: data.date,
    clockInTime: data.clock_in_time,
    clockOutTime: data.clock_out_time,
    totalHours: data.total_hours,
    breakDuration: data.break_duration,
    status: data.status,
    location: data.location,
    notes: data.notes,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

import {
  getTodayIST,
  getTimestampIST,
  getStartOfMonthIST,
  getEndOfMonthIST,
} from "../utils/date-utils.js";
import { formatInTimeZone } from "date-fns-tz";

const IST_TIMEZONE = "Asia/Kolkata";
const AUTO_LOGOUT_GRACE_MINUTES = 15;
const CLOCK_IN_EARLY_WINDOW_MINUTES = 15;
const CLOCK_IN_LATE_WINDOW_MINUTES = 120;
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
  const autoLogoutAt = new Date(
    shiftEnd.getTime() + AUTO_LOGOUT_GRACE_MINUTES * 60 * 1000,
  );
  return { shiftStart, shiftEnd, autoLogoutAt };
}

function evaluateClockInWindow(now: Date, shiftStart: Date): { status: string } {
  const allowedFrom = new Date(
    shiftStart.getTime() - CLOCK_IN_EARLY_WINDOW_MINUTES * 60 * 1000,
  );
  const allowedUntil = new Date(
    shiftStart.getTime() + CLOCK_IN_LATE_WINDOW_MINUTES * 60 * 1000,
  );

  if (now < allowedFrom || now > allowedUntil) {
    const allowedFromLabel = formatInTimeZone(
      allowedFrom,
      IST_TIMEZONE,
      "yyyy-MM-dd HH:mm",
    );
    const allowedUntilLabel = formatInTimeZone(
      allowedUntil,
      IST_TIMEZONE,
      "yyyy-MM-dd HH:mm",
    );

    throw new ApiError(
      ERROR_CODES.INVALID_INPUT,
      `Clock-in is allowed only between ${allowedFromLabel} and ${allowedUntilLabel} IST`,
    );
  }

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

/**
 * Get today's date string in IST
 */
function getTodayDateString(): string {
  return getTodayIST();
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

/**
 * Clock in
 */
export async function clockIn(
  userId: string,
  input: ClockInInput,
): Promise<AttendanceRecord> {
  const now = new Date();
  const nowISO = getTimestampIST();

  // Get user's shift type
  const shiftType = await getUserShiftType(userId);

  // Guard: user cannot start a new session while one is active
  const { data: activeSession } = await supabaseAdmin
    .from("attendance")
    .select("id")
    .eq("user_id", userId)
    .eq("session_status", "ACTIVE")
    .maybeSingle();

  if (activeSession) {
    throw new ApiError(
      ERROR_CODES.ALREADY_EXISTS,
      "Active attendance session already exists",
    );
  }

  // Get effective attendance date (yesterday for night shift if between 00:00-04:15)
  const effectiveDate = getEffectiveAttendanceDate(shiftType, now);

  // Check if already clocked in for this effective date
  const { data: existing } = await supabaseAdmin
    .from("attendance")
    .select("*")
    .eq("user_id", userId)
    .eq("date", effectiveDate)
    .single();

  if (existing) {
    throw new ApiError(
      ERROR_CODES.ALREADY_EXISTS,
      "Already clocked in for this shift",
    );
  }

  // Get attendance rules for this shift type
  const rules = await getAttendanceRulesForShift(shiftType);
  const { shiftStart } = getShiftDateTimes(
    effectiveDate,
    shiftType,
    rules,
  );

  const { status } = evaluateClockInWindow(now, shiftStart);

  const autoLogoutAt = calculateAutoLogoutTime(
    now,
    getShiftDurationMinutes(rules),
  );
  const autoLogoutISO = autoLogoutAt.toISOString();

  const { data, error } = await supabaseAdmin
    .from("attendance")
    .insert({
      user_id: userId,
      date: effectiveDate,
      clock_in_time: nowISO,
      shift_end_time: autoLogoutISO,
      auto_logout_time: autoLogoutISO,
      logout_time: null,
      session_status: "ACTIVE",
      logout_type: null,
      status,
      location: input.location,
      notes: input.notes,
      break_duration: 0,
    } as any)
    .select()
    .single();

  if (error) {
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
  }

  // Log activity
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

  return mapAttendanceRowToRecord(data as unknown as AttendanceRow);
}

/**
 * Clock out
 * For night shifts crossing midnight, checks yesterday's record if in early morning hours
 */
export async function clockOut(
  userId: string,
  input: ClockOutInput,
): Promise<AttendanceRecord> {
  const now = new Date();
  const nowISO = getTimestampIST();

  // Get user's shift type
  const shiftType = await getUserShiftType(userId);

  // Get effective attendance date (yesterday for night shift if between 00:00-04:15)
  const effectiveDate = getEffectiveAttendanceDate(shiftType, now);

  // Try to get attendance record for effective date
  let { data: existing } = await supabaseAdmin
    .from("attendance")
    .select("*")
    .eq("user_id", userId)
    .eq("date", effectiveDate)
    .eq("session_status", "ACTIVE")
    .single();

  // For night shift, always check the alternate date as fallback
  // This handles edge cases: clocking out after 4:15 AM, or records created on adjacent dates
  if (!existing && shiftType === SHIFT_TYPES.NIGHT_SHIFT) {
    const today = formatInTimeZone(now, IST_TIMEZONE, "yyyy-MM-dd");
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = formatInTimeZone(
      yesterday,
      IST_TIMEZONE,
      "yyyy-MM-dd",
    );

    // Check the other date (whichever we didn't already check)
    const alternateDate = effectiveDate === today ? yesterdayStr : today;
    const { data: altRecord } = await supabaseAdmin
      .from("attendance")
      .select("*")
      .eq("user_id", userId)
      .eq("date", alternateDate)
      .eq("session_status", "ACTIVE")
      .single();
    if (altRecord) {
      existing = altRecord;
    }
  }

  // Last resort: find ANY open clock-in record for this user (regardless of date)
  if (!existing) {
    const { data: anyOpen } = await supabaseAdmin
      .from("attendance")
      .select("*")
      .eq("user_id", userId)
      .eq("session_status", "ACTIVE")
      .order("clock_in_time", { ascending: false })
      .limit(1)
      .single();
    if (anyOpen) {
      existing = anyOpen;
    }
  }

  if (!existing) {
    throw ApiError.notFound("Clock-in record for this shift");
  }

  if (existing.clock_out_time) {
    throw new ApiError(
      ERROR_CODES.ALREADY_EXISTS,
      "Already clocked out for this shift",
    );
  }

  // Calculate total hours
  const clockIn = new Date(existing.clock_in_time);
  const clockOut = new Date(nowISO);
  const breakDuration = input.breakDuration || existing.break_duration || 0;
  const totalMinutes =
    (clockOut.getTime() - clockIn.getTime()) / 60000 - breakDuration;
  const totalHours = Math.round((totalMinutes / 60) * 100) / 100;

  // Get attendance rules for this shift type to determine final status
  const rules = await getAttendanceRulesForShift(shiftType);

  // Determine final status
  let status = existing.status;
  if (rules) {
    const halfDayHours = (rules.half_day_hours as number) || 4;
    const fullDayHours = (rules.full_day_hours as number) || 8;

    if (totalHours < halfDayHours) {
      status = "half_day";
    } else if (totalHours >= fullDayHours) {
      status = existing.status === "late" ? "late" : "present";
    }
  }

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
      notes: updateNotes,
      updated_at: getCurrentTimestamp(),
    } as any)
    .eq("id", existing.id)
    .select()
    .single();

  if (error) {
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
  }

  // Log activity
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
 * Get my attendance for today
 * For night shifts crossing midnight (e.g., 7pm-4am), also checks yesterday's record
 * if current time is before shift end time and no today record exists
 */
export async function getMyTodayAttendance(
  userId: string,
): Promise<AttendanceRecord | null> {
  const now = new Date();

  // Get user's shift type
  const shiftType = await getUserShiftType(userId);

  // Get effective attendance date (yesterday for night shift if between 00:00-04:15)
  const effectiveDate = getEffectiveAttendanceDate(shiftType, now);

  // Try to get attendance record for effective date
  const { data: attendanceData } = await supabaseAdmin
    .from("attendance")
    .select("*")
    .eq("user_id", userId)
    .eq("date", effectiveDate)
    .single();

  if (attendanceData) {
    return mapAttendanceRowToRecord(attendanceData as unknown as AttendanceRow);
  }

  // For night shift, check alternate date only for an active session.
  // This prevents yesterday's completed record from appearing as today's attendance.
  if (shiftType === SHIFT_TYPES.NIGHT_SHIFT) {
    const today = formatInTimeZone(now, IST_TIMEZONE, "yyyy-MM-dd");
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = formatInTimeZone(
      yesterday,
      IST_TIMEZONE,
      "yyyy-MM-dd",
    );

    const alternateDate = effectiveDate === today ? yesterdayStr : today;
    const { data: altData } = await supabaseAdmin
      .from("attendance")
      .select("*")
      .eq("user_id", userId)
      .eq("date", alternateDate)
      .or("session_status.eq.ACTIVE,clock_out_time.is.null")
      .single();

    if (altData) {
      return mapAttendanceRowToRecord(altData as unknown as AttendanceRow);
    }
  }

  return null;
}

export async function getMyShiftStatus(userId: string) {
  const now = new Date();

  const { data: openRecord } = await supabaseAdmin
    .from("attendance")
    .select(
      "id, date, status, clock_in_time, shift_end_time, auto_logout_time, clock_out_time, session_status",
    )
    .eq("user_id", userId)
    .eq("session_status", "ACTIVE")
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
      dateRange.startDate.toISOString().split("T")[0],
    );
  }
  if (dateRange.endDate) {
    baseQuery = baseQuery.lte(
      "date",
      dateRange.endDate.toISOString().split("T")[0],
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
  // Check if record exists
  const { data: existing } = await supabaseAdmin
    .from("attendance")
    .select("id")
    .eq("user_id", input.userId)
    .eq("date", input.date)
    .single();

  if (existing) {
    throw new ApiError(
      ERROR_CODES.ALREADY_EXISTS,
      "Attendance record already exists for this date",
    );
  }

  const { data, error } = await supabaseAdmin
    .from("attendance")
    .insert({
      user_id: input.userId,
      date: input.date,
      clock_in_time: input.clockInTime,
      clock_out_time: input.clockOutTime,
      status: input.status,
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
  const updateData: Record<string, unknown> = {};

  if (input.clockInTime !== undefined)
    updateData["clock_in_time"] = input.clockInTime;
  if (input.clockOutTime !== undefined)
    updateData["clock_out_time"] = input.clockOutTime;
  if (input.breakDuration !== undefined)
    updateData["break_duration"] = input.breakDuration;
  if (input.status !== undefined) updateData["status"] = input.status;
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

  if (!data) {
    throw ApiError.notFound("Attendance record");
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

  return data || [];
}

/**
 * Create holiday (admin only)
 */
export async function createHoliday(input: CreateHolidayInput) {
  const { data, error } = await supabaseAdmin
    .from("holidays")
    .insert({
      name: input.name,
      date: input.date,
      is_optional: input.isOptional,
    })
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
  const startDate = getStartOfMonthIST(year, month);
  const endDate = getEndOfMonthIST(year, month);

  const { data, error } = await supabaseAdmin
    .from("attendance")
    .select("status, total_hours")
    .eq("user_id", userId)
    .gte("date", startDate)
    .lte("date", endDate);

  if (error) {
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
  }

  const summary = {
    totalDays: data?.length || 0,
    present: 0,
    late: 0,
    halfDay: 0,
    absent: 0,
    leave: 0,
    totalHours: 0,
  };

  for (const record of data || []) {
    const r = record as { status: string; total_hours: number | null };
    if (r.status === "present") summary.present++;
    if (r.status === "late") summary.late++;
    if (r.status === "half_day") summary.halfDay++;
    if (r.status === "absent") summary.absent++;
    if (r.status === "leave") summary.leave++;
    if (r.total_hours) summary.totalHours += r.total_hours;
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
  // Get all attendance records for the period
  // Get all attendance records for the period
  let attendanceQuery = supabaseAdmin
    .from("attendance")
    .select("status, total_hours, date, user_id")
    .gte("date", startDate)
    .lte("date", endDate);

  let totalUsersQuery = supabaseAdmin
    .from("users")
    .select("id", { count: "exact" })
    .eq("is_active", true);

  if (departmentId) {
    const { data: teams } = await supabaseAdmin
      .from("teams")
      .select("id")
      .eq("department_id", departmentId);

    const teamIds = (teams || []).map((t: any) => t.id);

    if (teamIds.length > 0) {
      const { data: usersInDept } = await supabaseAdmin
        .from("users")
        .select("id")
        .in("team_id", teamIds);

      const userIds = (usersInDept || []).map((u: any) => u.id);

      if (userIds.length > 0) {
        attendanceQuery = attendanceQuery.in("user_id", userIds);
        totalUsersQuery = totalUsersQuery.in("id", userIds); // Filter active users too
      } else {
        attendanceQuery = attendanceQuery.eq(
          "id",
          "00000000-0000-0000-0000-000000000000",
        );
        totalUsersQuery = totalUsersQuery.eq(
          "id",
          "00000000-0000-0000-0000-000000000000",
        );
      }
    } else {
      attendanceQuery = attendanceQuery.eq(
        "id",
        "00000000-0000-0000-0000-000000000000",
      );
      totalUsersQuery = totalUsersQuery.eq(
        "id",
        "00000000-0000-0000-0000-000000000000",
      );
    }
  }

  const { data: attendanceData, error: attendanceError } =
    await attendanceQuery;

  if (attendanceError) {
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, attendanceError.message);
  }

  // Get total active users
  const { count: totalUsers } = await totalUsersQuery;

  const analytics = {
    totalUsers: totalUsers || 0,
    present: 0,
    late: 0,
    halfDay: 0,
    absent: 0,
    leave: 0,
    totalRecords: attendanceData?.length || 0,
    totalHours: 0,
    avgHours: 0,
    attendanceRate: 0,
    punctualityRate: 0,
  };

  for (const record of attendanceData || []) {
    const r = record as { status: string; total_hours: number | null };
    if (r.status === "present") analytics.present++;
    if (r.status === "late") analytics.late++;
    if (r.status === "half_day") analytics.halfDay++;
    if (r.status === "absent") analytics.absent++;
    if (r.status === "leave") analytics.leave++;
    if (r.total_hours) analytics.totalHours += r.total_hours;
  }

  if (analytics.totalRecords > 0) {
    analytics.avgHours =
      Math.round((analytics.totalHours / analytics.totalRecords) * 100) / 100;
    analytics.attendanceRate = Math.round(
      ((analytics.present + analytics.late + analytics.halfDay) /
        analytics.totalRecords) *
        100,
    );
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

  // For night shift users, we need to check both today and yesterday
  // because their effective date might be yesterday if they clocked in between 00:00-04:15
  const now = new Date();
  const currentHour = parseInt(formatInTimeZone(now, IST_TIMEZONE, "HH"));
  const currentMin = parseInt(formatInTimeZone(now, IST_TIMEZONE, "mm"));
  const isEarlyMorning =
    currentHour < 4 || (currentHour === 4 && currentMin <= 15);

  // Calculate yesterday's date
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = formatInTimeZone(yesterday, IST_TIMEZONE, "yyyy-MM-dd");

  // Get night shift user IDs
  const nightShiftUserIds = (users || [])
    .filter((u: any) => u.shift_type === SHIFT_TYPES.NIGHT_SHIFT)
    .map((u: any) => u.id);

  // Get attendance for the date and yesterday (for night shift users)
  const datesToCheck = [date];
  if (isEarlyMorning && nightShiftUserIds.length > 0) {
    datesToCheck.push(yesterdayStr);
  }

  const { data: attendanceData, error: attendanceError } = await supabaseAdmin
    .from("attendance")
    .select("*")
    .in("date", datesToCheck);

  if (attendanceError) {
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, attendanceError.message);
  }

  // Create a map of user attendance
  // For night shift users, prefer today's record, but fall back to yesterday if needed
  const attendanceMap = new Map();
  for (const record of attendanceData || []) {
    const r = record as AttendanceRow;
    const userId = r.user_id;

    // If user already has attendance mapped, prefer the one for the requested date
    if (attendanceMap.has(userId)) {
      const existing = attendanceMap.get(userId);
      if (r.date === date) {
        attendanceMap.set(userId, mapAttendanceRowToRecord(r));
      }
    } else {
      attendanceMap.set(userId, mapAttendanceRowToRecord(r));
    }
  }

  // Combine users with their attendance
  const result = (users || []).map((user: any) => {
    const attendance = attendanceMap.get(user.id);
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
      status: attendance?.status || "absent",
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

  const records = (data || []).map((a: any) =>
    mapAttendanceRowToRecord(a as AttendanceRow),
  );

  // Calculate summary for the period
  const summary = {
    totalDays: records.length,
    present: 0,
    late: 0,
    halfDay: 0,
    absent: 0,
    leave: 0,
    totalHours: 0,
    avgHours: 0,
  };

  for (const record of records) {
    if (record.status === "present") summary.present++;
    if (record.status === "late") summary.late++;
    if (record.status === "half_day") summary.halfDay++;
    if (record.status === "absent") summary.absent++;
    if (record.status === "leave") summary.leave++;
    if (record.totalHours) summary.totalHours += record.totalHours;
  }

  if (summary.totalDays > 0) {
    summary.avgHours =
      Math.round((summary.totalHours / summary.totalDays) * 100) / 100;
  }
  summary.totalHours = Math.round(summary.totalHours * 100) / 100;

  return { records, summary };
}

/**
 * Admin clock in for any user (bypasses restrictions)
 * If record exists for today, it resets the clock-in time and clears clock-out
 */
export async function adminClockIn(
  targetUserId: string,
  adminUserId: string,
  input: ClockInInput,
): Promise<AttendanceRecord> {
  const now = new Date();
  const nowISO = getTimestampIST();

  // Get target user's shift type
  const shiftType = await getUserShiftType(targetUserId);

  // Get effective attendance date
  const effectiveDate = getEffectiveAttendanceDate(shiftType, now);

  // Check if record exists for effective date
  const { data: existing } = await supabaseAdmin
    .from("attendance")
    .select("*")
    .eq("user_id", targetUserId)
    .eq("date", effectiveDate)
    .single();

  // Get attendance rules for this shift type
  const rules = await getAttendanceRulesForShift(shiftType);
  // Determine status based on clock-in time
  let status = "present";
  if (rules) {
    const workStartTime = rules.work_start_time as string;
    const lateThreshold = (rules.late_threshold_minutes as number) || 15;

    // Use effective date for expected start calculation to ensure consistency
    const expectedStartDateStr = effectiveDate;
    // Ensure workStartTime is in HH:MM format (remove seconds if present)
    const timeParts = workStartTime.split(":");
    const formattedTime = `${timeParts[0]}:${timeParts[1]}`;
    const expectedStartStr = `${expectedStartDateStr}T${formattedTime}:00+05:30`;
    const expectedStart = new Date(expectedStartStr);

    // Validate that expectedStart is a valid date
    if (isNaN(expectedStart.getTime())) {
      // If date parsing failed, log error but continue with "present" status
      console.error(`Invalid expected start date: ${expectedStartStr}`);
    } else {
      const lateBy = (now.getTime() - expectedStart.getTime()) / 60000;
      if (lateBy >= lateThreshold) {
        status = "late";
      }
    }
  }

  const autoLogoutAt = calculateAutoLogoutTime(
    now,
    getShiftDurationMinutes(rules),
  );
  const autoLogoutISO = autoLogoutAt.toISOString();

  if (existing) {
    throw new ApiError(
      ERROR_CODES.ALREADY_EXISTS,
      "Attendance already exists for this date. Use restore endpoint for accidental logout.",
    );
  }

  // Create new record
  const { data, error } = await supabaseAdmin
    .from("attendance")
    .insert({
      user_id: targetUserId,
      date: effectiveDate,
      clock_in_time: nowISO,
      shift_end_time: autoLogoutISO,
      auto_logout_time: autoLogoutISO,
      logout_time: null,
      session_status: "ACTIVE",
      logout_type: null,
      status,
      location: input.location,
      notes: input.notes ? `[Admin Override] ${input.notes}` : null,
      break_duration: 0,
    } as any)
    .select()
    .single();

  if (error) {
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
  }

  // Attendance tracked in attendance table

  return mapAttendanceRowToRecord(data as unknown as AttendanceRow);
}

/**
 * Admin clock out for any user (bypasses restrictions)
 * Can overwrite existing clock out time
 */
export async function adminClockOut(
  targetUserId: string,
  adminUserId: string,
  input: ClockOutInput,
): Promise<AttendanceRecord> {
  const now = new Date();
  const nowISO = getTimestampIST();

  // Get target user's shift type
  const shiftType = await getUserShiftType(targetUserId);

  // Get effective attendance date
  const effectiveDate = getEffectiveAttendanceDate(shiftType, now);

  // Get attendance record for effective date
  let { data: existing, error: findError } = await supabaseAdmin
    .from("attendance")
    .select("*")
    .eq("user_id", targetUserId)
    .eq("date", effectiveDate)
    .single();

  // For night shift, always check the alternate date as fallback
  if (findError && shiftType === SHIFT_TYPES.NIGHT_SHIFT) {
    const today = formatInTimeZone(now, IST_TIMEZONE, "yyyy-MM-dd");
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = formatInTimeZone(
      yesterday,
      IST_TIMEZONE,
      "yyyy-MM-dd",
    );

    const alternateDate = effectiveDate === today ? yesterdayStr : today;
    const { data: altRecord } = await supabaseAdmin
      .from("attendance")
      .select("*")
      .eq("user_id", targetUserId)
      .eq("date", alternateDate)
      .single();
    if (altRecord) {
      existing = altRecord;
      findError = null;
    }
  }

  // Last resort: find ANY record for this user for today or yesterday
  if (findError) {
    const { data: anyRecord } = await supabaseAdmin
      .from("attendance")
      .select("*")
      .eq("user_id", targetUserId)
      .order("clock_in_time", { ascending: false })
      .limit(1)
      .single();
    if (anyRecord) {
      existing = anyRecord;
      findError = null;
    }
  }

  if (findError || !existing) {
    throw ApiError.notFound(
      "Clock-in record for this shift. Please clock in the user first.",
    );
  }

  // Calculate total hours
  const clockIn = new Date(existing.clock_in_time);
  const clockOut = new Date(nowISO);
  const breakDuration = input.breakDuration || existing.break_duration || 0;
  const totalMinutes =
    (clockOut.getTime() - clockIn.getTime()) / 60000 - breakDuration;
  const totalHours = Math.round((totalMinutes / 60) * 100) / 100;

  // Get attendance rules for this shift type
  const rules = await getAttendanceRulesForShift(shiftType);

  // Determine final status
  let status = existing.status;
  if (rules) {
    const halfDayHours = (rules.half_day_hours as number) || 4;
    const fullDayHours = (rules.full_day_hours as number) || 8;

    if (totalHours < halfDayHours) {
      status = "half_day";
    } else if (totalHours >= fullDayHours) {
      status = existing.status === "late" ? "late" : "present";
    }
  }

  const updateNotes = input.notes
    ? existing.notes
      ? `${existing.notes}\n[Admin Override] ${input.notes}`
      : `[Admin Override] ${input.notes}`
    : existing.notes;

  const { data, error } = await supabaseAdmin
    .from("attendance")
    .update({
      clock_out_time: nowISO,
      logout_time: nowISO,
      session_status: "COMPLETED",
      logout_type: "ADMIN_FORCE",
      total_hours: totalHours,
      break_duration: breakDuration,
      status,
      notes: updateNotes,
      updated_at: getCurrentTimestamp(),
    } as any)
    .eq("id", existing.id)
    .select()
    .single();

  if (error) {
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
  }

  // Attendance tracked in attendance table

  return mapAttendanceRowToRecord(data as unknown as AttendanceRow);
}

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
  const startDate = new Date(weekStartDate);

  // Generate all 7 days of the week
  const days = [];
  const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  for (let i = 0; i < 7; i++) {
    const currentDate = new Date(startDate);
    currentDate.setDate(startDate.getDate() + i);
    const dateStr = currentDate.toISOString().split("T")[0]!;

    days.push({
      day: dayNames[i]!,
      date: dateStr,
      hours: 0,
      isWeekend: i >= 5, // Saturday (5) and Sunday (6)
      clockInTime: null as string | null,
      clockOutTime: null as string | null,
    });
  }

  // Fetch attendance records for the week
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 6);
  const endDateStr = endDate.toISOString().split("T")[0]!;

  const { data, error } = await supabaseAdmin
    .from("attendance")
    .select("date, total_hours, clock_in_time, clock_out_time")
    .eq("user_id", userId)
    .gte("date", weekStartDate)
    .lte("date", endDateStr);

  if (error) {
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
  }

  // Map hours to corresponding days
  for (const record of data || []) {
    const r = record as {
      date: string;
      total_hours: number | null;
      clock_in_time: string | null;
      clock_out_time: string | null;
    };
    const dayIndex = days.findIndex((d) => d.date === r.date);
    if (dayIndex !== -1) {
      if (r.total_hours) {
        days[dayIndex]!.hours = Math.round(r.total_hours * 100) / 100;
      }
      days[dayIndex]!.clockInTime = r.clock_in_time;
      days[dayIndex]!.clockOutTime = r.clock_out_time;
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
