import { supabaseAdmin } from "../config/supabase.js";
import { ApiError } from "../utils/responses.js";
import { ERROR_CODES } from "../utils/error-codes.js";
import { USER_ROLES } from "../config/constants.js";
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

/**
 * Get today's date string in IST
 */
function getTodayDateString(): string {
  return getTodayIST();
}

/**
 * Clock in
 */
export async function clockIn(
  userId: string,
  input: ClockInInput,
): Promise<AttendanceRecord> {
  const today = getTodayDateString();
  const now = getTimestampIST();

  // Check if already clocked in today
  const { data: existing } = await supabaseAdmin
    .from("attendance")
    .select("*")
    .eq("user_id", userId)
    .eq("date", today)
    .single();

  if (existing) {
    throw new ApiError(ERROR_CODES.ALREADY_EXISTS, "Already clocked in today");
  }

  // Get attendance rules
  const { data: rules } = await supabaseAdmin
    .from("attendance_rules")
    .select("*")
    .single();

  // Determine status based on clock-in time
  let status = "present";
  if (rules) {
    const workStartTime = rules.work_start_time as string;
    const workEndTime = rules.work_end_time as string;
    const lateThreshold = (rules.late_threshold_minutes as number) || 15;

    const [startHour, startMin] = workStartTime.split(":").map(Number);
    const [endHour, endMin] = workEndTime.split(":").map(Number);

    const clockInDate = new Date(now);
    let expectedStart = new Date(clockInDate);
    expectedStart.setHours(startHour!, startMin!, 0, 0);

    // Overnight Logic:
    // If shift crosses midnight (Start > End) AND current time is < End (early morning),
    // then this shift belongs to "Yesterday".
    // Example: Start 19:00, End 04:00. Clock in 01:00.
    // 01:00 < 04:00 -> belongs to yesterday's 19:00 start.
    // So expected start is 19:00 Yesterday.
    if (startHour! > endHour!) {
      const currentHour = clockInDate.getHours();
      const currentMin = clockInDate.getMinutes();

      // Check if current time is before end time (with a small buffer? assumes strict end)
      if (
        currentHour < endHour! ||
        (currentHour === endHour! && currentMin <= endMin!)
      ) {
        expectedStart.setDate(expectedStart.getDate() - 1);
      }
    }

    const lateBy = (clockInDate.getTime() - expectedStart.getTime()) / 60000;
    if (lateBy > lateThreshold) {
      status = "late";
    }
  }

  const { data, error } = await supabaseAdmin
    .from("attendance")
    .insert({
      user_id: userId,
      date: today,
      clock_in_time: now,
      status,
      location: input.location,
      notes: input.notes,
      break_duration: 0,
    })
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
      time: now,
      status,
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
  const today = getTodayDateString();
  const now = getTimestampIST();

  // First, try to get today's attendance record
  let { data: existing } = await supabaseAdmin
    .from("attendance")
    .select("*")
    .eq("user_id", userId)
    .eq("date", today)
    .is("clock_out_time", null)
    .single();

  // If no today record, check for night shift (yesterday's open record)
  if (!existing) {
    const { data: rules } = await supabaseAdmin
      .from("attendance_rules")
      .select("work_start_time, work_end_time")
      .single();

    if (rules) {
      const workStartTime = rules.work_start_time as string;
      const workEndTime = rules.work_end_time as string;
      const [startHour] = workStartTime.split(":").map(Number);
      const [endHour, endMin] = workEndTime.split(":").map(Number);

      // Check if shift crosses midnight
      if (startHour! > endHour!) {
        const currentDate = new Date();
        const currentHour = currentDate.getHours();
        const currentMin = currentDate.getMinutes();

        // If current time is before shift end time (early morning hours)
        if (
          currentHour < endHour! ||
          (currentHour === endHour! && currentMin <= endMin!)
        ) {
          // Try to get yesterday's open record
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          const yesterdayStr = yesterday.toISOString().split("T")[0]!;

          const { data: yesterdayRecord } = await supabaseAdmin
            .from("attendance")
            .select("*")
            .eq("user_id", userId)
            .eq("date", yesterdayStr)
            .is("clock_out_time", null)
            .single();

          if (yesterdayRecord) {
            existing = yesterdayRecord;
          }
        }
      }
    }
  }

  if (!existing) {
    throw ApiError.notFound("Clock-in record for today");
  }

  if (existing.clock_out_time) {
    throw new ApiError(ERROR_CODES.ALREADY_EXISTS, "Already clocked out today");
  }

  // Calculate total hours
  const clockIn = new Date(existing.clock_in_time);
  const clockOut = new Date(now);
  const breakDuration = input.breakDuration || existing.break_duration || 0;
  const totalMinutes =
    (clockOut.getTime() - clockIn.getTime()) / 60000 - breakDuration;
  const totalHours = Math.round((totalMinutes / 60) * 100) / 100;

  // Determine final status
  let status = existing.status;
  const { data: rules } = await supabaseAdmin
    .from("attendance_rules")
    .select("*")
    .single();

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
      clock_out_time: now,
      total_hours: totalHours,
      break_duration: breakDuration,
      status,
      notes: updateNotes,
      updated_at: getCurrentTimestamp(),
    })
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
  const today = getTodayDateString();

  // First, try to get today's record
  const { data: todayData, error: todayError } = await supabaseAdmin
    .from("attendance")
    .select("*")
    .eq("user_id", userId)
    .eq("date", today)
    .single();

  if (todayData) {
    return mapAttendanceRowToRecord(todayData as unknown as AttendanceRow);
  }

  // If no today record, check if this is early morning of a night shift
  // and return yesterday's open record if exists
  const { data: rules } = await supabaseAdmin
    .from("attendance_rules")
    .select("work_start_time, work_end_time")
    .single();

  if (rules) {
    const workStartTime = rules.work_start_time as string;
    const workEndTime = rules.work_end_time as string;
    const [startHour] = workStartTime.split(":").map(Number);
    const [endHour, endMin] = workEndTime.split(":").map(Number);

    // Check if shift crosses midnight (start hour > end hour, like 19:00 to 04:00)
    if (startHour! > endHour!) {
      const now = new Date();
      const currentHour = now.getHours();
      const currentMin = now.getMinutes();

      // If current time is before shift end time (early morning hours)
      if (
        currentHour < endHour! ||
        (currentHour === endHour! && currentMin <= endMin!)
      ) {
        // Calculate yesterday's date
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split("T")[0]!;

        // Try to get yesterday's record that hasn't been clocked out
        const { data: yesterdayData } = await supabaseAdmin
          .from("attendance")
          .select("*")
          .eq("user_id", userId)
          .eq("date", yesterdayStr)
          .is("clock_out_time", null)
          .single();

        if (yesterdayData) {
          return mapAttendanceRowToRecord(
            yesterdayData as unknown as AttendanceRow,
          );
        }
      }
    }
  }

  return null;
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
 */
