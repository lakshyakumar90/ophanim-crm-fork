import { supabase } from "../../supabase";
import { formatIST, getTodayIST } from "../../date-utils";
import { mapToCamelCase } from "../map-to-camel";

// ===================
// HOLIDAYS
// ===================

export async function getHolidays(year?: number) {
  let query = supabase.from("holidays").select("*").order("date");

  if (year) {
    query = query.gte("date", `${year}-01-01`).lte("date", `${year}-12-31`);
  }

  const { data, error } = await query;

  if (error) {
    if (process.env.NODE_ENV !== "production") console.warn("Error fetching holidays:", (error as any)?.message || (error as any)?.code || String(error));
    throw error;
  }

  return mapToCamelCase(data || []);
}

// ===================
// ATTENDANCE RULES
// ===================

export async function getAttendanceRules(shiftType?: string) {
  let query = supabase.from("attendance_rules").select("*");

  if (shiftType) {
    query = query.eq("shift_type", shiftType);
  } else {
    query = query.order("shift_type");
  }

  const { data, error } = await query;

  if (error) {
    if (process.env.NODE_ENV !== "production") console.warn("Error fetching attendance rules:", (error as any)?.message || (error as any)?.code || String(error));
    throw error;
  }

  return mapToCamelCase(data || []);
}

// ===================
// ATTENDANCE
// ===================

export async function getTodayAttendance(userId: string) {
  const today = new Date().toISOString().split("T")[0];
  const { data, error } = await supabase
    .from("attendance")
    .select("*")
    .eq("user_id", userId)
    .eq("date", today)
    .maybeSingle();

  if (error) {
    if (process.env.NODE_ENV !== "production") console.warn("Error fetching today attendance:", (error as any)?.message || (error as any)?.code || String(error));
    throw error;
  }

  return data ? mapToCamelCase(data) : null;
}

export async function getAttendanceSummary(
  userId: string,
  month?: number,
  year?: number,
) {
  const now = new Date();
  const m = month || now.getMonth() + 1;
  const y = year || now.getFullYear();
  const startDate = `${y}-${String(m).padStart(2, "0")}-01`;
  const endDate = `${y}-${String(m).padStart(2, "0")}-${new Date(y, m, 0).getDate()}`;

  const { data, error } = await supabase
    .from("attendance")
    .select("*")
    .eq("user_id", userId)
    .gte("date", startDate)
    .lte("date", endDate)
    .order("date", { ascending: true });

  if (error) {
    if (process.env.NODE_ENV !== "production") console.warn("Error fetching attendance summary:", (error as any)?.message || (error as any)?.code || String(error));
    throw error;
  }

  return mapToCamelCase(data || []);
}

export async function getAttendanceList(params?: {
  page?: number;
  limit?: number;
  userId?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  shiftType?: string;
  departmentId?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}) {
  const limit = params?.limit || 50;
  const page = params?.page || 1;
  const offset = (page - 1) * limit;

  let query = supabase
    .from("attendance")
    .select(
      `*, user:users!user_id(id, full_name, avatar_url, shift_type, department_id)`,
      { count: "exact" },
    );

  if (params?.userId) {
    query = query.eq("user_id", params.userId);
  }

  if (params?.startDate) {
    query = query.gte("date", params.startDate);
  }
  if (params?.endDate) {
    query = query.lte("date", params.endDate);
  }

  if (params?.status) {
    const statuses = params.status.split(",").map((s) => s.trim());
    query = query.in("status", statuses);
  }

  const sortBy = params?.sortBy || "date";
  const ascending = params?.sortOrder === "asc";
  query = query.order(sortBy, { ascending }).range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    if (process.env.NODE_ENV !== "production") console.warn("Error fetching attendance list:", (error as any)?.message || (error as any)?.code || String(error));
    throw error;
  }

  return {
    data: mapToCamelCase(data || []),
    meta: {
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    },
  };
}

