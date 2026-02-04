import { supabaseAdmin } from "../config/supabase.js";
import { ApiError } from "../utils/responses.js";
import { ERROR_CODES } from "../utils/error-codes.js";
import { getCurrentTimestamp } from "../utils/helpers.js";
import type { UserRole } from "../config/constants.js";
import type { AuthUser } from "../types/api.types.js";

interface TeamRecord {
  id: string;
  name: string;
  managerId: string | null;
  departmentId: string | null;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  memberCount?: number;
}

interface TeamRow {
  id: string;
  name: string;
  manager_id: string | null;
  department_id: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
}

function mapTeamRowToRecord(data: TeamRow): TeamRecord {
  return {
    id: data.id,
    name: data.name,
    managerId: data.manager_id,
    departmentId: data.department_id,
    description: data.description,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

/**
 * Get all teams (admin only - for backward compatibility)
 */
export async function getTeams(): Promise<TeamRecord[]> {
  const { data, error } = await supabaseAdmin
    .from("teams")
    .select("*")
    .order("name");

  if (error) {
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
  }

  const teams = (data || []).map((t: any) =>
    mapTeamRowToRecord(t as unknown as TeamRow),
  );

  // Get member counts
  for (const team of teams) {
    const { count } = await supabaseAdmin
      .from("users")
      .select("id", { count: "exact", head: true })
      .eq("team_id", team.id);
    team.memberCount = count || 0;
  }

  return teams;
}

/**
 * Get teams visible to a specific user based on their role
 * - Employees: See only their own team
 * - Managers: See teams they manage (where they are the manager)
 * - Admins: See all teams
 */

// ...

export async function getTeamsForUser(
  authUser: AuthUser,
): Promise<TeamRecord[]> {
  let query = supabaseAdmin.from("teams").select("*").order("name");

  if (authUser.role === "admin") {
    // Admin sees all teams
  } else if (authUser.role === "manager") {
    // Check if HR
    let isHR = false;
    if (authUser.departmentId) {
      const { data: dept } = await supabaseAdmin
        .from("departments")
        .select("slug")
        .eq("id", authUser.departmentId)
        .single();
      if (dept?.slug === "hr") isHR = true;
    }

    if (!isHR) {
      // Manager sees teams they manage
      query = query.eq("manager_id", authUser.id);
    }
  } else {
    // Employee sees only their own team
    if (!authUser.teamId) {
      return []; // No team assigned
    }
    query = query.eq("id", authUser.teamId);
  }

  const { data, error } = await query;

  if (error) {
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
  }

  const teams = (data || []).map((t: any) =>
    mapTeamRowToRecord(t as unknown as TeamRow),
  );

  // OPTIMIZED: Get all member counts in a single query
  if (teams.length > 0) {
    const teamIds = teams.map((t) => t.id);
    const { data: memberCounts } = await supabaseAdmin
      .from("users")
      .select("team_id")
      .in("team_id", teamIds);

    // Build count map in memory
    const countMap: Record<string, number> = {};
    for (const user of memberCounts || []) {
      const teamId = (user as { team_id: string }).team_id;
      countMap[teamId] = (countMap[teamId] || 0) + 1;
    }

    // Apply counts to teams
    for (const team of teams) {
      team.memberCount = countMap[team.id] || 0;
    }
  }

  return teams;
}

/**
 * Get team by ID
 */
export async function getTeamById(teamId: string): Promise<TeamRecord> {
  const { data, error } = await supabaseAdmin
    .from("teams")
    .select("*")
    .eq("id", teamId)
    .single();

  if (error || !data) {
    throw ApiError.notFound("Team");
  }

  const team = mapTeamRowToRecord(data as unknown as TeamRow);

  // Get member count
  const { count } = await supabaseAdmin
    .from("users")
    .select("id", { count: "exact", head: true })
    .eq("team_id", teamId);
  team.memberCount = count || 0;

  return team;
}

/**
 * Create team
 */
export async function createTeam(input: {
  name: string;
  managerId: string;
  departmentId: string;
  description?: string | null;
}): Promise<TeamRecord> {
  const { data, error } = await supabaseAdmin
    .from("teams")
    .insert({
      name: input.name,
      manager_id: input.managerId,
      department_id: input.departmentId,
      description: input.description || null,
    })
    .select()
    .single();

  if (error) {
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
  }

  // If manager assigned, update their team_id
  if (input.managerId) {
    await supabaseAdmin
      .from("users")
      .update({ team_id: data.id })
      .eq("id", input.managerId);
  }

  // Log activity
  await supabaseAdmin.from("user_activities").insert({
    user_id: input.managerId || data.id, // Fallback if no manager
    entity_type: "team",
    entity_id: data.id,
    activity_type: "team_create",
    title: "Team created",
    description: `Created team: ${input.name}`,
  });

  return mapTeamRowToRecord(data as unknown as TeamRow);
}

/**
 * Update team
 */
export async function updateTeam(
  teamId: string,
  input: {
    name?: string;
    managerId?: string | null;
    departmentId?: string | null;
    description?: string | null;
  },
): Promise<TeamRecord> {
  const updateData: Record<string, unknown> = {};

  if (input.name !== undefined) updateData["name"] = input.name;
  if (input.managerId !== undefined) updateData["manager_id"] = input.managerId;
  if (input.departmentId !== undefined)
    updateData["department_id"] = input.departmentId;
  if (input.description !== undefined)
    updateData["description"] = input.description;
  updateData["updated_at"] = getCurrentTimestamp();

  const { data, error } = await supabaseAdmin
    .from("teams")
    .update(updateData)
    .eq("id", teamId)
    .select()
    .single();

  if (error) {
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
  }

  if (!data) {
    throw ApiError.notFound("Team");
  }

  // Log activity
  await supabaseAdmin.from("user_activities").insert({
    user_id: input.managerId || data.manager_id || data.id,
    entity_type: "team",
    entity_id: teamId,
    activity_type: "team_update",
    title: "Team updated",
    description: `Updated team: ${data.name}`,
    metadata: {
      updates: Object.keys(input),
    },
  });

  return mapTeamRowToRecord(data as unknown as TeamRow);
}

/**
 * Delete team
 */
export async function deleteTeam(teamId: string): Promise<void> {
  // First, remove team_id from all users in this team
  await supabaseAdmin
    .from("users")
    .update({ team_id: null })
    .eq("team_id", teamId);

  const { error } = await supabaseAdmin.from("teams").delete().eq("id", teamId);

  if (error) {
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
  }

  // Log activity
  await supabaseAdmin.from("user_activities").insert({
    user_id: teamId, // No user context available here
    entity_type: "team",
    entity_id: teamId,
    activity_type: "team_delete",
    title: "Team deleted",
    description: "Team deleted",
  });
}

/**
 * Add user to team
 */
export async function addUserToTeam(
  teamId: string,
  userId: string,
): Promise<void> {
  // Verify team exists and get its department
  const team = await getTeamById(teamId);

  // Get user details to check department
  const { data: user, error: userError } = await supabaseAdmin
    .from("users")
    .select("department_id")
    .eq("id", userId)
    .single();

  if (userError || !user) {
    throw ApiError.notFound("User");
  }

  // Enforce department match
  // If team has a department, user must belong to it (or have no department?)
  // User explicitly said: "only show... of that department... do not let other department... add"
  // So strict match if both exist.
  if (
    team.departmentId &&
    user.department_id &&
    team.departmentId !== user.department_id
  ) {
    throw new ApiError(
      ERROR_CODES.FORBIDDEN,
      "User belongs to a different department and cannot be added to this team",
    );
  }

  // If team has department but user doesn't, should we allow?
  // Maybe allow, assuming they are being assigned to this department via the team?
  // But usually users are assigned to department first.
  // The user said "show employees of that department only".
  // Let's enforce strictly: User MUST be in the department if team is in one.
  if (team.departmentId && !user.department_id) {
    // Optional: Auto-assign user to department?
    // Or reject? Matches "only show employees of that department".
    // If they are not in the department, they shouldn't be added.
    throw new ApiError(
      ERROR_CODES.FORBIDDEN,
      "User is not assigned to the team's department",
    );
  }

  const { error } = await supabaseAdmin
    .from("users")
    .update({ team_id: teamId, updated_at: getCurrentTimestamp() })
    .eq("id", userId);

  if (error) {
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
  }

  // Log activity
  await supabaseAdmin.from("user_activities").insert({
    user_id: userId,
    entity_type: "team",
    entity_id: teamId,
    activity_type: "team_join",
    title: "User joined team",
    description: "User added to team",
  });
}

/**
 * Remove user from team
 */
export async function removeUserFromTeam(userId: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from("users")
    .update({ team_id: null, updated_at: getCurrentTimestamp() })
    .eq("id", userId);

  if (error) {
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
  }

  // Log activity
  await supabaseAdmin.from("user_activities").insert({
    user_id: userId,
    entity_type: "team",
    entity_id: userId, // No team ID easily available here without fetching
    activity_type: "team_leave",
    title: "User left team",
    description: "User removed from team",
  });
}

/**
 * Get team members with details
 */
export async function getTeamMembersWithDetails(teamId: string) {
  const { data, error } = await supabaseAdmin
    .from("users")
    .select(
      "id, email, full_name, role, phone, avatar_url, is_active, last_login",
    )
    .eq("team_id", teamId)
    .eq("is_active", true)
    .order("full_name");

  if (error) {
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
  }

  return (data || []).map((u: any) => ({
    id: u.id,
    email: u.email,
    fullName: u.full_name,
    role: u.role as UserRole,
    phone: u.phone,
    avatarUrl: u.avatar_url,
    isActive: u.is_active,
    lastLogin: u.last_login,
  }));
}
