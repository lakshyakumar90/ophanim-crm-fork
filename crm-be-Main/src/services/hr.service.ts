import { supabaseAdmin } from "../config/supabase.js";
import { ApiError } from "../utils/responses.js";
import { ERROR_CODES } from "../utils/error-codes.js";
import { USER_ROLES } from "../config/constants.js";
import type { AuthUser } from "../types/api.types.js";

// Employee record for HR view
export interface HREmployeeRecord {
  id: string;
  fullName: string;
  email: string;
  role: string;
  departmentId: string | null;
  departmentName: string | null;
  teamId: string | null;
  teamName: string | null;
  jobTitle: string | null;
  avatarUrl: string | null;
  isActive: boolean;
  createdAt: string;
  shiftType: string | null;
  timezone: string | null;
  country: string | null;
  address: string | null;
}

// HR Analytics data
export interface HRAnalytics {
  totalEmployees: number;
  activeEmployees: number;
  newJoinersThisMonth: number;
  departmentBreakdown: { department: string; count: number }[];
  roleBreakdown: { role: string; count: number }[];
  jobTitleBreakdown: { jobTitle: string; count: number }[];
  leaveUsageByType: {
    leaveType: string;
    totalDays: number;
    requestCount: number;
  }[];
  monthlyHeadcount: { month: string; count: number }[];
  attendanceStats: {
    presentToday: number;
    absentToday: number;
    lateToday: number;
    onLeaveToday: number;
  };
}

/**
 * Get all employees for HR directory
 */
export async function getEmployeeDirectory(
  authUser: AuthUser,
): Promise<HREmployeeRecord[]> {
  const { data, error } = await supabaseAdmin
    .from("users")
    .select(
      `
      id,
      full_name,
      email,
      role,
      team_id,
      department_id,
      job_title,
      avatar_url,
      is_active,
      created_at,
      shift_type,
      timezone,
      country,
      address,
      teams:team_id (
        id,
        name,
        department_id,
        departments:department_id (
          id,
          name
        )
      ),
      department:departments!department_id (
        id,
        name
      )
    `,
    )
    .order("full_name", { ascending: true });

  if (error) {
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
  }

  return (data || []).map((user: any) => {
    // Prefer direct department_id, fallback to team's department
    const departmentId =
      user.department_id || user.teams?.departments?.id || null;
    const departmentName =
      user.department?.name || user.teams?.departments?.name || null;

    return {
      id: user.id,
      fullName: user.full_name,
      email: user.email,
      role: user.role,
      departmentId,
      departmentName,
      teamId: user.team_id,
      teamName: user.teams?.name || null,
      jobTitle: user.job_title,
      avatarUrl: user.avatar_url,
      isActive: user.is_active,
      createdAt: user.created_at,
      shiftType: user.shift_type || null,
      timezone: user.timezone || null,
      country: user.country || null,
      address: user.address || null,
    };
  });
}

/**
 * Get single employee details
 */
export async function getEmployeeById(
  employeeId: string,
): Promise<HREmployeeRecord> {
  const { data, error } = await supabaseAdmin
    .from("users")
    .select(
      `
      id,
      full_name,
      email,
      role,
      team_id,
      job_title,
      avatar_url,
      is_active,
      created_at,
      shift_type,
      timezone,
      country,
      address,
      teams:team_id (
        id,
        name,
        department_id,
        departments:department_id (
          id,
          name
        )
      )
    `,
    )
    .eq("id", employeeId)
    .single();

  if (error || !data) {
    throw ApiError.notFound("Employee");
  }

  const user = data as any;
  return {
    id: user.id,
    fullName: user.full_name,
    email: user.email,
    role: user.role,
    departmentId: user.teams?.departments?.id || null,
    departmentName: user.teams?.departments?.name || null,
    teamId: user.team_id,
    teamName: user.teams?.name || null,
    jobTitle: user.job_title,
    avatarUrl: user.avatar_url,
    isActive: user.is_active,
    createdAt: user.created_at,
    shiftType: user.shift_type || null,
    timezone: user.timezone || null,
    country: user.country || null,
    address: user.address || null,
  };
}

/**
 * Update employee profile with role-based field restrictions:
 *  - employee (self only): timezone, country, address
 *  - manager:             fullName, jobTitle
 *  - admin:               all fields
 */
export async function updateEmployeeProfile(
  employeeId: string,
  input: {
    fullName?: string;
    jobTitle?: string;
    teamId?: string | null;
    isActive?: boolean;
    timezone?: string | null;
    country?: string | null;
    address?: string | null;
  },
  authUser: AuthUser,
): Promise<HREmployeeRecord> {
  if (authUser.role === USER_ROLES.EMPLOYEE) {
    if (employeeId !== authUser.id) {
      throw new ApiError(
        ERROR_CODES.FORBIDDEN,
        "Employees can only edit their own profile",
      );
    }
    // Employees may only update their own timezone, country, and address
    const updateData: Record<string, unknown> = {};
    if (input.timezone !== undefined) updateData.timezone = input.timezone;
    if (input.country !== undefined) updateData.country = input.country;
    if (input.address !== undefined) updateData.address = input.address;

    if (Object.keys(updateData).length === 0) {
      // Nothing allowed to update — return current record unchanged
      return getEmployeeById(employeeId);
    }

    const { error } = await supabaseAdmin
      .from("users")
      .update(updateData)
      .eq("id", employeeId);

    if (error) throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
    return getEmployeeById(employeeId);
  }

  if (authUser.role === USER_ROLES.MANAGER) {
    const updateData: Record<string, unknown> = {};
    if (input.fullName !== undefined) updateData.full_name = input.fullName;
    if (input.jobTitle !== undefined) updateData.job_title = input.jobTitle;

    if (Object.keys(updateData).length > 0) {
      const { error } = await supabaseAdmin
        .from("users")
        .update(updateData)
        .eq("id", employeeId);
      if (error) throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
    }
    return getEmployeeById(employeeId);
  }

  // Admin: all fields
  const updateData: Record<string, unknown> = {};
  if (input.fullName !== undefined) updateData.full_name = input.fullName;
  if (input.jobTitle !== undefined) updateData.job_title = input.jobTitle;
  if (input.teamId !== undefined) updateData.team_id = input.teamId;
  if (input.isActive !== undefined) updateData.is_active = input.isActive;
  if (input.timezone !== undefined) updateData.timezone = input.timezone;
  if (input.country !== undefined) updateData.country = input.country;
  if (input.address !== undefined) updateData.address = input.address;

  const { error } = await supabaseAdmin
    .from("users")
    .update(updateData)
    .eq("id", employeeId);

  if (error) throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);

  return getEmployeeById(employeeId);
}