export async function getUsersAttendanceToday(
  date?: string,
  departmentId?: string,
) {
  const today = date || getTodayIST();

  // Step 1: Get all active users
  let usersQuery = supabase
    .from("users")
    .select("id, full_name, email, role, avatar_url, shift_type, team_id")
    .eq("is_active", true)
    .order("full_name");

  const { data: users, error: usersError } = await usersQuery;
  if (usersError) {
    console.error("Error fetching users:", usersError);
    throw usersError;
  }

  // Step 2: Filter by department if needed (via team → department)
  let filteredUsers = users || [];
  if (departmentId) {
    const { data: teams } = await supabase
      .from("teams")
      .select("id")
      .eq("department_id", departmentId);
    const teamIds = new Set((teams || []).map((t: any) => t.id));
    filteredUsers = filteredUsers.filter((u: any) => teamIds.has(u.team_id));
  }

  // Step 3: For night shift users, check both today and yesterday if viewing today
  // Night shift users who clock in between 00:00-04:15 have their attendance on yesterday's date
  const now = new Date();
  const currentHour = parseInt(formatIST(now, "HH"));
  const currentMin = parseInt(formatIST(now, "mm"));
  const isEarlyMorning =
    currentHour < 4 || (currentHour === 4 && currentMin <= 15);
  const todayStr = getTodayIST();
  const isViewingToday = !date || date === todayStr;

  // Calculate yesterday's date
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = formatIST(yesterday, "yyyy-MM-dd");

  // Get night shift user IDs
  const nightShiftUserIds = filteredUsers
    .filter((u: any) => u.shift_type === "night_shift")
    .map((u: any) => u.id);

  // Step 4: Get attendance records for the date(s)
  const datesToCheck = [today];
  if (isViewingToday && isEarlyMorning && nightShiftUserIds.length > 0) {
    datesToCheck.push(yesterdayStr);
  }

  const { data: attendanceData, error: attError } = await supabase
    .from("attendance")
    .select("*")
    .in("date", datesToCheck);

  if (attError) {
    console.error("Error fetching attendance:", attError);
    throw attError;
  }

  // Step 5: Create attendance map keyed by user_id
  // For night shift users, prefer today's record, but fall back to yesterday if needed
  const attendanceMap = new Map<string, any>();
  for (const record of attendanceData || []) {
    const userId = record.user_id;

    // If user already has attendance mapped, prefer the one for the requested date
    if (attendanceMap.has(userId)) {
      const existing = attendanceMap.get(userId);
      if (record.date === today) {
        attendanceMap.set(userId, record);
      }
    } else {
      attendanceMap.set(userId, record);
    }
  }

  // Step 6: Combine users with their attendance (matching backend shape)
  return filteredUsers.map((u: any) => {
    const att = attendanceMap.get(u.id);
    return {
      user: {
        id: u.id,
        fullName: u.full_name,
        email: u.email,
        role: u.role,
        avatarUrl: u.avatar_url,
        shiftType: u.shift_type || null,
      },
      attendance: att
        ? {
            id: att.id,
            userId: att.user_id,
            date: att.date,
            clockInTime: att.clock_in_time,
            clockOutTime: att.clock_out_time,
            totalHours: att.total_hours,
            breakDuration: att.break_duration,
            status: att.status,
            location: att.location,
            notes: att.notes,
            createdAt: att.created_at,
            updatedAt: att.updated_at,
          }
        : null,
      status: att?.status || "absent",
    };
  });
}

export async function getUserAttendanceHistory(
  userId: string,
  startDate?: string,
  endDate?: string,
) {
  let query = supabase
    .from("attendance")
    .select("*")
    .eq("user_id", userId)
    .order("date", { ascending: false });

  if (startDate) {
    query = query.gte("date", startDate);
  }
  if (endDate) {
    query = query.lte("date", endDate);
  }

  const { data, error } = await query;

  if (error) {
    if (process.env.NODE_ENV !== "production") console.warn("Error fetching user attendance history:", (error as any)?.message || (error as any)?.code || String(error));
    throw error;
  }

  const records = mapToCamelCase(data || []);

  // Calculate summary to match backend format
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

export async function getWeeklyHours(userId?: string, weekStart?: string) {
  const start =
    weekStart ||
    (() => {
      const d = new Date();
      d.setDate(d.getDate() - d.getDay());
      return d.toISOString().split("T")[0];
    })();

  const endDate = (() => {
    const d = new Date(start);
    d.setDate(d.getDate() + 6);
    return d.toISOString().split("T")[0];
  })();

  let query = supabase
    .from("attendance")
    .select("date, total_hours, status")
    .gte("date", start)
    .lte("date", endDate)
    .order("date", { ascending: true });

  if (userId) {
    query = query.eq("user_id", userId);
  }

  const { data, error } = await query;

  if (error) {
    if (process.env.NODE_ENV !== "production") console.warn("Error fetching weekly hours:", (error as any)?.message || (error as any)?.code || String(error));
    throw error;
  }

  return mapToCamelCase(data || []);
}

// ===================
// NOTIFICATIONS
// ===================

export async function getNotifications(params?: {
  page?: number;
  limit?: number;
  unreadOnly?: boolean;
}) {
  const limit = params?.limit || 20;
  const page = params?.page || 1;
  const offset = (page - 1) * limit;

  // RLS will filter to current user only
  let query = supabase
    .from("notifications")
    .select(
      "id, user_id, title, message, type, related_entity_type, related_entity_id, is_read, action_url, priority, created_at",
      { count: "exact" },
    )
    .order("created_at", { ascending: false });

  if (params?.unreadOnly) {
    query = query.eq("is_read", false);
  }

  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    if (process.env.NODE_ENV !== "production") console.warn("Error fetching notifications:", (error as any)?.message || (error as any)?.code || String(error));
    throw error;
  }

  return {
    data: mapToCamelCase(data || []),
    meta: {
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    },
  };
}

