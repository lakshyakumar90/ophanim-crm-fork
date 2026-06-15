import { supabaseAdmin } from "../../../config/supabase.js";
import { ApiError } from "../../../utils/responses.js";
import { ERROR_CODES } from "../../../utils/error-codes.js";
import { logActivity } from "../../shared/activity-events.service.js";
import { USER_ROLES, BULK_LIMITS } from "../../../config/constants.js";
import {
  parsePaginationParams,
  calculatePaginationMeta,
  calculateOffset,
  parseSortParams,
  parseArrayParam,
  parseDateRange,
} from "../../../utils/pagination.js";
import { chunkArray, getCurrentTimestamp } from "../../../utils/helpers.js";
import type { PaginatedResult, AuthUser } from "../../../types/api.types.js";
import type {
  CreateLeadInput,
  UpdateLeadInput,
  LeadListQuery,
  AssignLeadInput,
  BulkAssignInput,
  BulkUpdateLeadsInput,
  BulkDeleteInput,
  CreateActivityInput,
  ChangeStatusInput,
  CreateCommentInput,
  UpdateCommentInput,
} from "./leads.validator.js";
import { getTimestampIST } from "../../../utils/date-utils.js";
import {
  getCachedStaleWhileRevalidate,
  invalidateCachePattern,
  buildCacheKey,
  CACHE_KEYS,
  CACHE_TTL,
} from "../../shared/cache.service.js";

import { getLeadById } from "./leads-crud.service.js";

import {
  mapLeadRowToRecord,
  invalidateLeadDetailPageCache,
  LEAD_DETAIL_SELECT,
  LEAD_ACTIVITY_SELECT,
  LEAD_COMMENT_SELECT,
  LEAD_REMINDER_SELECT,
  type LeadRecord,
  type LeadRow,
} from "./leads.shared.js";

export async function assignLead(
  leadId: string,
  input: AssignLeadInput,
  assignedBy: string,
): Promise<LeadRecord> {
  const currentLead = await getLeadById(leadId);

  if (currentLead.assignedTo === input.assignTo) {
    throw new ApiError(ERROR_CODES.LEAD_ALREADY_ASSIGNED);
  }

  // Fetch user details for the new assignee (including department_id for visibility)
  const { data: newAssigneeData } = await supabaseAdmin
    .from("users")
    .select("id, full_name, email, department_id")
    .eq("id", input.assignTo)
    .single();

  // Fetch user details for previous assignee if exists
  let previousAssigneeName = null;
  let previousAssigneeEmail = null;
  if (currentLead.assignedTo) {
    const { data: prevAssigneeData } = await supabaseAdmin
      .from("users")
      .select("id, full_name, email")
      .eq("id", currentLead.assignedTo)
      .single();
    if (prevAssigneeData) {
      previousAssigneeName = prevAssigneeData.full_name;
      previousAssigneeEmail = prevAssigneeData.email;
    }
  }

  const newAssigneeName = newAssigneeData?.full_name || "Unknown";
  const newAssigneeEmail = newAssigneeData?.email || "";

  // Update both assigned_to and department_id so managers can see leads assigned to their team
  const { data, error } = await supabaseAdmin
    .from("leads")
    .update({
      assigned_to: input.assignTo,
      department_id: newAssigneeData?.department_id || null,
      updated_at: getCurrentTimestamp(),
    })
    .eq("id", leadId)
    .select()
    .single();

  if (error) {
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
  }

  await supabaseAdmin.from("lead_assignments_history").insert({
    lead_id: leadId,
    from_user_id: currentLead.assignedTo,
    to_user_id: input.assignTo,
    assigned_by: assignedBy,
    reason: input.reason,
  });

  await supabaseAdmin.from("lead_activities").insert({
    lead_id: leadId,
    user_id: assignedBy,
    activity_type: "assignment",
    title: `Lead reassigned to ${newAssigneeName}`,
    description:
      input.reason ||
      `Lead was reassigned to ${newAssigneeName} (${newAssigneeEmail})`,
    metadata: {
      from_user_id: currentLead.assignedTo,
      from_user_name: previousAssigneeName,
      to_user_id: input.assignTo,
      to_user_name: newAssigneeName,
      to_user_email: newAssigneeEmail,
      reason: input.reason,
      changed_at: getTimestampIST(),
    },
    created_at: getTimestampIST(),
  });

  await logActivity({
    actorId: assignedBy,
    entityType: "lead",
    entityId: leadId,
    entityName: currentLead.leadName,
    eventType: "assigned",
    source: "lead",
    metadata: {
      from_user_id: currentLead.assignedTo,
      from_user_name: previousAssigneeName,
      to_user_id: input.assignTo,
      to_user_name: newAssigneeName,
    },
  });

  await invalidateLeadDetailPageCache(leadId);

  return mapLeadRowToRecord(data as unknown as LeadRow);
}

