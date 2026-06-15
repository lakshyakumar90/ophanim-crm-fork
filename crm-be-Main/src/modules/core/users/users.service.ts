import { supabaseAdmin } from "../../../config/supabase.js";
import { ApiError } from "../../../utils/responses.js";
import { ERROR_CODES } from "../../../utils/error-codes.js";
import { USER_ROLES, type UserRole } from "../../../config/constants.js";
import { getTimestampIST } from "../../../utils/date-utils.js";
import { logActivity } from "../../shared/activity-events.service.js";
import {
  parsePaginationParams,
  calculatePaginationMeta,
  calculateOffset,
  parseSortParams,
  parseArrayParam,
  parseBooleanParam,
} from "../../../utils/pagination.js";
import type { PaginatedResult, AuthUser } from "../../../types/api.types.js";
import type {
  UpdateUserInput,
  UpdateProfileInput,
  UserListQuery,
  UpdatePreferencesInput,
  BulkUpdateUsersInput,
} from "../users/users.validator.js";

interface UserRecord {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  teamId: string | null;
  managerId: string | null;
  phone: string | null;
  avatarUrl: string | null;
  isActive: boolean;
  themePreference: string;
  primaryColor: string;
  is2faEnabled: boolean;
  notificationPreferences: Record<string, boolean>;
  lastLogin: string | null;
  createdAt: string;
  updatedAt: string;
  departmentId?: string | null;
  departmentIds?: string[];                       // All departments user belongs to
  departmentName?: string | null;
  departmentSlug?: string | null;
  jobTitle?: string | null;
  shiftType?: string | null;
  currentCtc?: number | null;
  salaryComponents?: Record<string, unknown> | null;
  salaryBandId?: string | null;
}

// Type for user row from database
interface UserRow {
  id: string;
  email: string;
  full_name: string;
  role: string;
  team_id: string | null;
  department_id: string | null;
  manager_id: string | null;
  phone: string | null;
  avatar_url: string | null;
  is_active: boolean;
  theme_preference: string;
  primary_color: string;
  is_2fa_enabled: boolean;
  notification_preferences: Record<string, boolean>;
  last_login: string | null;
  created_at: string;
  updated_at: string;
  job_title: string | null;
  shift_type: string | null;
  team?: {
    department_id: string;
    department?: { name: string; slug: string };
  } | null;
  department?: { name: string; slug: string } | null;
}

interface EmployeeProfileCompRow {
  user_id: string;
  current_ctc: number | null;
  salary_components: Record<string, unknown> | null;
  salary_band_id?: string | null;
}

let employeeProfilesHasSalaryBandColumn: boolean | null = null;

async function hasEmployeeProfilesSalaryBandColumn(): Promise<boolean> {
  if (employeeProfilesHasSalaryBandColumn !== null) {
    return employeeProfilesHasSalaryBandColumn;
  }

  const { error } = await supabaseAdmin
    .from("employee_profiles")
    .select("salary_band_id")
    .limit(1);

  if (!error) {
    employeeProfilesHasSalaryBandColumn = true;
    return true;
  }

  const msg = (error.message || "").toLowerCase();
  if (msg.includes("salary_band_id") || msg.includes("schema cache")) {
    employeeProfilesHasSalaryBandColumn = false;
    return false;
  }

  // Unknown error: fail open to avoid dropping expected data paths.
  employeeProfilesHasSalaryBandColumn = true;
  return true;
}

async function getEmployeeProfilesByUserIds(userIds: string[]) {
  if (userIds.length === 0) {
    return new Map<string, EmployeeProfileCompRow>();
  }

  const hasSalaryBandColumn = await hasEmployeeProfilesSalaryBandColumn();
  const selectFields = hasSalaryBandColumn
    ? "user_id, current_ctc, salary_components, salary_band_id"
    : "user_id, current_ctc, salary_components";

  const { data, error } = await supabaseAdmin
    .from("employee_profiles")
    .select(selectFields)
    .in("user_id", userIds);

  if (error || !Array.isArray(data)) {
    return new Map<string, EmployeeProfileCompRow>();
  }

  return new Map(
    (data as unknown as EmployeeProfileCompRow[]).map((row) => [row.user_id, row]),
  );
}