export async function getUnreadNotificationCount() {
  // RLS will filter to current user only
  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("is_read", false);

  if (error) {
    if (process.env.NODE_ENV !== "production") console.warn("Error fetching unread count:", (error as any)?.message || (error as any)?.code || String(error));
    throw error;
  }

  return { count: count || 0 };
}

export async function getActivityLogs(params?: {
  page?: number;
  limit?: number;
  userId?: string;
  teamId?: string;
  resourceType?: string;
  action?: string;
  startDate?: string;
  endDate?: string;
  departmentId?: string;
}) {
  const limit = params?.limit || 50;
  const page = params?.page || 1;
  const offset = (page - 1) * limit;

  // Use the all_activities view (activity_logs table was dropped)
  let query = supabase.from("all_activities").select("*", { count: "exact" });

  if (params?.userId) {
    query = query.eq("user_id", params.userId);
  }

  if (params?.resourceType) {
    // all_activities view uses entity_type instead of resource_type
    query = query.eq("entity_type", params.resourceType);
  }

  if (params?.action) {
    query = query.eq("activity_type", params.action);
  }

  if (params?.startDate) {
    query = query.gte("created_at", params.startDate);
  }
  if (params?.endDate) {
    query = query.lte("created_at", params.endDate);
  }

  query = query
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    if (process.env.NODE_ENV !== "production") console.warn("Error fetching activity logs:", (error as any)?.message || (error as any)?.code || String(error));
    throw error;
  }

  // Reshape flat view columns into nested user/lead objects
  // to match the ActivityLog interface expected by the frontend
  const shaped = (data || []).map((row: any) => ({
    id: row.id,
    user_id: row.user_id,
    lead_id: row.lead_id,
    entity_id: row.entity_id,
    activity_type: row.activity_type,
    title: row.title,
    description: row.description,
    metadata: row.metadata,
    created_at: row.created_at,
    source_type: row.source_type,
    entity_type: row.entity_type,
    user: row.user_id
      ? {
          id: row.user_id,
          full_name: row.user_name,
          email: row.user_email,
          avatar_url: row.user_avatar,
        }
      : null,
    lead: row.lead_id
      ? {
          id: row.lead_id,
          lead_name: row.entity_name,
        }
      : null,
  }));

  return {
    data: shaped,
    meta: {
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    },
  };
}

// ===================
// TEAM NOTES
// ===================

export async function getTeamNotes(teamId: string) {
  const { data, error } = await supabase
    .from("team_notes")
    .select(`*, user:users!user_id(id, full_name, avatar_url)`)
    .eq("team_id", teamId)
    .order("created_at", { ascending: false });

  if (error) {
    if (process.env.NODE_ENV !== "production") console.warn("Error fetching team notes:", (error as any)?.message || (error as any)?.code || String(error));
    throw error;
  }

  return mapToCamelCase(data || []);
}

// ===================
// EMAIL
// ===================

export async function getEmailSettings() {
  // RLS filters to current user only
  const { data, error } = await supabase
    .from("user_email_settings")
    .select("*")
    .maybeSingle();

  if (error) {
    if (process.env.NODE_ENV !== "production") console.warn("Error fetching email settings:", (error as any)?.message || (error as any)?.code || String(error));
    throw error;
  }

  return data ? mapToCamelCase(data) : null;
}

export async function getEmailHistory(params?: {
  limit?: number;
  offset?: number;
  leadId?: string;
}) {
  let query = supabase
    .from("email_send_log")
    .select("*")
    .order("sent_at", { ascending: false });

  if (params?.leadId) {
    query = query.eq("lead_id", params.leadId);
  }

  const limit = params?.limit || 50;
  const offset = params?.offset || 0;
  query = query.range(offset, offset + limit - 1);

  const { data, error } = await query;

  if (error) {
    if (process.env.NODE_ENV !== "production") console.warn("Error fetching email history:", (error as any)?.message || (error as any)?.code || String(error));
    throw error;
  }

  return mapToCamelCase(data || []);
}