export async function getLeadPipeline(
  authUser: AuthUser,
): Promise<Record<string, number>> {
  // Build query with role-based filtering
  let query = supabaseAdmin
    .from("leads")
    .select("status")
    .eq("is_deleted", false)
    .limit(100000); // Ensure we get all leads for accurate stats

  if (authUser.role === USER_ROLES.EMPLOYEE) {
    query = query.eq("assigned_to", authUser.id);
  } else if (authUser.role === USER_ROLES.MANAGER) {
    // Managers see leads assigned to their team members
    if (authUser.teamId) {
      const { data: teamUsers } = await supabaseAdmin
        .from("users")
        .select("id")
        .eq("team_id", authUser.teamId);

      const teamUserIds = (teamUsers || []).map((u: { id: string }) => u.id);
      if (!teamUserIds.includes(authUser.id)) {
        teamUserIds.push(authUser.id);
      }
      query = query.in("assigned_to", teamUserIds);
    } else {
      // Manager without team only sees their own assigned leads
      query = query.eq("assigned_to", authUser.id);
    }
  }
  // Admins see all leads in pipeline

  const { data, error } = await query;

  if (error) {
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
  }

  // Aggregate in memory - for very large datasets,
  // consider using a PostgreSQL function with GROUP BY
  const pipeline: Record<string, number> = {};
  for (const lead of data || []) {
    const status = (lead as { status: string }).status;
    pipeline[status] = (pipeline[status] || 0) + 1;
  }

  return pipeline;
}

/**
 * Get lead counts by user for filtering
 * Returns users with their lead counts based on role
 */