function mapUserRowToRecord(
  u: UserRow,
  profile?: EmployeeProfileCompRow,
): UserRecord {
  // Prefer direct department_id, fallback to team's department
  const departmentId = u.department_id || u.team?.department_id || null;
  const departmentName = u.department?.name || u.team?.department?.name || null;
  const departmentSlug = u.department?.slug || u.team?.department?.slug || null;

  return {
    id: u.id,
    email: u.email,
    fullName: u.full_name,
    role: u.role as UserRole,
    teamId: u.team_id,
    managerId: u.manager_id,
    phone: u.phone,
    avatarUrl: u.avatar_url,
    isActive: u.is_active,
    themePreference: u.theme_preference || "system",
    primaryColor: u.primary_color || "indigo",
    is2faEnabled: u.is_2fa_enabled || false,
    notificationPreferences: u.notification_preferences || {
      email: true,
      push: true,
    },
    lastLogin: u.last_login,
    createdAt: u.created_at,
    updatedAt: u.updated_at,
    departmentId,
    departmentName,
    departmentSlug,
    jobTitle: u.job_title || null,
    shiftType: u.shift_type || null,
    currentCtc: profile?.current_ctc ?? null,
    salaryComponents: profile?.salary_components ?? null,
    salaryBandId: profile?.salary_band_id ?? null,
  };
}

/**
 * Get paginated list of users
 */
