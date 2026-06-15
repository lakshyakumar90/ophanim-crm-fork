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

import { formatInTimeZone } from "date-fns-tz";
import { getTimestampIST } from "../../../utils/date-utils.js";

import {
  normalizeAttendanceStatus,
  toCompatAttendanceStatus,
  calculateWorkedHours,
  mapAttendanceRowToRecord,
  getShiftDateTimes,
  evaluateClockInWindow,
  calculateAutoLogoutTime,
  calculateScheduledAutoLogoutTime,
  getUserShiftType,
  getAttendanceRulesForShift,
  getEffectiveAttendanceDate,
  deriveSessionStatusByHours,
  getLatestOpenSession,
  closeMalformedOpenSessions,
  closeDueOpenSessions,
  getTodaySessions,
  calculateDayTotalHours,
  normalizeWeeklyOffDays,
  isHolidayApplicableToUser,
  deriveAttendanceDaysForUsers,
  IST_TIMEZONE,
  AUTO_MERGE_WINDOW_MINUTES,
  type AttendanceRecord,
  type AttendanceRow,
  type TodayAttendanceResponse,
  type DerivedDayAttendance,
} from "./attendance.shared.js";

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

      await logActivity({
        actorId: userId,
        entityType: "attendance",
        entityId: lastCompleted.id,
        eventType: "session_resumed",
        source: "attendance",
        metadata: {
          merge_window_minutes: AUTO_MERGE_WINDOW_MINUTES,
          shift_type: shiftType,
        },
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

  await logActivity({
    actorId: userId,
    entityType: "attendance",
    entityId: data.id,
    eventType: "clock_in",
    source: "attendance",
    metadata: {
      status,
      shift_type: shiftType,
      location: input.location,
    },
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

  await logActivity({
    actorId: userId,
    entityType: "attendance",
    entityId: existing.id,
    eventType: "clock_out",
    source: "attendance",
    metadata: {
      total_hours: totalHours,
      status,
      shift_type: shiftType,
    },
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
