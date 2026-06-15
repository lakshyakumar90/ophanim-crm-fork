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
    .select("id, full_name, email, role, avatar_url, shift_type, job_title")
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
        designation: user.job_title || null,
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