export async function getUsers(
  query: UserListQuery,
  authUser: AuthUser,
): Promise<PaginatedResult<UserRecord>> {
  const pagination = parsePaginationParams(query);
  const { sortBy, ascending } = parseSortParams(
    query,
    ["created_at", "full_name", "email", "role"],
    "created_at",
  );

  let baseQuery = supabaseAdmin.from("users").select(
    `
    *,
    team:teams!team_id(department_id, department:departments(name, slug)),
    department:departments!department_id(name, slug)
  `,
    { count: "exact" },
  );

  // Role-based filtering: admins, isGlobal, and crm:admin see all users
  const isAdminOrGlobal =
    authUser.role === USER_ROLES.ADMIN ||
    authUser.isGlobal ||
    (authUser.permissions ?? []).includes("crm:admin");
  if (!isAdminOrGlobal && authUser.role === USER_ROLES.MANAGER) {
    const deptIds =
      (authUser.departmentIds?.length ?? 0) > 0
        ? authUser.departmentIds!
        : authUser.departmentId
          ? [authUser.departmentId]
          : [];
    if (deptIds.length > 0) {
      // Multi-department: use .in(); single department: check HR and project members
      if (deptIds.length > 1) {
        baseQuery = baseQuery.in("department_id", deptIds);
      } else {
        const deptId = deptIds[0];
        const { data: dept } = await supabaseAdmin
          .from("departments")
          .select("slug")
          .eq("id", deptId)
          .single();
        if (dept?.slug !== "hr") {
          const { data: managedProjects } = await supabaseAdmin
            .from("projects")
            .select("id")
            .eq("manager_id", authUser.id);
          const managedProjectIds = managedProjects?.map((p: { id: string }) => p.id) || [];
          let extraMemberIds: string[] = [];
          if (managedProjectIds.length > 0) {
            const { data: pm } = await supabaseAdmin
              .from("project_members")
              .select("user_id")
              .in("project_id", managedProjectIds);
            extraMemberIds = pm?.map((m: { user_id: string }) => m.user_id) || [];
          }
          if (extraMemberIds.length > 0) {
            const uniqueMembers = Array.from(new Set(extraMemberIds));
            baseQuery = baseQuery.or(
              `department_id.eq.${deptId},id.in.(${uniqueMembers.join(",")})`,
            );
          } else {
            baseQuery = baseQuery.eq("department_id", deptId);
          }
        }
      }
    } else if (authUser.teamId) {
      baseQuery = baseQuery.eq("team_id", authUser.teamId);
    }
  }

  // Filters
  if (query.role) {
    const roles = parseArrayParam(query.role);
    if (roles.length > 0) {
      baseQuery = baseQuery.in("role", roles);
    }
  }

  if (query.teamId) {
    baseQuery = baseQuery.eq("team_id", query.teamId);
  }

  if (query.isActive !== undefined) {
    const isActive = parseBooleanParam(query.isActive);
    if (isActive !== undefined) {
      baseQuery = baseQuery.eq("is_active", isActive);
    }
  }

  if (query.search) {
    baseQuery = baseQuery.or(
      `full_name.ilike.%${query.search}%,email.ilike.%${query.search}%`,
    );
  }

  // Filter by department
  if (query.departmentId) {
    // Users can be linked to department directly via department_id OR via team_id -> team -> department_id
    // But for simpler filtering where department_id is likely synced or primary:
    baseQuery = baseQuery.eq("department_id", query.departmentId);
  }

  // Filter by job title
  if (query.jobTitle) {
    const jobTitles = parseArrayParam(query.jobTitle);
    if (jobTitles.length > 0) {
      baseQuery = baseQuery.in("job_title", jobTitles);
    }
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

  const userRows = (data || []) as UserRow[];
  const profileMap = await getEmployeeProfilesByUserIds(userRows.map((u) => u.id));
  
  // Fetch all department associations for these users
  const userIds = userRows.map((u) => u.id);
  const { data: allUserDepts } = await supabaseAdmin
    .from("user_departments")
    .select("user_id, department_id, is_primary")
    .in("user_id", userIds)
    .order("is_primary", { ascending: false })
    .order("assigned_at", { ascending: true });

  // Map departmentIds by user
  const deptsByUserId = new Map<string, string[]>();
  if (allUserDepts) {
    for (const ud of allUserDepts as any[]) {
      if (!deptsByUserId.has(ud.user_id)) {
        deptsByUserId.set(ud.user_id, []);
      }
      deptsByUserId.get(ud.user_id)!.push(ud.department_id);
    }
  }

  const users: UserRecord[] = userRows.map((u) => {
    const record = mapUserRowToRecord(u, profileMap.get(u.id));
    const depts = deptsByUserId.get(u.id);
    if (depts && depts.length > 0) {
      record.departmentIds = depts;
    }
    return record;
  });

  return {
    data: users,
    meta: calculatePaginationMeta(count || 0, pagination),
  };
}

/**
 * Get user by ID - includes all department associations
 */
export async function getUserById(userId: string): Promise<UserRecord> {
  const { data, error } = await supabaseAdmin
    .from("users")
    .select(
      `
      *,
      team:teams!team_id(department_id, department:departments(name, slug)),
      department:departments!department_id(name, slug)
    `,
    )
    .eq("id", userId)
    .single();

  if (error || !data) {
    throw ApiError.notFound("User");
  }

  const row = data as unknown as UserRow;
  const profileMap = await getEmployeeProfilesByUserIds([row.id]);
  const userRecord = mapUserRowToRecord(row, profileMap.get(row.id));

  // Fetch all department associations
  const { data: userDepts } = await supabaseAdmin
    .from("user_departments")
    .select("department_id, is_primary")
    .eq("user_id", userId)
    .order("is_primary", { ascending: false })
    .order("assigned_at", { ascending: true });

  if (userDepts && userDepts.length > 0) {
    userRecord.departmentIds = userDepts.map((ud: any) => ud.department_id);
  }

  return userRecord;
}

/**
 * Update user - supports both single department and multiple departments
 */
export async function updateUser(
  userId: string,
  input: UpdateUserInput,
): Promise<UserRecord> {
  const updateData: Record<string, unknown> = {};

  if (input.email !== undefined)
    updateData["email"] = input.email.toLowerCase();
  if (input.fullName !== undefined) updateData["full_name"] = input.fullName;
  if (input.role !== undefined) updateData["role"] = input.role;
  
  // Handle both departmentId (singular, for backward compatibility) and departmentIds (array)
  if (input.departmentId !== undefined) {
    updateData["department_id"] = input.departmentId;

    // If department changed and no new team provided, reset team_id to avoid inconsistency
    if (input.teamId === undefined && input.departmentId !== null) {
      updateData["team_id"] = null;
    }
  }

  if (input.teamId !== undefined) updateData["team_id"] = input.teamId;
  if (input.managerId !== undefined) updateData["manager_id"] = input.managerId;
  if (input.phone !== undefined) updateData["phone"] = input.phone;
  if (input.avatarUrl !== undefined) updateData["avatar_url"] = input.avatarUrl;
  if (input.isActive !== undefined) updateData["is_active"] = input.isActive;
  if (input.jobTitle !== undefined) updateData["job_title"] = input.jobTitle;

  // New fields
  if (input.themePreference !== undefined)
    updateData["theme_preference"] = input.themePreference;
  if (input.primaryColor !== undefined)
    updateData["primary_color"] = input.primaryColor;
  if (input.is2faEnabled !== undefined)
    updateData["is_2fa_enabled"] = input.is2faEnabled;
  if (input.notificationPreferences !== undefined)
    updateData["notification_preferences"] = input.notificationPreferences;
  if (input.shiftType !== undefined)
    updateData["shift_type"] = input.shiftType;

  updateData["updated_at"] = getTimestampIST();

  const { data, error } = await supabaseAdmin
    .from("users")
    .update(updateData)
    .eq("id", userId)
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new ApiError(ERROR_CODES.ALREADY_EXISTS, "Email already exists");
    }
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
  }

  if (!data) {
    throw ApiError.notFound("User");
  }

  // Handle multi-department assignment if provided
  if (input.departmentIds && Array.isArray(input.departmentIds) && input.departmentIds.length > 0) {
    // Delete existing department assignments
    await supabaseAdmin
      .from("user_departments")
      .delete()
      .eq("user_id", userId);

    // Insert new department assignments
    const departmentRecords = input.departmentIds.map((deptId, index) => ({
      user_id: userId,
      department_id: deptId,
      is_primary: index === 0, // First department is primary
      job_title: input.jobTitle || null,
      shift_type: input.shiftType || null,
    }));

    const { error: insertError } = await supabaseAdmin
      .from("user_departments")
      .insert(departmentRecords);

    if (insertError) {
      throw new ApiError(ERROR_CODES.DATABASE_ERROR, insertError.message);
    }

    // Update primary department_id on users table to match first department
    if (input.departmentIds.length > 0) {
      const { error: updatePrimaryError } = await supabaseAdmin
        .from("users")
        .update({ department_id: input.departmentIds[0] })
        .eq("id", userId);

      if (updatePrimaryError) {
        throw new ApiError(ERROR_CODES.DATABASE_ERROR, updatePrimaryError.message);
      }
    }
  }

  // Handle department-specific data if provided
  if (
    input.departmentSpecificData &&
    Array.isArray(input.departmentSpecificData) &&
    input.departmentSpecificData.length > 0
  ) {
    for (const deptData of input.departmentSpecificData) {
      const { error: patchError } = await supabaseAdmin
        .from("user_departments")
        .update({
          job_title: deptData.jobTitle,
          shift_type: deptData.shiftType,
        })
        .eq("user_id", userId)
        .eq("department_id", deptData.departmentId);

      if (patchError) {
        throw new ApiError(ERROR_CODES.DATABASE_ERROR, patchError.message);
      }
    }
  }

  const shouldUpdateCompensation =
    input.currentCtc !== undefined ||
    input.salaryComponents !== undefined ||
    input.salaryBandId !== undefined;

  if (shouldUpdateCompensation) {
    const hasSalaryBandColumn = await hasEmployeeProfilesSalaryBandColumn();
    const profileUpdate: Record<string, unknown> = {
      updated_at: getTimestampIST(),
    };

    if (input.currentCtc !== undefined) profileUpdate["current_ctc"] = input.currentCtc;
    if (input.salaryComponents !== undefined)
      profileUpdate["salary_components"] = input.salaryComponents;
    if (hasSalaryBandColumn && input.salaryBandId !== undefined) {
      profileUpdate["salary_band_id"] = input.salaryBandId;
    }

    const { data: existingProfile } = await supabaseAdmin
      .from("employee_profiles")
      .select("user_id, current_ctc")
      .eq("user_id", userId)
      .maybeSingle();

    if (existingProfile) {
      const { error: profileError } = await supabaseAdmin
        .from("employee_profiles")
        .update(profileUpdate)
        .eq("user_id", userId);
      if (profileError) {
        throw new ApiError(ERROR_CODES.DATABASE_ERROR, profileError.message);
      }

      if (
        typeof input.currentCtc === "number" &&
        input.currentCtc !== existingProfile.current_ctc
      ) {
        const previous = existingProfile.current_ctc;
        const next = input.currentCtc;
        const changePercentage =
          previous && previous > 0
            ? Math.round((((next - previous) / previous) * 100) * 100) / 100
            : null;

        await supabaseAdmin.from("employee_compensation_history").insert({
          employee_id: userId,
          effective_date: new Date().toISOString().split("T")[0],
          previous_ctc: previous,
          new_ctc: next,
          change_percentage: changePercentage,
          reason: "User profile compensation update",
        });
      }
    } else {
      const { error: profileInsertError } = await supabaseAdmin
        .from("employee_profiles")
        .insert(
          hasSalaryBandColumn
            ? {
                user_id: userId,
                current_ctc: input.currentCtc ?? null,
                salary_components: input.salaryComponents ?? null,
                salary_band_id: input.salaryBandId ?? null,
              }
            : {
                user_id: userId,
                current_ctc: input.currentCtc ?? null,
                salary_components: input.salaryComponents ?? null,
              },
        );
      if (profileInsertError) {
        throw new ApiError(ERROR_CODES.DATABASE_ERROR, profileInsertError.message);
      }

      if (input.currentCtc !== undefined) {
        await supabaseAdmin.from("employee_compensation_history").insert({
          employee_id: userId,
          effective_date: new Date().toISOString().split("T")[0],
          previous_ctc: null,
          new_ctc: input.currentCtc,
          change_percentage: null,
          reason: "Initial compensation setup",
        });
      }
    }
  }

  // Log activity for significant updates
  const activityType = "profile_update";
  let description = "Profile updated";
  const updates = Object.keys(updateData).filter(
    (k) => k !== "updated_at" && k !== "updated_by",
  );

  if (updates.length > 0) {
    const changes: string[] = [];
    if (input.role) changes.push(`Role to '${input.role}'`);
    if (input.jobTitle) changes.push(`Job Title to '${input.jobTitle}'`);
    if (input.departmentId) changes.push(`Department updated`);
    if (input.isActive !== undefined)
      changes.push(`Status to '${input.isActive ? "Active" : "Inactive"}'`);
    if (input.fullName) changes.push(`Name updated`);
    if (input.email) changes.push(`Email updated`);

    if (changes.length > 0) {
      description = `Updated ${changes.join(", ")}`;
    } else {
      description = `Updated fields: ${updates.join(", ")}`;
    }
  }

  await supabaseAdmin.from("user_activities").insert({
    user_id: userId,
    entity_type: "user",
    entity_id: userId,
    activity_type: activityType,
    title: "Profile updated",
    description: description,
    metadata: { updates, input },
  });

  await logActivity({
    actorId: userId,
    entityType: "user",
    entityId: userId,
    eventType: "profile_updated",
    source: "user",
    metadata: { updates },
  });

  return getUserById((data as unknown as UserRow).id);
}

