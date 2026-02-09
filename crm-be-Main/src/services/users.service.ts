import { supabaseAdmin } from "../config/supabase.js";
import { ApiError } from "../utils/responses.js";
import { ERROR_CODES } from "../utils/error-codes.js";
import { USER_ROLES, type UserRole } from "../config/constants.js";
import { getTimestampIST } from "../utils/date-utils.js";
import {
  parsePaginationParams,
  calculatePaginationMeta,
  calculateOffset,
  parseSortParams,
  parseArrayParam,
  parseBooleanParam,
} from "../utils/pagination.js";
import type { PaginatedResult, AuthUser } from "../types/api.types.js";
import type {
  UpdateUserInput,
  UpdateProfileInput,
  UserListQuery,
  UpdatePreferencesInput,
} from "../validators/users.validator.js";

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
  departmentName?: string | null;
  departmentSlug?: string | null;
  jobTitle?: string | null;
  shiftType?: string | null;
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

function mapUserRowToRecord(u: UserRow): UserRecord {
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

  // Role-based filtering
  // Role-based filtering
  if (authUser.role === USER_ROLES.MANAGER && authUser.departmentId) {
    // Check if HR
    const { data: dept } = await supabaseAdmin
      .from("departments")
      .select("slug")
      .eq("id", authUser.departmentId)
      .single();

    if (dept?.slug !== "hr") {
      // Managers (non-HR) see only members in their department
      baseQuery = baseQuery.eq("department_id", authUser.departmentId);
    }
  } else if (authUser.role === USER_ROLES.MANAGER && authUser.teamId) {
    // Fallback to team if no department id (legacy/edge case)
    // Assuming non-HR if no department ID is present or if it falls back here
    baseQuery = baseQuery.eq("team_id", authUser.teamId);
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

  const users: UserRecord[] = (data || []).map((u: UserRow) =>
    mapUserRowToRecord(u as unknown as UserRow),
  );

  return {
    data: users,
    meta: calculatePaginationMeta(count || 0, pagination),
  };
}

/**
 * Get user by ID
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

  return mapUserRowToRecord(data as unknown as UserRow);
}

/**
 * Update user
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
  if (input.departmentId !== undefined) {
    updateData["department_id"] = input.departmentId;

    // If department changed and no new team provided, reset team_id to avoid inconsistency
    // unless the existing team belongs to the new department (which is complex to check here),
    // so safest is to reset or let the user re-assign team.
    if (input.teamId === undefined && input.departmentId !== null) {
      // Ideally we should check if current team is valid for new dept,
      // but for now let's reset it to null to force reassignment or auto-assignment if we had logic for it.
      // However, to be safe and avoid "homeless" users, we can leave it or set to null.
      // Let's set to null if department changes effectively.
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

  return mapUserRowToRecord(data as unknown as UserRow);
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
