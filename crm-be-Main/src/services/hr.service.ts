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
  phone?: string | null;
  role: string;
  departmentId: string | null;
  departmentName: string | null;
  teamId: string | null;
  teamName: string | null;
  managerId?: string | null;
  jobTitle: string | null;
  avatarUrl: string | null;
  isActive: boolean;
  createdAt: string;
  shiftType: string | null;
  timezone: string | null;
  country: string | null;
  address: string | null;
  // Extended HR Profile fields
  employeeId?: string | null;
  dateOfJoining?: string | null;
  hrStatus?: string;
  currentCtc?: number | null;
  salaryComponents?: Record<string, unknown> | null;
  skills?: string[] | null;
  bio?: string | null;
  linkedinUrl?: string | null;
  reportingManagerId?: string | null;
  reportingManagerName?: string | null;
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

type EmployeeProfileRow = {
  user_id: string;
  employee_id: string | null;
  date_of_joining: string | null;
  hr_status: string | null;
  current_ctc: number | null;
  salary_components: Record<string, unknown> | null;
  skills: string[] | null;
  bio: string | null;
  linkedin_url: string | null;
  reporting_manager_id: string | null;
  manager?: {
    full_name?: string | null;
  } | null;
};

async function getEmployeeProfilesMap(
  userIds: string[],
): Promise<Map<string, EmployeeProfileRow>> {
  if (userIds.length === 0) {
    return new Map();
  }

  const { data, error } = await supabaseAdmin
    .from("employee_profiles")
    .select(
      `
      user_id,
      employee_id,
      date_of_joining,
      hr_status,
      current_ctc,
      salary_components,
      skills,
      bio,
      linkedin_url,
      reporting_manager_id,
      manager:users!reporting_manager_id(full_name)
    `,
    )
    .in("user_id", userIds);

  // Keep directory functional even if HR profile table/relations are not deployed yet.
  if (error || !Array.isArray(data)) {
    return new Map();
  }

  return new Map(
    (data as EmployeeProfileRow[]).map((row) => [row.user_id, row]),
  );
}

async function getFallbackCurrentCtcMap(
  userIds: string[],
): Promise<Map<string, number>> {
  if (userIds.length === 0) {
    return new Map();
  }

  const ctcByUserId = new Map<string, number>();

  const { data: compRows } = await supabaseAdmin
    .from("employee_compensation_history")
    .select("employee_id, new_ctc, effective_date, created_at")
    .in("employee_id", userIds)
    .order("effective_date", { ascending: false })
    .order("created_at", { ascending: false });

  for (const row of compRows || []) {
    const employeeId = (row as any).employee_id as string | undefined;
    const ctc = Number((row as any).new_ctc);
    if (!employeeId || !Number.isFinite(ctc) || ctc <= 0) continue;
    if (!ctcByUserId.has(employeeId)) {
      ctcByUserId.set(employeeId, ctc);
    }
  }

  const { data: approvedIncrements } = await supabaseAdmin
    .from("increment_proposals")
    .select("employee_id, proposed_ctc, updated_at, created_at")
    .in("employee_id", userIds)
    .eq("status", "approved")
    .order("updated_at", { ascending: false })
    .order("created_at", { ascending: false });

  for (const row of approvedIncrements || []) {
    const employeeId = (row as any).employee_id as string | undefined;
    const ctc = Number((row as any).proposed_ctc);
    if (!employeeId || !Number.isFinite(ctc) || ctc <= 0) continue;
    if (!ctcByUserId.has(employeeId)) {
      ctcByUserId.set(employeeId, ctc);
    }
  }

  return ctcByUserId;
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
      phone,
      role,
      team_id,
      department_id,
      manager_id,
      job_title,
      avatar_url,
      is_active,
      created_at,
      shift_type,
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
    `
    )
    .order("full_name", { ascending: true });

  if (error) {
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
  }

  const users = (data || []) as any[];
  const profilesByUserId = await getEmployeeProfilesMap(users.map((u) => u.id));
  const fallbackCtcByUserId = await getFallbackCurrentCtcMap(
    users.map((u) => u.id),
  );

  return users.map((user: any) => {
    const profile = profilesByUserId.get(user.id);
    const departmentId = user.teams?.departments?.id || null;
    const departmentName = user.teams?.departments?.name || null;
    const profileCurrentCtc =
      typeof profile?.current_ctc === "number" && profile.current_ctc > 0
        ? profile.current_ctc
        : null;

    return {
      id: user.id,
      fullName: user.full_name,
      email: user.email,
      phone: user.phone || null,
      role: user.role,
      departmentId: user.department_id || departmentId,
      departmentName,
      teamId: user.team_id,
      teamName: user.teams?.name || null,
      managerId: user.manager_id || null,
      jobTitle: user.job_title,
      avatarUrl: user.avatar_url,
      isActive: user.is_active,
      createdAt: user.created_at,
      shiftType: user.shift_type || null,
      timezone: user.timezone || null,
      country: user.country || null,
      address: user.address || null,
      employeeId: profile?.employee_id || null,
      dateOfJoining: profile?.date_of_joining || null,
      hrStatus: profile?.hr_status || "active",
      currentCtc: profileCurrentCtc ?? fallbackCtcByUserId.get(user.id) ?? null,
      salaryComponents: profile?.salary_components || null,
      skills: profile?.skills || [],
      bio: profile?.bio || null,
      linkedinUrl: profile?.linkedin_url || null,
      reportingManagerId: profile?.reporting_manager_id || null,
      reportingManagerName: profile?.manager?.full_name || null,
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
      phone,
      role,
      team_id,
      department_id,
      manager_id,
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
    `
    )
    .eq("id", employeeId)
    .single();

  if (error || !data) {
    throw ApiError.notFound("Employee");
  }

  const user = data as any;
  const profileMap = await getEmployeeProfilesMap([employeeId]);
  const profile = profileMap.get(employeeId);
  const fallbackCtcByUserId = await getFallbackCurrentCtcMap([employeeId]);
  const profileCurrentCtc =
    typeof profile?.current_ctc === "number" && profile.current_ctc > 0
      ? profile.current_ctc
      : null;

  return {
    id: user.id,
    fullName: user.full_name,
    email: user.email,
    phone: user.phone || null,
    role: user.role,
    departmentId: user.department_id || user.teams?.departments?.id || null,
    departmentName: user.teams?.departments?.name || null,
    teamId: user.team_id,
    teamName: user.teams?.name || null,
    managerId: user.manager_id || null,
    jobTitle: user.job_title,
    avatarUrl: user.avatar_url,
    isActive: user.is_active,
    createdAt: user.created_at,
    shiftType: user.shift_type || null,
    timezone: user.timezone || null,
    country: user.country || null,
    address: user.address || null,
    employeeId: profile?.employee_id || null,
    dateOfJoining: profile?.date_of_joining || null,
    hrStatus: profile?.hr_status || "active",
    currentCtc: profileCurrentCtc ?? fallbackCtcByUserId.get(employeeId) ?? null,
    salaryComponents: profile?.salary_components || null,
    skills: profile?.skills || [],
    bio: profile?.bio || null,
    linkedinUrl: profile?.linkedin_url || null,
    reportingManagerId: profile?.reporting_manager_id || null,
    reportingManagerName: profile?.manager?.full_name || null,
  };
}