/**
 * Update own profile
 */
export async function updateProfile(
  userId: string,
  input: UpdateProfileInput,
): Promise<UserRecord> {
  return updateUser(userId, input);
}

/**
 * Bulk update users
 */
export async function bulkUpdateUsers(input: BulkUpdateUsersInput): Promise<{
  succeeded: UserRecord[];
  failed: Array<{ id: string; message: string }>;
}> {
  const succeeded: UserRecord[] = [];
  const failed: Array<{ id: string; message: string }> = [];

  for (const item of input.updates) {
    try {
      const user = await updateUser(item.id, item.data);
      succeeded.push(user);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown update error";
      failed.push({ id: item.id, message });
    }
  }

  return { succeeded, failed };
}

/**
 * Deactivate user (soft delete)
 */
export async function deactivateUser(userId: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from("users")
    .update({ is_active: false, updated_at: getTimestampIST() })
    .eq("id", userId);

  if (error) {
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
  }

  // Revoke all refresh tokens
  await supabaseAdmin
    .from("refresh_tokens")
    .update({ is_revoked: true })
    .eq("user_id", userId);
}

/**
 * Activate user
 */
export async function activateUser(userId: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from("users")
    .update({ is_active: true, updated_at: getTimestampIST() })
    .eq("id", userId);

  if (error) {
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
  }
}

