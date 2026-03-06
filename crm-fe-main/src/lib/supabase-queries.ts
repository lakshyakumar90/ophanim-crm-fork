/**
 * Direct Supabase queries for read-only operations.
 * These replace backend API GET calls to reduce server load.
 * RLS policies enforce access control based on the authenticated user.
 */

import { supabase } from "./supabase";
import { formatIST, getTodayIST } from "./date-utils";

// ===================
// UTILITY: snake_case → camelCase mapper
// ===================

function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * Recursively convert all snake_case keys in an object to camelCase.
 * Handles arrays, nested objects, and null/undefined.
 */
export function mapToCamelCase<T = any>(obj: any): T {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(mapToCamelCase) as T;
  if (typeof obj !== "object" || obj instanceof Date) return obj;

  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = snakeToCamel(key);
    result[camelKey] =
      typeof value === "object" && value !== null && !(value instanceof Date)
        ? mapToCamelCase(value)
        : value;
  }
  return result as T;
}

// ===================
// DEPARTMENTS
// ===================

export async function getDepartments() {
  const { data, error } = await supabase
    .from("departments")
    .select("*")
    .eq("is_active", true)
    .order("name");

  if (error) {
    console.error("Error fetching departments:", error);
    throw error;
  }

  return mapToCamelCase(data || []);
}

// ===================
// TEAMS
// ===================

export async function getTeams() {
  const { data, error } = await supabase
    .from("teams")
    .select("*")
    .order("name");

  if (error) {
    console.error("Error fetching teams:", error);
    throw error;
  }

  return mapToCamelCase(data || []);
}

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
    console.error("Error fetching holidays:", error);
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
    console.error("Error fetching attendance rules:", error);
    throw error;
  }

  return mapToCamelCase(data || []);
}

// ===================
// USERS
// ===================