/**
 * Update employee profile with role-based field restrictions:
 *  - employee (self only): timezone, country, address
 *  - manager:             fullName, jobTitle
 *  - hr/admin:            all fields
 */
export async function updateEmployeeProfile(
  employeeId: string,
  input: {
    email?: string;
    fullName?: string;
    phone?: string | null;
    role?: "admin" | "manager" | "employee" | "hr";
    departmentId?: string | null;
    jobTitle?: string;
    teamId?: string | null;
    managerId?: string | null;
    isActive?: boolean;
    shiftType?: string | null;
    currentCtc?: number | null;
    salaryComponents?: {
      basic_pct?: number;
      hra_pct?: number;
      allowance_pct?: number;
    };
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

  // HR/Admin: all fields
  const updateData: Record<string, unknown> = {};
  if (input.email !== undefined) updateData.email = input.email;
  if (input.fullName !== undefined) updateData.full_name = input.fullName;
  if (input.phone !== undefined) updateData.phone = input.phone;
  if (input.role !== undefined) updateData.role = input.role;
  if (input.departmentId !== undefined) updateData.department_id = input.departmentId;
  if (input.jobTitle !== undefined) updateData.job_title = input.jobTitle;
  if (input.teamId !== undefined) updateData.team_id = input.teamId;
  if (input.managerId !== undefined) updateData.manager_id = input.managerId;
  if (input.isActive !== undefined) updateData.is_active = input.isActive;
  if (input.shiftType !== undefined) updateData.shift_type = input.shiftType;
  if (input.timezone !== undefined) updateData.timezone = input.timezone;
  if (input.country !== undefined) updateData.country = input.country;
  if (input.address !== undefined) updateData.address = input.address;

  if (Object.keys(updateData).length > 0) {
    const { error } = await supabaseAdmin
      .from("users")
      .update(updateData)
      .eq("id", employeeId);
    if (error) throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
  }

  const profileUpdate: Record<string, unknown> = {};
  if (input.currentCtc !== undefined) profileUpdate.current_ctc = input.currentCtc;
  if (input.salaryComponents !== undefined) {
    profileUpdate.salary_components = {
      basic_pct: input.salaryComponents.basic_pct,
      hra_pct: input.salaryComponents.hra_pct,
      allowance_pct: input.salaryComponents.allowance_pct,
    };
  }

  if (Object.keys(profileUpdate).length > 0) {
    const { error: profileError } = await supabaseAdmin
      .from("employee_profiles")
      .upsert(
        {
          user_id: employeeId,
          ...profileUpdate,
        },
        { onConflict: "user_id" },
      );

    if (profileError) {
      throw new ApiError(ERROR_CODES.DATABASE_ERROR, profileError.message);
    }
  }

  return getEmployeeById(employeeId);
}

/**
 * Get Employee Compensation History
 */
export async function getEmployeeCompensationHistory(employeeId: string) {
  const { data, error } = await supabaseAdmin
    .from("employee_compensation_history")
    .select("*, approved_by_user:users!approved_by(full_name)")
    .eq("employee_id", employeeId)
    .order("effective_date", { ascending: false });

  if (error) throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
  return data || [];
}

/**
 * Get Employees approaching probation end
 */
export async function getEmployeesOnProbation(daysFromNow: number = 14) {
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + daysFromNow);
  const targetDateString = targetDate.toISOString().split("T")[0];
  const currentDateString = new Date().toISOString().split("T")[0];

  const { data, error } = await supabaseAdmin
    .from("employee_profiles")
    .select("user_id, probation_end_date, users!user_id(full_name, email), manager:users!reporting_manager_id(id, email, full_name)")
    .eq("hr_status", "probation")
    .gte("probation_end_date", currentDateString)
    .lte("probation_end_date", targetDateString);

  // If employee_profiles table is not present in the DB yet, return empty set
  // so the rest of HR dashboard remains available.
  if (error) return [];
  return data || [];
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