/**
 * Get team members
 */
export async function getTeamMembers(teamId: string): Promise<UserRecord[]> {
  const { data, error } = await supabaseAdmin
    .from("users")
    .select("*")
    .eq("team_id", teamId)
    .order("full_name");

  if (error) {
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
  }

  return (data || []).map((u: UserRow) =>
    mapUserRowToRecord(u as unknown as UserRow),
  );
}

/**
 * Get all members from teams managed by the given manager.
 * Supports managers who are linked via teams.manager_id even when users.team_id is null.
 */
export async function getTeamMembersForManager(
  managerId: string,
  fallbackTeamId?: string | null,
): Promise<UserRecord[]> {
  const teamIds = new Set<string>();

  if (fallbackTeamId) {
    teamIds.add(fallbackTeamId);
  }

  const { data: managedTeams, error: teamError } = await supabaseAdmin
    .from("teams")
    .select("id")
    .eq("manager_id", managerId);

  if (teamError) {
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, teamError.message);
  }

  for (const team of managedTeams || []) {
    if (team.id) {
      teamIds.add(team.id);
    }
  }

  if (teamIds.size === 0) {
    return [];
  }

  const { data, error } = await supabaseAdmin
    .from("users")
    .select("*")
    .in("team_id", Array.from(teamIds))
    .eq("is_active", true)
    .order("full_name");

  if (error) {
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
  }

  return (data || []).map((u: UserRow) =>
    mapUserRowToRecord(u as unknown as UserRow),
  );
}