export async function getUsers(params?: {
  page?: number;
  limit?: number;
  role?: string;
  departmentId?: string;
  teamId?: string;
  isActive?: boolean;
  search?: string;
  shiftType?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}) {
  const limit = params?.limit || 50;
  const page = params?.page || 1;
  const offset = (page - 1) * limit;

  let query = supabase.from("users").select(
    `id, email, full_name, role, team_id, department_id, phone, job_title,
       avatar_url, is_active, last_login, created_at, updated_at,
       theme_preference, primary_color, is_2fa_enabled, shift_type`,
    { count: "exact" },
  );

  if (params?.role) {
    const roles = params.role.split(",").map((r) => r.trim());
    if (roles.length === 1) {
      query = query.eq("role", roles[0]);
    } else {
      query = query.in("role", roles);
    }
  }

  if (params?.departmentId) {
    query = query.eq("department_id", params.departmentId);
  }

  if (params?.teamId) {
    query = query.eq("team_id", params.teamId);
  }

  if (params?.isActive !== undefined) {
    query = query.eq("is_active", params.isActive);
  }

  if (params?.shiftType) {
    query = query.eq("shift_type", params.shiftType);
  }

  if (params?.search) {
    query = query.or(
      `full_name.ilike.%${params.search}%,email.ilike.%${params.search}%`,
    );
  }

  const sortBy = params?.sortBy || "created_at";
  const ascending = params?.sortOrder === "asc";
  query = query.order(sortBy, { ascending }).range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error("Error fetching users:", error);
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

export async function getUserById(id: string) {
  const { data, error } = await supabase
    .from("users")
    .select(
      `id, email, full_name, role, team_id, department_id, phone, job_title,
       avatar_url, is_active, last_login, created_at, updated_at,
       theme_preference, primary_color, is_2fa_enabled, shift_type`,
    )
    .eq("id", id)
    .single();

  if (error) {
    console.error("Error fetching user:", error);
    throw error;
  }

  return mapToCamelCase(data);
}

export async function getProjectManagers() {
  const { data, error } = await supabase
    .from("users")
    .select("id, full_name, email, avatar_url, role, department_id")
    .in("role", ["admin", "manager"])
    .eq("is_active", true)
    .order("full_name");

  if (error) {
    console.error("Error fetching project managers:", error);
    throw error;
  }

  return mapToCamelCase(data || []);
}

export async function getUsersByJobTitle(titles: string[]) {
  const { data, error } = await supabase
    .from("users")
    .select("id, full_name, email, avatar_url, role, job_title, department_id")
    .in("job_title", titles)
    .eq("is_active", true)
    .order("full_name");

  if (error) {
    console.error("Error fetching users by job title:", error);
    throw error;
  }

  return mapToCamelCase(data || []);
}

export async function getJobTitles(roleType?: "employee" | "manager") {
  let query = supabase
    .from("users")
    .select("job_title")
    .not("job_title", "is", null)
    .eq("is_active", true);

  if (roleType) {
    query = query.eq("role", roleType);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching job titles:", error);
    throw error;
  }

  const uniqueTitles = [
    ...new Set((data || []).map((d: any) => d.job_title).filter(Boolean)),
  ];
  return uniqueTitles;
}

// ===================
// LEADS
// ===================

export async function getLeads(params?: {
  page?: number;
  limit?: number;
  status?: string;
  source?: string;
  assignedTo?: string;
  assigned?: "assigned" | "unassigned";
  teamId?: string;
  country?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}) {
  const limit = params?.limit || 50;
  const page = params?.page || 1;
  const offset = (page - 1) * limit;

  let query = supabase
    .from("leads")
    .select(
      `id, lead_name, business_name, email, phone, status, source,
       assigned_to, website, country, timezone, nal_reason, client_response,
       lead_type, created_by, converted_at, created_at, updated_at, is_deleted,
       assignee:users!assigned_to(id, full_name, avatar_url)`,
      { count: "exact" },
    )
    .eq("is_deleted", false);

  if (params?.status) {
    const statuses = params.status.split(",").map((s) => s.trim());
    query = query.in("status", statuses);
  }

  if (params?.source) {
    const sources = params.source.split(",").map((s) => s.trim());
    query = query.in("source", sources);
  }

  if (params?.assignedTo) {
    query = query.eq("assigned_to", params.assignedTo);
  }

  // Team filter: get all users in the team and filter by their IDs
  if (params?.teamId) {
    const { data: teamMembers } = await supabase
      .from("users")
      .select("id")
      .eq("team_id", params.teamId)
      .eq("is_active", true);
    const memberIds = (teamMembers || []).map((u: any) => u.id);
    if (memberIds.length > 0) {
      query = query.in("assigned_to", memberIds);
    } else {
      // No team members = no results
      query = query.eq("assigned_to", "00000000-0000-0000-0000-000000000000");
    }
  }

  if (params?.assigned === "assigned") {
    query = query.not("assigned_to", "is", null);
  } else if (params?.assigned === "unassigned") {
    query = query.is("assigned_to", null);
  }

  if (params?.country) {
    query = query.ilike("country", `%${params.country}%`);
  }

  if (params?.search) {
    query = query.or(
      `lead_name.ilike.%${params.search}%,email.ilike.%${params.search}%,phone.ilike.%${params.search}%,business_name.ilike.%${params.search}%`,
    );
  }

  if (params?.startDate) {
    query = query.gte("created_at", params.startDate);
  }
  if (params?.endDate) {
    query = query.lte("created_at", params.endDate);
  }

  const sortBy = params?.sortBy || "created_at";
  const ascending = params?.sortOrder === "asc";
  query = query.order(sortBy, { ascending }).range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error("Error fetching leads:", error);
    throw error;
  }

  // Flatten assignee from array to single object (Supabase foreign key join)
  const mapped = (data || []).map((lead: any) => ({
    ...lead,
    assignee: Array.isArray(lead.assignee)
      ? lead.assignee[0] || null
      : lead.assignee,
  }));

  return {
    data: mapToCamelCase(mapped),
    meta: {
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    },
  };
}

export async function getLeadById(id: string) {
  const { data, error } = await supabase
    .from("leads")
    .select(`*, assignee:users!assigned_to(id, full_name, avatar_url, email)`)
    .eq("id", id)
    .single();

  if (error) {
    console.error("Error fetching lead:", error);
    throw error;
  }

  const mapped = {
    ...data,
    assignee: Array.isArray(data.assignee)
      ? data.assignee[0] || null
      : data.assignee,
  };

  return mapToCamelCase(mapped);
}