export async function getAttendanceRules() {
  const { data, error } = await supabaseAdmin
    .from("attendance_rules")
    .select("*")
    .single();

  if (error) {
    return null;
  }

  return data;
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
    .select("id, full_name, email, role, avatar_url")
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

  // Get attendance for the date
  const { data: attendanceData, error: attendanceError } = await supabaseAdmin
    .from("attendance")
    .select("*")
    .eq("date", date);

  if (attendanceError) {
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, attendanceError.message);
  }

  // Create a map of user attendance
  const attendanceMap = new Map();
  for (const record of attendanceData || []) {
    const r = record as AttendanceRow;
    attendanceMap.set(r.user_id, mapAttendanceRowToRecord(r));
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
  const today = getTodayDateString();
  const now = getTimestampIST();

  // Check if record exists for today
  const { data: existing } = await supabaseAdmin
    .from("attendance")
    .select("*")
    .eq("user_id", targetUserId)
    .eq("date", today)
    .single();

  // Get attendance rules for status determination
  const { data: rules } = await supabaseAdmin
    .from("attendance_rules")
    .select("*")
    .single();

  // Determine status based on clock-in time
  let status = "present";
  if (rules) {
    const workStartTime = rules.work_start_time as string;
    const lateThreshold = (rules.late_threshold_minutes as number) || 15;

    const [startHour, startMin] = workStartTime.split(":").map(Number);
    const clockInDate = new Date(now);
    const expectedStart = new Date(clockInDate);
    expectedStart.setHours(startHour!, startMin!, 0, 0);

    const lateBy = (clockInDate.getTime() - expectedStart.getTime()) / 60000;
    if (lateBy > lateThreshold) {
      status = "late";
    }
  }

  let data;
  let error;

  if (existing) {
    // Update existing record - reset clock in time and clear clock out
    const result = await supabaseAdmin
      .from("attendance")
      .update({
        clock_in_time: now,
        clock_out_time: null,
        total_hours: null,
        status,
        location: input.location ?? existing.location,
        notes: input.notes
          ? existing.notes
            ? `${existing.notes}\n[Admin Override] ${input.notes}`
            : `[Admin Override] ${input.notes}`
          : existing.notes,
        updated_at: getCurrentTimestamp(),
      })
      .eq("id", existing.id)
      .select()
      .single();

    data = result.data;
    error = result.error;
  } else {
    // Create new record
    const result = await supabaseAdmin
      .from("attendance")
      .insert({
        user_id: targetUserId,
        date: today,
        clock_in_time: now,
        status,
        location: input.location,
        notes: input.notes ? `[Admin Override] ${input.notes}` : null,
        break_duration: 0,
      })
      .select()
      .single();

    data = result.data;
    error = result.error;
  }

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
  const today = getTodayDateString();
  const now = getTimestampIST();

  // Get today's attendance record
  const { data: existing, error: findError } = await supabaseAdmin
    .from("attendance")
    .select("*")
    .eq("user_id", targetUserId)
    .eq("date", today)
    .single();

  if (findError || !existing) {
    throw ApiError.notFound(
      "Clock-in record for today. Please clock in the user first.",
    );
  }

  // Calculate total hours
  const clockIn = new Date(existing.clock_in_time);
  const clockOut = new Date(now);
  const breakDuration = input.breakDuration || existing.break_duration || 0;
  const totalMinutes =
    (clockOut.getTime() - clockIn.getTime()) / 60000 - breakDuration;
  const totalHours = Math.round((totalMinutes / 60) * 100) / 100;

  // Determine final status
  let status = existing.status;
  const { data: rules } = await supabaseAdmin
    .from("attendance_rules")
    .select("*")
    .single();

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
      clock_out_time: now,
      total_hours: totalHours,
      break_duration: breakDuration,
      status,
      notes: updateNotes,
      updated_at: getCurrentTimestamp(),
    })
    .eq("id", existing.id)
    .select()
    .single();

  if (error) {
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
  }

  // Attendance tracked in attendance table

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
    });
  }

  // Fetch attendance records for the week
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 6);
  const endDateStr = endDate.toISOString().split("T")[0]!;

  const { data, error } = await supabaseAdmin
    .from("attendance")
    .select("date, total_hours")
    .eq("user_id", userId)
    .gte("date", weekStartDate)
    .lte("date", endDateStr);

  if (error) {
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
  }

  // Map hours to corresponding days
  for (const record of data || []) {
    const r = record as { date: string; total_hours: number | null };
    const dayIndex = days.findIndex((d) => d.date === r.date);
    if (dayIndex !== -1 && r.total_hours) {
      days[dayIndex]!.hours = Math.round(r.total_hours * 100) / 100;
    }
  }

  return days;
}
