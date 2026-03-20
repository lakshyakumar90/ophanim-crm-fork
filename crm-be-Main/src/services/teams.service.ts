import { supabaseAdmin } from "../config/supabase.js";
import { ApiError } from "../utils/responses.js";
import { ERROR_CODES } from "../utils/error-codes.js";
import { getCurrentTimestamp } from "../utils/helpers.js";
import { logActivity } from "./activity-events.service.js";
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

  // Get member counts from user_teams junction table
  if (teams.length > 0) {
    const teamIds = teams.map((t) => t.id);
    const { data: memberRows } = await supabaseAdmin
      .from("user_teams")
      .select("team_id")
      .in("team_id", teamIds);

    const countMap: Record<string, number> = {};
    for (const row of memberRows || []) {
      const teamId = (row as { team_id: string }).team_id;
      countMap[teamId] = (countMap[teamId] || 0) + 1;
    }
    for (const team of teams) {
      team.memberCount = countMap[team.id] || 0;
    }
  }

  return teams;
}

/**
 * Get teams visible to a specific user based on their role
 * - Employees: See only teams they are a member of
 * - Managers: See teams they manage
 * - Admins: See all teams
 */
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
    // Employee: get all teams they are a member of via user_teams
    const { data: memberships } = await supabaseAdmin
      .from("user_teams")
      .select("team_id")
      .eq("user_id", authUser.id);

    const teamIds = (memberships || []).map((m: any) => m.team_id as string);

    if (teamIds.length === 0) {
      return [];
    }
    query = query.in("id", teamIds);
  }

  const { data, error } = await query;

  if (error) {
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
  }

  const teams = (data || []).map((t: any) =>
    mapTeamRowToRecord(t as unknown as TeamRow),
  );

  // Get member counts from user_teams junction table
  if (teams.length > 0) {
    const teamIds = teams.map((t) => t.id);
    const { data: memberRows } = await supabaseAdmin
      .from("user_teams")
      .select("team_id")
      .in("team_id", teamIds);

    const countMap: Record<string, number> = {};
    for (const row of memberRows || []) {
      const teamId = (row as { team_id: string }).team_id;
      countMap[teamId] = (countMap[teamId] || 0) + 1;
    }
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

  // Get member count from user_teams
  const { count } = await supabaseAdmin
    .from("user_teams")
    .select("*", { count: "exact", head: true })
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

  // If manager assigned, update their primary team_id (legacy) and add to user_teams
  if (input.managerId) {
    await supabaseAdmin
      .from("users")
      .update({ team_id: data.id })
      .eq("id", input.managerId);

    // Add manager to user_teams with 'manager' role
    await supabaseAdmin
      .from("user_teams")
      .upsert({
        user_id: input.managerId,
        team_id: data.id,
        role: "manager",
      })
      .eq("user_id", input.managerId)
      .eq("team_id", data.id);
  }

  // Log activity
  await supabaseAdmin.from("user_activities").insert({
    user_id: input.managerId || data.id,
    entity_type: "team",
    entity_id: data.id,
    activity_type: "team_create",
    title: "Team created",
    description: `Created team: ${input.name}`,
  });

  await logActivity({
    actorId: input.managerId || data.id,
    entityType: "team",
    entityId: data.id,
    entityName: input.name,
    eventType: "team_created",
    source: "team",
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

  await logActivity({
    actorId: input.managerId || data.manager_id || data.id,
    entityType: "team",
    entityId: teamId,
    entityName: data.name,
    eventType: "team_updated",
    source: "team",
    metadata: { updates: Object.keys(input) },
  });

  return mapTeamRowToRecord(data as unknown as TeamRow);
}

/**
 * Delete team
 */
export async function deleteTeam(teamId: string): Promise<void> {
  // Remove all user_teams memberships for this team
  await supabaseAdmin
    .from("user_teams")
    .delete()
    .eq("team_id", teamId);

  // Remove primary team_id reference from users
  await supabaseAdmin
    .from("users")
    .update({ team_id: null })
    .eq("team_id", teamId);

  const { error } = await supabaseAdmin.from("teams").delete().eq("id", teamId);

  if (error) {
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
  }

  await supabaseAdmin.from("user_activities").insert({
    user_id: teamId,
    entity_type: "team",
    entity_id: teamId,
    activity_type: "team_delete",
    title: "Team deleted",
    description: "Team deleted",
  });
}

/**
 * Add user to team (supports multiple teams per user)
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

  // Enforce department match if both have a department set
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

  if (team.departmentId && !user.department_id) {
    throw new ApiError(
      ERROR_CODES.FORBIDDEN,
      "User is not assigned to the team's department",
    );
  }

  // Insert into user_teams junction table (upsert to be idempotent)
  const { error } = await supabaseAdmin
    .from("user_teams")
    .upsert(
      { user_id: userId, team_id: teamId, role: "member" },
      { onConflict: "user_id,team_id" },
    );

  if (error) {
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
  }

  // Also update primary team_id on users table if they don't have one yet
  const { data: userFull } = await supabaseAdmin
    .from("users")
    .select("team_id")
    .eq("id", userId)
    .single();

  if (!userFull?.team_id) {
    await supabaseAdmin
      .from("users")
      .update({ team_id: teamId, updated_at: getCurrentTimestamp() })
      .eq("id", userId);
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

  await logActivity({
    actorId: userId,
    entityType: "team",
    entityId: teamId,
    eventType: "team_joined",
    source: "team",
    metadata: { user_id: userId },
  });
}

/**
 * Remove user from a specific team
 */
export async function removeUserFromTeam(userId: string, teamId?: string): Promise<void> {
  if (teamId) {
    // Remove from specific team via user_teams junction
    const { error } = await supabaseAdmin
      .from("user_teams")
      .delete()
      .eq("user_id", userId)
      .eq("team_id", teamId);

    if (error) {
      throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
    }

    // If this was their primary team, update primary team to another membership or null
    const { data: userFull } = await supabaseAdmin
      .from("users")
      .select("team_id")
      .eq("id", userId)
      .single();

    if (userFull?.team_id === teamId) {
      // Find another team membership to use as primary
      const { data: remaining } = await supabaseAdmin
        .from("user_teams")
        .select("team_id")
        .eq("user_id", userId)
        .limit(1)
        .maybeSingle();

      await supabaseAdmin
        .from("users")
        .update({ team_id: remaining?.team_id || null, updated_at: getCurrentTimestamp() })
        .eq("id", userId);
    }
  } else {
    // Legacy: remove from all teams
    await supabaseAdmin
      .from("user_teams")
      .delete()
      .eq("user_id", userId);

    await supabaseAdmin
      .from("users")
      .update({ team_id: null, updated_at: getCurrentTimestamp() })
      .eq("id", userId);
  }

  await supabaseAdmin.from("user_activities").insert({
    user_id: userId,
    entity_type: "team",
    entity_id: teamId || userId,
    activity_type: "team_leave",
    title: "User left team",
    description: "User removed from team",
  });

  await logActivity({
    actorId: userId,
    entityType: "team",
    entityId: teamId || "",
    eventType: "team_left",
    source: "team",
    metadata: { user_id: userId },
  });
}

/**
 * Get team members with details (using user_teams junction)
 */
export async function getTeamMembersWithDetails(teamId: string) {
  const { data, error } = await supabaseAdmin
    .from("user_teams")
    .select(
      "role, joined_at, users!inner(id, email, full_name, role, phone, avatar_url, is_active, last_login)",
    )
    .eq("team_id", teamId);

  if (error) {
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
  }

  return (data || []).map((row: any) => {
    const u = row.users;
    return {
      id: u.id,
      email: u.email,
      fullName: u.full_name,
      role: u.role as UserRole,
      phone: u.phone,
      avatarUrl: u.avatar_url,
      isActive: u.is_active,
      lastLogin: u.last_login,
      teamRole: row.role,
      joinedAt: row.joined_at,
    };
  });
}

/**
 * Get all team IDs a user belongs to
 */
export async function getUserTeamIds(userId: string): Promise<string[]> {
  const { data } = await supabaseAdmin
    .from("user_teams")
    .select("team_id")
    .eq("user_id", userId);

  return (data || []).map((r: any) => r.team_id as string);
}