export async function getLeadPipeline() {
  const { data, error } = await supabase
    .from("leads")
    .select("status")
    .eq("is_deleted", false);

  if (error) {
    console.error("Error fetching lead pipeline:", error);
    throw error;
  }

  const pipeline: Record<string, number> = {};
  for (const lead of data || []) {
    const status = (lead as any).status;
    pipeline[status] = (pipeline[status] || 0) + 1;
  }

  return pipeline;
}

export async function getWonLeads() {
  const { data, error } = await supabase
    .from("leads")
    .select(
      `id, lead_name, business_name, email, phone, lead_value, converted_at,
       assignee:users!assigned_to(id, full_name, avatar_url)`,
    )
    .eq("status", "won")
    .eq("is_deleted", false)
    .order("converted_at", { ascending: false });

  if (error) {
    console.error("Error fetching won leads:", error);
    throw error;
  }

  const mapped = (data || []).map((lead: any) => ({
    ...lead,
    assignee: Array.isArray(lead.assignee)
      ? lead.assignee[0] || null
      : lead.assignee,
  }));

  return mapToCamelCase(mapped);
}

export async function getLeadActivities(leadId: string) {
  const { data, error } = await supabase
    .from("lead_activities")
    .select(`*, user:users!user_id(id, full_name, avatar_url)`)
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching lead activities:", error);
    throw error;
  }

  return mapToCamelCase(data || []);
}

export async function getLeadComments(leadId: string) {
  const { data, error } = await supabase
    .from("comments")
    .select(`*, user:users!user_id(id, full_name, avatar_url)`)
    .eq("entity_type", "lead")
    .eq("entity_id", leadId)
    .eq("is_deleted", false)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching lead comments:", error);
    throw error;
  }

  return mapToCamelCase(data || []);
}

export async function getLeadReminders(leadId: string) {
  const { data, error } = await supabase
    .from("lead_reminders")
    .select(
      `*, lead:leads!lead_id(id, lead_name), user:users!user_id(id, full_name)`,
    )
    .eq("lead_id", leadId)
    .order("reminder_at", { ascending: true });

  if (error) {
    console.error("Error fetching lead reminders:", error);
    throw error;
  }

  return mapToCamelCase(data || []);
}