/**
 * Get HR Analytics with comprehensive data
 */
export async function getHRAnalytics(): Promise<HRAnalytics> {
  // Get all employees
  const { data: users, error } = await supabaseAdmin.from("users").select(
    `
      id,
      role,
      job_title,
      is_active,
      created_at,
      teams:team_id (
        departments:department_id (
          name
        )
      )
    `,
  );

  if (error) {
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
  }

  const allUsers = users || [];
  const totalEmployees = allUsers.length;
  const activeEmployees = allUsers.filter((u: any) => u.is_active).length;

  // New joiners this month
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const newJoinersThisMonth = allUsers.filter(
    (u: any) => new Date(u.created_at) >= startOfMonth,
  ).length;

  // Department breakdown
  const deptCounts: Record<string, number> = {};
  allUsers.forEach((u: any) => {
    const deptName = u.teams?.departments?.name || "Unassigned";
    deptCounts[deptName] = (deptCounts[deptName] || 0) + 1;
  });
  const departmentBreakdown = Object.entries(deptCounts).map(
    ([department, count]) => ({ department, count }),
  );

  // Role breakdown
  const roleCounts: Record<string, number> = {};
  allUsers.forEach((u: any) => {
    roleCounts[u.role] = (roleCounts[u.role] || 0) + 1;
  });
  const roleBreakdown = Object.entries(roleCounts).map(([role, count]) => ({
    role,
    count,
  }));

  // Job title breakdown
  const jobTitleCounts: Record<string, number> = {};
  allUsers.forEach((u: any) => {
    const title = u.job_title || "Not Specified";
    jobTitleCounts[title] = (jobTitleCounts[title] || 0) + 1;
  });
  const jobTitleBreakdown = Object.entries(jobTitleCounts).map(
    ([jobTitle, count]) => ({ jobTitle, count }),
  );

  // Monthly headcount (last 6 months)
  const monthlyHeadcount: { month: string; count: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    const count = allUsers.filter(
      (u: any) => new Date(u.created_at) <= monthEnd,
    ).length;
    const monthStr = date.toLocaleDateString("en-US", {
      month: "short",
      year: "2-digit",
    });
    monthlyHeadcount.push({ month: monthStr, count });
  }

  // Leave usage by type (current year)
  const currentYear = new Date().getFullYear();
  const { data: leaveData } = await supabaseAdmin
    .from("leave_requests")
    .select(
      `
      total_days,
      leave_types:leave_type_id (name)
    `,
    )
    .eq("status", "approved")
    .gte("start_date", `${currentYear}-01-01`);

  const leaveUsage: Record<
    string,
    { totalDays: number; requestCount: number }
  > = {};
  (leaveData || []).forEach((lr: any) => {
    const typeName = lr.leave_types?.name || "Other";
    if (!leaveUsage[typeName]) {
      leaveUsage[typeName] = { totalDays: 0, requestCount: 0 };
    }
    leaveUsage[typeName].totalDays += parseFloat(lr.total_days) || 0;
    leaveUsage[typeName].requestCount += 1;
  });
  const leaveUsageByType = Object.entries(leaveUsage).map(
    ([leaveType, data]) => ({
      leaveType,
      totalDays: data.totalDays,
      requestCount: data.requestCount,
    }),
  );

  // Today's attendance stats
  const today = new Date().toISOString().split("T")[0];
  const { data: attendanceData } = await supabaseAdmin
    .from("attendance")
    .select("status")
    .eq("date", today);

  const attendanceStats = {
    presentToday: 0,
    absentToday: 0,
    lateToday: 0,
    onLeaveToday: 0,
  };
  (attendanceData || []).forEach((a: any) => {
    if (a.status === "present") attendanceStats.presentToday++;
    else if (a.status === "absent") attendanceStats.absentToday++;
    else if (a.status === "late") attendanceStats.lateToday++;
    else if (a.status === "leave") attendanceStats.onLeaveToday++;
  });

  return {
    totalEmployees,
    activeEmployees,
    newJoinersThisMonth,
    departmentBreakdown,
    roleBreakdown,
    jobTitleBreakdown,
    leaveUsageByType,
    monthlyHeadcount,
    attendanceStats,
  };
}

/**
 * Get employees on leave today
 */
export async function getEmployeesOnLeaveToday(): Promise<
  { userId: string; userName: string }[]
> {
  const today = new Date().toISOString().split("T")[0];

  const { data, error } = await supabaseAdmin
    .from("attendance")
    .select(
      `
      user_id,
      users:user_id (full_name)
    `,
    )
    .eq("date", today)
    .eq("status", "leave");

  if (error) {
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
  }

  return (data || []).map((record: any) => ({
    userId: record.user_id,
    userName: record.users?.full_name || "Unknown",
  }));
}
