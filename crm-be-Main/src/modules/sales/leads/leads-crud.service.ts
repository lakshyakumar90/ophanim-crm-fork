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

import {
  mapLeadRowToRecord,
  invalidateLeadDetailPageCache,
  getLeadDetailPageCacheKey,
  LEAD_DETAIL_SELECT,
  type LeadRecord,
  type LeadRow,
  type AssignableUserRecord,
} from "./leads.shared.js";
import { getLeadActivities, type LeadActivityRecord } from "./leads-activities.service.js";
import { getLeadComments, type LeadComment } from "./leads-comments.service.js";
import { getLeadReminders, type LeadReminder } from "./leads-reminders.service.js";

/**
 * Get paginated list of leads with filters
 */
export async function getLeads(
  query: LeadListQuery,
  authUser: AuthUser,
): Promise<PaginatedResult<LeadRecord>> {
  const pagination = parsePaginationParams(query);
  const { sortBy, ascending } = parseSortParams(
    query,
    ["created_at", "lead_name", "status", "lead_value", "updated_at"],
    "created_at",
  );

  // OPTIMIZED: Select only required columns instead of SELECT *
  let baseQuery = supabaseAdmin
    .from("leads")
    .select(
      `
      id,
      lead_name,
      business_name,
      email,
      phone,
      status,
      source,
      assigned_to,
      website,
      country,
      timezone,
      nal_reason,
      client_response,
      lead_type,
      created_by,
      converted_at,
      created_at,
      updated_at,
      is_deleted,
      assignee:users!assigned_to(id, full_name, avatar_url)
    `,
      { count: "exact" },
    )
    .eq("is_deleted", false);

  // Role-based filtering with team security
  console.log(
    `[getLeads] Role: ${authUser.role}, TeamId: ${authUser.teamId}, UserId: ${authUser.id}`,
  );

  if (authUser.role === USER_ROLES.EMPLOYEE) {
    // Employees see only their assigned leads
    baseQuery = baseQuery.eq("assigned_to", authUser.id);
  } else if (authUser.role === USER_ROLES.MANAGER) {
    // Managers see their own leads + leads assigned to their team members
    if (authUser.teamId) {
      // Get all users in the manager's team
      const { data: teamUsers } = await supabaseAdmin
        .from("users")
        .select("id")
        .eq("team_id", authUser.teamId);

      const teamUserIds = (teamUsers || []).map((u: { id: string }) => u.id);
      // Make sure manager's own ID is included
      if (!teamUserIds.includes(authUser.id)) {
        teamUserIds.push(authUser.id);
      }

      console.log(
        `[getLeads] Manager team users: ${teamUserIds.length}, filtering by assigned_to`,
      );
      baseQuery = baseQuery.in("assigned_to", teamUserIds);
    } else {
      console.log(
        `[getLeads] Manager without team, filtering by assigned_to only`,
      );
      // Manager without team only sees their own assigned leads
      baseQuery = baseQuery.eq("assigned_to", authUser.id);
    }
  }
  // Admins see all leads (no filter)

  // Apply filters
  if (query.status) {
    const statuses = parseArrayParam(query.status);
    if (statuses.length > 0) {
      baseQuery = baseQuery.in("status", statuses);
    }
  }

  if (query.source) {
    const sources = parseArrayParam(query.source);
    if (sources.length > 0) {
      baseQuery = baseQuery.in("source", sources);
    }
  }

  if (query.assignedTo) {
    baseQuery = baseQuery.eq("assigned_to", query.assignedTo);
  }

  if (query.country) {
    baseQuery = baseQuery.ilike("country", `%${query.country}%`);
  }

  if (query.businessName) {
    baseQuery = baseQuery.ilike("business_name", `%${query.businessName}%`);
  }

  // Filter by assignment status
  if (query.assigned === "assigned") {
    baseQuery = baseQuery.not("assigned_to", "is", null);
  } else if (query.assigned === "unassigned") {
    baseQuery = baseQuery.is("assigned_to", null);
  }

  const dateRange = parseDateRange(query);
  if (dateRange.startDate) {
    baseQuery = baseQuery.gte("created_at", dateRange.startDate.toISOString());
  }
  if (dateRange.endDate) {
    baseQuery = baseQuery.lte("created_at", dateRange.endDate.toISOString());
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

  const leads = (data || []).map((l: any) =>
    mapLeadRowToRecord({
      ...l,
      assignee: Array.isArray(l.assignee) ? l.assignee[0] : l.assignee,
    } as LeadRow),
  );

  return {
    data: leads,
    meta: calculatePaginationMeta(count || 0, pagination),
  };
}

/**
 * Get lead by ID
 */
export async function getLeadById(leadId: string): Promise<LeadRecord> {
  const { data, error } = await supabaseAdmin
    .from("leads")
    .select(LEAD_DETAIL_SELECT)
    .eq("id", leadId)
    .eq("is_deleted", false)
    .single();

  if (error || !data) {
    throw ApiError.notFound("Lead");
  }

  return mapLeadRowToRecord(data as unknown as LeadRow);
}

/**
 * Get consolidated data needed for the lead detail page initial render.
 */
export async function getLeadDetailPageData(
  leadId: string,
  authUser: AuthUser,
): Promise<{
  lead: LeadRecord;
  activities: LeadActivityRecord[];
  comments: LeadComment[];
  reminders: LeadReminder[];
  assignableUsers: AssignableUserRecord[];
}> {
  const cacheKey = getLeadDetailPageCacheKey(leadId, authUser);

  return getCachedStaleWhileRevalidate(
    cacheKey,
    async () => {
      const lead = await getLeadById(leadId);

      const [activities, comments, reminders, assignableUsers] =
        await Promise.all([
          getLeadActivities(leadId),
          getLeadComments(leadId, { skipLeadCheck: true }),
          getLeadReminders(leadId, authUser),
          authUser.role === USER_ROLES.ADMIN
            ? (async () => {
                const { data, error } = await supabaseAdmin
                  .from("users")
                  .select("id, full_name, email, role, is_active, avatar_url")
                  .eq("is_active", true)
                  .order("full_name", { ascending: true })
                  .limit(500);

                if (error) {
                  throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
                }

                return (data || []).map((user: any) => ({
                  id: user.id,
                  fullName: user.full_name,
                  email: user.email,
                  role: user.role,
                  isActive: user.is_active,
                  avatarUrl: user.avatar_url,
                })) as AssignableUserRecord[];
              })()
            : Promise.resolve([] as AssignableUserRecord[]),
        ]);

      return {
        lead,
        activities,
        comments,
        reminders,
        assignableUsers,
      };
    },
    {
      freshTtlSeconds: CACHE_TTL.LEAD_DETAIL_PAGE,
      staleTtlSeconds: CACHE_TTL.LEAD_DETAIL_PAGE * 4,
    },
  );
}

/**
 * Create lead
 */
export async function createLead(
  input: CreateLeadInput,
  createdBy: string,
  departmentId?: string | null,
): Promise<LeadRecord> {
  const insertData = {
    lead_name: input.leadName,
    business_name: input.businessName,
    email: input.email?.toLowerCase(),
    phone: input.phone,
    status: input.status || "fresh_lead",
    source: input.source,
    assigned_to: input.assignedTo,
    website: input.website,
    country: input.country,
    timezone: input.timezone,
    nal_reason: input.nalReason,
    client_response: input.clientResponse,
    lead_type: input.leadType,
    department_id: departmentId,

    created_by: createdBy,
    is_deleted: false,
  };

  const { data, error } = await supabaseAdmin
    .from("leads")
    .insert(insertData)
    .select()
    .single();

  if (error) {
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
  }

  const lead = data as unknown as LeadRow;

  // If assigned, create assignment history
  if (input.assignedTo) {
    await supabaseAdmin.from("lead_assignments_history").insert({
      lead_id: lead.id,
      to_user_id: input.assignedTo,
      assigned_by: createdBy,
      reason: "Initial assignment",
    });
  }

  return mapLeadRowToRecord(lead);
}

/**
 * Update lead
 */
export async function updateLead(
  leadId: string,
  input: UpdateLeadInput,
  updatedBy: string,
): Promise<LeadRecord> {
  const currentLead = await getLeadById(leadId);

  const updateData: Record<string, unknown> = {};
  if (input.leadName !== undefined) updateData["lead_name"] = input.leadName;
  if (input.businessName !== undefined)
    updateData["business_name"] = input.businessName;
  if (input.email !== undefined)
    updateData["email"] = input.email?.toLowerCase();
  if (input.phone !== undefined) updateData["phone"] = input.phone;
  if (input.status !== undefined) updateData["status"] = input.status;
  if (input.source !== undefined) updateData["source"] = input.source;
  if (input.website !== undefined) updateData["website"] = input.website;
  if (input.country !== undefined) updateData["country"] = input.country;
  if (input.timezone !== undefined) updateData["timezone"] = input.timezone;
  if (input.nalReason !== undefined) updateData["nal_reason"] = input.nalReason;
  if (input.clientResponse !== undefined)
    updateData["client_response"] = input.clientResponse;
  if (input.leadType !== undefined) updateData["lead_type"] = input.leadType;
  updateData["updated_at"] = getCurrentTimestamp();

  if (input.status === "won" && currentLead.status !== "won") {
    updateData["converted_at"] = getCurrentTimestamp();
  }

  const { data, error } = await supabaseAdmin
    .from("leads")
    .update(updateData)
    .eq("id", leadId)
    .eq("is_deleted", false)
    .select()
    .single();

  if (error) {
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
  }

  if (!data) {
    throw ApiError.notFound("Lead");
  }

  if (input.status && input.status !== currentLead.status) {
    await supabaseAdmin.from("lead_activities").insert({
      lead_id: leadId,
      user_id: updatedBy,
      activity_type: "status_change",
      title: `Status changed from ${currentLead.status} to ${input.status}`,
      description: `Lead status was updated`,
      metadata: {
        field: "status",
        old_value: currentLead.status,
        new_value: input.status,
        changed_at: getTimestampIST(),
      },
      created_at: getTimestampIST(),
    });

    await logActivity({
      actorId: updatedBy,
      entityType: "lead",
      entityId: leadId,
      entityName: currentLead.leadName,
      eventType: "status_changed",
      source: "lead",
      metadata: {
        field: "status",
        old_value: currentLead.status,
        new_value: input.status,
      },
    });
  }

  // Build old and new values for only the fields that actually changed
  const changedOldValues: Record<string, unknown> = {};
  const changedNewValues: Record<string, unknown> = {};

  // Map of input field names to currentLead field names
  // Map of input field names to currentLead field names
  const fieldMappings: Record<string, keyof LeadRecord> = {
    leadName: "leadName",
    businessName: "businessName",
    email: "email",
    phone: "phone",
    status: "status",
    source: "source",
    website: "website",
    country: "country",
    timezone: "timezone",
    nalReason: "nalReason",
    clientResponse: "clientResponse",
    leadType: "leadType",
  };

  for (const [inputKey, leadKey] of Object.entries(fieldMappings)) {
    const inputValue = input[inputKey as keyof UpdateLeadInput];
    if (inputValue !== undefined) {
      const currentValue = currentLead[leadKey];
      // Only log if the value actually changed
      if (JSON.stringify(inputValue) !== JSON.stringify(currentValue)) {
        changedOldValues[inputKey] = currentValue;
        changedNewValues[inputKey] = inputValue;
      }
    }
  }

  // Log general update activity only if there are actual changes
  if (Object.keys(changedNewValues).length > 0) {
    // Exclude status — already logged via the status_change block above
    const nonStatusNew = Object.fromEntries(
      Object.entries(changedNewValues).filter(([k]) => k !== "status"),
    );
    const nonStatusOld = Object.fromEntries(
      Object.entries(changedOldValues).filter(([k]) => k !== "status"),
    );

    if (Object.keys(nonStatusNew).length > 0) {
      await supabaseAdmin.from("lead_activities").insert({
        lead_id: leadId,
        user_id: updatedBy,
        activity_type: "update",
        title: `Lead updated`,
        description: `Fields updated: ${Object.keys(nonStatusNew).join(", ")}`,
        metadata: {
          changed_fields: Object.keys(nonStatusNew),
          old_values: nonStatusOld,
          new_values: nonStatusNew,
          changed_at: getTimestampIST(),
        },
        created_at: getTimestampIST(),
      });

      await logActivity({
        actorId: updatedBy,
        entityType: "lead",
        entityId: leadId,
        entityName: currentLead.leadName,
        eventType: "updated",
        source: "lead",
        metadata: {
          changed_fields: Object.keys(nonStatusNew),
          old_values: nonStatusOld,
          new_values: nonStatusNew,
        },
      });
    }
  }

  await invalidateLeadDetailPageCache(leadId);

  return mapLeadRowToRecord(data as unknown as LeadRow);
}

export async function deleteLead(leadId: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from("leads")
    .update({ is_deleted: true, updated_at: getCurrentTimestamp() })
    .eq("id", leadId);

  if (error) {
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
  }

  await invalidateLeadDetailPageCache(leadId);
}