export async function getAllReminders(params?: {
  page?: number;
  limit?: number;
  userId?: string;
  status?: "pending" | "sent" | "all";
  date?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}) {
  const limit = params?.limit || 50;
  const page = params?.page || 1;
  const offset = (page - 1) * limit;

  let query = supabase
    .from("lead_reminders")
    .select(
      `*, lead:leads!lead_id(id, lead_name), user:users!user_id(id, full_name)`,
      { count: "exact" },
    );

  if (params?.userId) {
    query = query.eq("user_id", params.userId);
  }

  if (params?.status === "pending") {
    query = query.eq("is_done", false);
  } else if (params?.status === "sent") {
    query = query.eq("is_done", true);
  }

  if (params?.date) {
    query = query
      .gte("reminder_at", `${params.date}T00:00:00`)
      .lte("reminder_at", `${params.date}T23:59:59`);
  }

  const sortBy = params?.sortBy || "reminder_at";
  const ascending = params?.sortOrder !== "desc";
  query = query.order(sortBy, { ascending }).range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error("Error fetching all reminders:", error);
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

export async function getRemindersCount(params?: {
  userId?: string;
  status?: "pending" | "sent" | "all";
  date?: string;
}) {
  let query = supabase
    .from("lead_reminders")
    .select("id", { count: "exact", head: true });

  if (params?.userId) {
    query = query.eq("user_id", params.userId);
  }

  if (params?.status === "pending") {
    query = query.eq("is_done", false);
  } else if (params?.status === "sent") {
    query = query.eq("is_done", true);
  }

  if (params?.date) {
    query = query
      .gte("reminder_at", `${params.date}T00:00:00`)
      .lte("reminder_at", `${params.date}T23:59:59`);
  }

  const { count, error } = await query;

  if (error) {
    console.error("Error fetching reminders count:", error);
    throw error;
  }

  return { count: count || 0 };
}

export async function getLeadStatsByUser() {
  const { data, error } = await supabase
    .from("leads")
    .select("assigned_to, status")
    .eq("is_deleted", false);

  if (error) {
    console.error("Error fetching lead stats:", error);
    throw error;
  }

  // Group by user
  const userStats: Record<
    string,
    { total: number; byStatus: Record<string, number> }
  > = {};
  let unassignedCount = 0;

  for (const lead of data || []) {
    const l = lead as { assigned_to: string | null; status: string };
    if (!l.assigned_to) {
      unassignedCount++;
      continue;
    }
    if (!userStats[l.assigned_to]) {
      userStats[l.assigned_to] = { total: 0, byStatus: {} };
    }
    userStats[l.assigned_to].total++;
    userStats[l.assigned_to].byStatus[l.status] =
      (userStats[l.assigned_to].byStatus[l.status] || 0) + 1;
  }

  // Fetch user names
  const userIds = Object.keys(userStats);
  let users: any[] = [];
  if (userIds.length > 0) {
    const { data: userData } = await supabase
      .from("users")
      .select("id, full_name, avatar_url")
      .in("id", userIds);
    users = (userData || []).map((u: any) => ({
      ...mapToCamelCase(u),
      ...userStats[u.id],
    }));
  }

  return { users, unassignedCount };
}

// ===================
// TASKS
// ===================

export async function getTasks(params?: {
  page?: number;
  limit?: number;
  status?: string;
  priority?: string;
  assignedTo?: string;
  relatedLeadId?: string;
  projectId?: string;
  overdue?: boolean;
  dueToday?: boolean;
  search?: string;
  startDate?: string;
  endDate?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}) {
  const limit = params?.limit || 50;
  const page = params?.page || 1;
  const offset = (page - 1) * limit;

  let query = supabase
    .from("tasks")
    .select(
      `id, title, description, task_type, related_lead_id, project_id,
       assigned_to, assigned_by, priority, status, due_date, completed_at,
       tags, is_deleted, created_at, updated_at`,
      { count: "exact" },
    )
    .eq("is_deleted", false);

  if (params?.status) {
    const statuses = params.status.split(",").map((s) => s.trim());
    query = query.in("status", statuses);
  }

  if (params?.priority) {
    const priorities = params.priority.split(",").map((p) => p.trim());
    query = query.in("priority", priorities);
  }

  if (params?.assignedTo) {
    query = query.eq("assigned_to", params.assignedTo);
  }

  if (params?.relatedLeadId) {
    query = query.eq("related_lead_id", params.relatedLeadId);
  }

  if (params?.projectId) {
    query = query.eq("project_id", params.projectId);
  }

  if (params?.overdue) {
    query = query
      .lt("due_date", new Date().toISOString())
      .neq("status", "completed")
      .neq("status", "cancelled");
  }

  if (params?.dueToday) {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    query = query
      .gte("due_date", todayStart.toISOString())
      .lte("due_date", todayEnd.toISOString());
  }

  if (params?.startDate) {
    query = query.gte("due_date", params.startDate);
  }
  if (params?.endDate) {
    query = query.lte("due_date", params.endDate);
  }

  const sortBy = params?.sortBy || "created_at";
  const ascending = params?.sortOrder === "asc";
  query = query.order(sortBy, { ascending }).range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error("Error fetching tasks:", error);
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

export async function getTaskById(id: string) {
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error("Error fetching task:", error);
    throw error;
  }

  return mapToCamelCase(data);
}

export async function getTaskSummary() {
  const { data, error } = await supabase
    .from("tasks")
    .select("status, due_date")
    .eq("is_deleted", false);

  if (error) {
    console.error("Error fetching task summary:", error);
    throw error;
  }

  const now = new Date().toISOString();
  const summary = {
    total: 0,
    todo: 0,
    inProgress: 0,
    completed: 0,
    overdue: 0,
  };

  for (const task of data || []) {
    const t = task as { status: string; due_date: string | null };
    summary.total++;
    if (t.status === "todo") summary.todo++;
    if (t.status === "in_progress") summary.inProgress++;
    if (t.status === "completed") summary.completed++;
    if (
      t.due_date &&
      t.due_date < now &&
      t.status !== "completed" &&
      t.status !== "cancelled"
    ) {
      summary.overdue++;
    }
  }

  return summary;
}

export async function getTaskComments(taskId: string) {
  const { data, error } = await supabase
    .from("comments")
    .select(`*, user:users!user_id(id, full_name, avatar_url)`)
    .eq("entity_type", "task")
    .eq("entity_id", taskId)
    .eq("is_deleted", false)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching task comments:", error);
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
    console.error("Error fetching today attendance:", error);
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
    console.error("Error fetching attendance summary:", error);
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
    console.error("Error fetching attendance list:", error);
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
    console.error("Error fetching user attendance history:", error);
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
    console.error("Error fetching weekly hours:", error);
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
    console.error("Error fetching notifications:", error);
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
    console.error("Error fetching unread count:", error);
    throw error;
  }

  return { count: count || 0 };
}