export async function getLeadCountsByUser(authUser: AuthUser): Promise<{
  users: Array<{
    id: string;
    fullName: string;
    role: string;
    teamId: string | null;
    teamName: string | null;
    leadCount: number;
    activityCount: number;
    activityCountCapped: boolean;
  }>;
  unassignedCount: number;
}> {
  // Manager Restriction: If manager has no team, they shouldn't see any dropdown options
  if (authUser.role === USER_ROLES.MANAGER && !authUser.teamId) {
    return { users: [], unassignedCount: 0 };
  }

  // Get "Sales" department ID to filter users
  const { data: salesDept } = await supabaseAdmin
    .from("departments")
    .select("id")
    .eq("name", "Sales")
    .single();

  // Get users based on role
  let usersQuery = supabaseAdmin
    .from("users")
    .select("id, full_name, role, team_id")
    .eq("is_active", true);

  if (salesDept) {
    usersQuery = usersQuery.eq("department_id", salesDept.id);
  }

  if (authUser.role === USER_ROLES.MANAGER && authUser.teamId) {
    // Manager sees only users in their team
    usersQuery = usersQuery.eq("team_id", authUser.teamId);
  } else if (authUser.role === USER_ROLES.EMPLOYEE) {
    // Employee sees only themselves
    usersQuery = usersQuery.eq("id", authUser.id);
  }
  // Admin sees all users (but limited to Sales department above)

  const { data: usersData, error: usersError } = await usersQuery;

  if (usersError) {
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, usersError.message);
  }

  // Get team names separately to avoid ambiguous relationship error
  // (users.team_id -> teams.id AND teams.manager_id -> users.id)
  const teamIds = [
    ...new Set((usersData || []).map((u: any) => u.team_id).filter(Boolean)),
  ];

  let teamMap: Record<string, string> = {};
  if (teamIds.length > 0) {
    const { data: teamsData } = await supabaseAdmin
      .from("teams")
      .select("id, name")
      .in("id", teamIds);

    if (teamsData) {
      teamMap = teamsData.reduce((acc: any, team: any) => {
        acc[team.id] = team.name;
        return acc;
      }, {});
    }
  }

  // Get lead counts for each user
  const userIds = (usersData || []).map((u: any) => u.id);

  // Get all leads assigned to these users
  const { data: leadsData, error: leadsError } = await supabaseAdmin
    .from("leads")
    .select("assigned_to")
    .eq("is_deleted", false)
    .in("assigned_to", userIds.length > 0 ? userIds : ["_none_"])
    .limit(100000); // Increase limit to ensure accurate counts (default is 1000)

  if (leadsError) {
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, leadsError.message);
  }

  // Count leads per user
  const leadCounts: Record<string, number> = {};
  for (const lead of leadsData || []) {
    const assignedTo = (lead as { assigned_to: string | null }).assigned_to;
    if (assignedTo) {
      leadCounts[assignedTo] = (leadCounts[assignedTo] || 0) + 1;
    }
  }

  // Get activity counts user-wise using exact count queries (avoids row-limit skew).
  const activityCounts: Record<string, number> = {};
  const activityCountCapped: Record<string, boolean> = {};
  if (userIds.length > 0) {
    const activityCountResults = await Promise.all(
      userIds.map(async (userId) => {
        const { count, error } = await supabaseAdmin
          .from("all_activities" as any)
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId);

        if (error) {
          throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
        }

        const safeCount = count || 0;
        return {
          userId,
          count: safeCount,
          capped: safeCount >= 1000,
        };
      }),
    );

    for (const result of activityCountResults) {
      activityCounts[result.userId] = result.count;
      activityCountCapped[result.userId] = result.capped;
    }
  }

  // Get unassigned count (admin only)
  let unassignedCount = 0;
  if (authUser.role === USER_ROLES.ADMIN) {
    const { count } = await supabaseAdmin
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("is_deleted", false)
      .is("assigned_to", null);
    unassignedCount = count || 0;
  }

  // Map users with their lead counts and activity counts
  const users = (usersData || []).map((u: any) => ({
    id: u.id,
    fullName: u.full_name,
    role: u.role,
    teamId: u.team_id,
    teamName: (u.team_id ? teamMap[u.team_id] : null) || null,
    leadCount: leadCounts[u.id] || 0,
    activityCount: activityCounts[u.id] || 0,
    activityCountCapped: activityCountCapped[u.id] || false,
  }));

  // Sort by activity count first, then by lead count
  users.sort((a, b) => {
    if (b.activityCount !== a.activityCount) {
      return b.activityCount - a.activityCount;
    }
    return b.leadCount - a.leadCount;
  });

  return { users, unassignedCount };
}

/**
 * Get won leads (customers) for project linking
 * Returns leads with status = 'won' that can be linked to projects
 */
export async function getWonLeads(authUser: AuthUser): Promise<
  {
    id: string;
    leadName: string;
    businessName: string | null;
    email: string | null;
  }[]
> {
  let query = supabaseAdmin
    .from("leads")
    .select("id, lead_name, business_name, email")
    .eq("is_deleted", false)
    .eq("status", "won")
    .order("lead_name", { ascending: true })
    .limit(10000);

  // Role-based filtering
  if (authUser.role === USER_ROLES.EMPLOYEE) {
    query = query.eq("assigned_to", authUser.id);
  } else if (authUser.role === USER_ROLES.MANAGER) {
    // Managers see won leads assigned to their team members
    if (authUser.teamId) {
      const { data: teamUsers } = await supabaseAdmin
        .from("users")
        .select("id")
        .eq("team_id", authUser.teamId);

      const teamUserIds = (teamUsers || []).map((u: { id: string }) => u.id);
      if (!teamUserIds.includes(authUser.id)) {
        teamUserIds.push(authUser.id);
      }
      query = query.in("assigned_to", teamUserIds);
    } else {
      // Manager without team only sees their own assigned leads
      query = query.eq("assigned_to", authUser.id);
    }
  }
  // Admins see all won leads

  const { data, error } = await query;

  if (error) {
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
  }

  return (data || []).map((lead) => ({
    id: lead.id,
    leadName: lead.lead_name,
    businessName: lead.business_name,
    email: lead.email,
  }));
}