/**
 * Get users by job title(s) - for project team assignment
 */
export async function getUsersByJobTitles(jobTitles: string[]): Promise<
  {
    id: string;
    fullName: string;
    email: string;
    avatarUrl: string | null;
    jobTitle: string | null;
    role: string;
  }[]
> {
  const { data, error } = await supabaseAdmin
    .from("users")
    .select("id, full_name, email, avatar_url, job_title, role")
    .in("job_title", jobTitles)
    .eq("is_active", true)
    .order("full_name");

  if (error) {
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
  }

  return (data || []).map((u: any) => ({
    id: u.id,
    fullName: u.full_name,
    email: u.email,
    avatarUrl: u.avatar_url,
    jobTitle: u.job_title,
    role: u.role,
  }));
}

/**
 * Get users who can be project managers (managers, admins, or those with project_manager job title)
 */
export async function getProjectManagers(): Promise<
  {
    id: string;
    fullName: string;
    email: string;
    avatarUrl: string | null;
    role: string;
  }[]
> {
  const { data, error } = await supabaseAdmin
    .from("users")
    .select("id, full_name, email, avatar_url, role, job_title")
    .eq("is_active", true)
    .or("role.in.(admin,manager),job_title.eq.project_manager")
    .order("full_name");

  if (error) {
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
  }

  return (data || []).map((u: any) => ({
    id: u.id,
    fullName: u.full_name,
    email: u.email,
    avatarUrl: u.avatar_url,
    role: u.role,
  }));
}

export { supabaseAdmin }; // Export for routes if needed, or better expose helper