// ===================
// PROJECTS
// ===================

export async function getProjects() {
  const { data, error } = await supabase
    .from("projects")
    .select(
      `*, manager:users!manager_id(id, full_name, avatar_url),
       members:project_members(id, user_id, role, allocation_percentage,
         user:users!user_id(id, full_name, avatar_url, job_title))`,
    )
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching projects:", error);
    throw error;
  }

  return mapToCamelCase(data || []);
}

export async function getProjectById(id: string) {
  const { data, error } = await supabase
    .from("projects")
    .select(
      `*, manager:users!manager_id(id, full_name, avatar_url, email),
       members:project_members(id, user_id, role, allocation_percentage,
         user:users!user_id(id, full_name, avatar_url, job_title, email))`,
    )
    .eq("id", id)
    .single();

  if (error) {
    console.error("Error fetching project:", error);
    throw error;
  }

  return mapToCamelCase(data);
}

// ===================
// ACTIVITIES / ACTIVITY LOGS
// ===================

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
    console.error("Error fetching activity logs:", error);
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

export async function getLeadActivitiesLog(params?: {
  page?: number;
  limit?: number;
  startDate?: string;
  endDate?: string;
}) {
  const limit = params?.limit || 50;
  const page = params?.page || 1;
  const offset = (page - 1) * limit;

  let query = supabase.from("lead_activities").select(
    `*, user:users!user_id(id, full_name, avatar_url),
       lead:leads!lead_id(id, lead_name)`,
    { count: "exact" },
  );

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
    console.error("Error fetching lead activities log:", error);
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
    console.error("Error fetching team notes:", error);
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
    console.error("Error fetching email settings:", error);
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
    console.error("Error fetching email history:", error);
    throw error;
  }

  return mapToCamelCase(data || []);
}

// ===================
// SAVED FILTERS
// ===================

export async function getSavedFilters(filterType?: string) {
  let query = supabase
    .from("saved_filters")
    .select("*")
    .order("created_at", { ascending: false });

  if (filterType) {
    query = query.eq("filter_type", filterType);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching saved filters:", error);
    throw error;
  }

  return mapToCamelCase(data || []);
}

// ===================
// LEAVE MANAGEMENT
// ===================

export async function getLeaveTypes() {
  const { data, error } = await supabase
    .from("leave_types")
    .select("*")
    .eq("is_active", true)
    .order("name");

  if (error) {
    console.error("Error fetching leave types:", error);
    throw error;
  }

  return mapToCamelCase(data || []);
}

export async function getLeaveRequests(params?: {
  userId?: string;
  status?: string;
  year?: number;
}) {
  let query = supabase
    .from("leave_requests")
    .select(
      `*, leave_type:leave_types!leave_type_id(id, name, is_paid),
       user:users!user_id(id, full_name, avatar_url)`,
    )
    .order("created_at", { ascending: false });

  if (params?.userId) {
    query = query.eq("user_id", params.userId);
  }

  if (params?.status) {
    query = query.eq("status", params.status);
  }

  if (params?.year) {
    query = query
      .gte("start_date", `${params.year}-01-01`)
      .lte("start_date", `${params.year}-12-31`);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching leave requests:", error);
    throw error;
  }

  return mapToCamelCase(data || []);
}

export async function getLeaveBalances(userId?: string, year?: number) {
  const currentYear = year || new Date().getFullYear();

  let query = supabase
    .from("leave_balances")
    .select(`*, leave_type:leave_types!leave_type_id(id, name)`)
    .eq("year", currentYear);

  if (userId) {
    query = query.eq("user_id", userId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching leave balances:", error);
    throw error;
  }

  return mapToCamelCase(data || []);
}
