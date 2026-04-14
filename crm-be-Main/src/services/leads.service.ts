import { supabaseAdmin } from "../config/supabase.js";
import { ApiError } from "../utils/responses.js";
import { ERROR_CODES } from "../utils/error-codes.js";
import { logActivity } from "./activity-events.service.js";
import { USER_ROLES, BULK_LIMITS } from "../config/constants.js";
import {
  parsePaginationParams,
  calculatePaginationMeta,
  calculateOffset,
  parseSortParams,
  parseArrayParam,
  parseDateRange,
} from "../utils/pagination.js";
import { chunkArray, getCurrentTimestamp } from "../utils/helpers.js";
import type { PaginatedResult, AuthUser } from "../types/api.types.js";
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
} from "../validators/leads.validator.js";
import { getTimestampIST } from "../utils/date-utils.js";
import {
  getCachedStaleWhileRevalidate,
  invalidateCachePattern,
  buildCacheKey,
  CACHE_KEYS,
  CACHE_TTL,
} from "./cache.service.js";

// Update LeadRecord interface
interface LeadRecord {
  id: string;
  leadName: string;
  businessName: string | null;
  email: string | null;
  phone: string | null;
  alternatePhone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  status: string;
  source: string | null;
  leadValue: number | null;
  industry: string | null;
  designation: string | null;
  description: string | null;
  tags: string | null;
  assignedTo: string | null;
  website: string | null;
  country: string | null;
  timezone: string | null;
  nalReason: string | null;
  clientResponse: string | null;
  leadType: string | null;
  createdBy: string;
  convertedAt: string | null;
  createdAt: string;
  updatedAt: string;
  assignee?: {
    id: string;
    fullName: string;
    avatarUrl: string | null;
  };
}

// Type for lead row from database
interface LeadRow {
  id: string;
  lead_name: string;
  business_name: string | null;
  email: string | null;
  phone: string | null;
  alternate_phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  status: string;
  source: string | null;
  lead_value: number | null;
  industry: string | null;
  designation: string | null;
  description: string | null;
  tags: string | null;
  assigned_to: string | null;
  website: string | null;
  country: string | null;
  timezone: string | null;
  nal_reason: string | null;
  client_response: string | null;
  lead_type: string | null;
  created_by: string;
  converted_at: string | null;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  assignee?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  };
}

interface AssignableUserRecord {
  id: string;
  fullName: string;
  email: string;
  role: string;
  isActive: boolean;
  avatarUrl: string | null;
}

const LEAD_DETAIL_SELECT = `
  id,
  lead_name,
  business_name,
  email,
  phone,
  alternate_phone,
  address,
  city,
  state,
  pincode,
  status,
  source,
  lead_value,
  industry,
  designation,
  description,
  tags,
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
  assignee:users!assigned_to(id, full_name, avatar_url)
`;

const LEAD_ACTIVITY_SELECT = `
  id,
  lead_id,
  user_id,
  activity_type,
  title,
  description,
  metadata,
  created_at,
  user:users(id, full_name, email, avatar_url)
`;

const LEAD_COMMENT_SELECT = `
  id,
  entity_type,
  entity_id,
  user_id,
  content,
  created_at,
  updated_at,
  is_deleted,
  users:user_id (id, full_name, email, avatar_url)
`;

const LEAD_REMINDER_SELECT =
  "id, lead_id, user_id, reminder_at, note, is_sent, is_done, created_at";

function getLeadDetailPageCacheKey(leadId: string, authUser: AuthUser): string {
  const scope = authUser.role === USER_ROLES.ADMIN ? "admin" : `user:${authUser.id}`;
  return buildCacheKey(CACHE_KEYS.LEAD_DETAIL_PAGE, leadId, scope);
}

async function invalidateLeadDetailPageCache(leadId: string): Promise<void> {
  await invalidateCachePattern(buildCacheKey(CACHE_KEYS.LEAD_DETAIL_PAGE, leadId, "*"));
}

function mapLeadRowToRecord(data: LeadRow): LeadRecord {
  return {
    id: data.id,
    leadName: data.lead_name,
    businessName: data.business_name,
    email: data.email,
    phone: data.phone,
    alternatePhone: data.alternate_phone,
    address: data.address,
    city: data.city,
    state: data.state,
    pincode: data.pincode,
    status: data.status,
    source: data.source,
    leadValue: data.lead_value,
    industry: data.industry,
    designation: data.designation,
    description: data.description,
    tags: data.tags,
    assignedTo: data.assigned_to,
    website: data.website,
    country: data.country,
    timezone: data.timezone,
    nalReason: data.nal_reason,
    clientResponse: data.client_response,
    leadType: data.lead_type,
    createdBy: data.created_by,
    convertedAt: data.converted_at,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    assignee: data.assignee
      ? {
          id: data.assignee.id,
          fullName: data.assignee.full_name,
          avatarUrl: data.assignee.avatar_url,
        }
      : undefined,
  };
}

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

/**
 * Assign lead to user
 */
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

/**
 * Bulk assign leads
 */
export async function bulkAssignLeads(
  input: BulkAssignInput,
  assignedBy: string,
): Promise<{ success: number; failed: number }> {
  if (input.ids.length > BULK_LIMITS.MAX_RECORDS) {
    throw ApiError.bulkLimitExceeded(BULK_LIMITS.MAX_RECORDS);
  }

  // Fetch user details for the assignee (including department_id for visibility)
  const { data: assigneeData } = await supabaseAdmin
    .from("users")
    .select("id, full_name, email, department_id")
    .eq("id", input.assignTo)
    .single();

  const assigneeName = assigneeData?.full_name || "Unknown";
  const assigneeEmail = assigneeData?.email || "";

  let success = 0;
  let failed = 0;

  const chunks = chunkArray(input.ids, BULK_LIMITS.BATCH_SIZE);

  for (const chunk of chunks) {
    // Update both assigned_to and department_id so managers can see leads assigned to their team
    const { error } = await supabaseAdmin
      .from("leads")
      .update({
        assigned_to: input.assignTo,
        department_id: assigneeData?.department_id || null,
        updated_at: getCurrentTimestamp(),
      })
      .in("id", chunk)
      .eq("is_deleted", false);

    if (error) {
      failed += chunk.length;
    } else {
      success += chunk.length;

      const historyRecords = chunk.map((id) => ({
        lead_id: id,
        to_user_id: input.assignTo,
        assigned_by: assignedBy,
        reason: input.reason || "Bulk assignment",
      }));

      await supabaseAdmin
        .from("lead_assignments_history")
        .insert(historyRecords);
    }
  }

  // Log activity with readable name
  if (success > 0) {
    // Activity stored in lead_assignments_history
  }

  return { success, failed };
}

/**
 * Bulk update leads
 */
export async function bulkUpdateLeads(
  input: BulkUpdateLeadsInput,
  _updatedBy: string,
): Promise<{ success: number; failed: number }> {
  if (input.ids.length > BULK_LIMITS.MAX_RECORDS) {
    throw ApiError.bulkLimitExceeded(BULK_LIMITS.MAX_RECORDS);
  }

  const updateData: Record<string, unknown> = {};
  if (input.data.status !== undefined) updateData["status"] = input.data.status;
  if (input.data.source !== undefined) updateData["source"] = input.data.source;
  if (input.data.assignedTo !== undefined)
    updateData["assigned_to"] = input.data.assignedTo;
  if (input.data.country !== undefined)
    updateData["country"] = input.data.country;
  updateData["updated_at"] = getCurrentTimestamp();

  let success = 0;
  let failed = 0;

  const chunks = chunkArray(input.ids, BULK_LIMITS.BATCH_SIZE);

  for (const chunk of chunks) {
    const { error, count } = await supabaseAdmin
      .from("leads")
      .update(updateData)
      .in("id", chunk)
      .eq("is_deleted", false);

    if (error) {
      failed += chunk.length;
    } else {
      success += count || chunk.length;
    }
  }

  // Bulk update activity tracked via individual lead updates

  return { success, failed };
}

/**
 * Soft delete lead
 */
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

/**
 * Bulk soft delete leads
 */
export async function bulkDeleteLeads(
  input: BulkDeleteInput,
): Promise<{ success: number; failed: number }> {
  if (input.ids.length > BULK_LIMITS.MAX_RECORDS) {
    throw ApiError.bulkLimitExceeded(BULK_LIMITS.MAX_RECORDS);
  }

  const { error, count } = await supabaseAdmin
    .from("leads")
    .update({ is_deleted: true, updated_at: getCurrentTimestamp() })
    .in("id", input.ids);

  if (error) {
    return { success: 0, failed: input.ids.length };
  }

  return { success: count || input.ids.length, failed: 0 };
}

/**
 * Get lead pipeline summary
 * OPTIMIZED: Uses SQL aggregation via status-only select with limit
 * For 100K+ leads, consider adding a database function with GROUP BY
 */
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

/**
 * Add activity to lead
 */
export async function addLeadActivity(
  leadId: string,
  input: CreateActivityInput,
  userId: string,
): Promise<void> {
  const lead = await getLeadById(leadId);

  const { error } = await supabaseAdmin.from("lead_activities").insert({
    lead_id: leadId,
    user_id: userId,
    activity_type: input.activityType,
    title: input.title,
    description: input.description,
    duration: input.duration,
    outcome: input.outcome,
    next_action: input.nextAction,
  });

  if (error) {
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
  }

  await logActivity({
    actorId: userId,
    entityType: "lead",
    entityId: leadId,
    entityName: lead.leadName,
    eventType: input.activityType,
    source: "lead",
    metadata: {
      title: input.title,
      description: input.description,
    },
  });

  await invalidateLeadDetailPageCache(leadId);

  // Note: last_contacted_at column was removed in migration 005_strict_schema_cleanup.sql
  // Activity logging is sufficient for tracking contact history
}

// Lead Activity interfaces (maps from lead_activities table)
interface LeadActivityRecord {
  id: string;
  leadId: string;
  userId: string;
  activityType: string;
  title: string;
  description: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  user?: {
    id: string;
    fullName: string;
    email: string;
    avatarUrl: string | null;
  };
}

interface LeadActivityRow {
  id: string;
  lead_id: string;
  user_id: string;
  activity_type: string;
  title: string;
  description: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  user?:
    | {
        id: string;
        full_name: string;
        email: string;
        avatar_url: string | null;
      }
    | {
        id: string;
        full_name: string;
        email: string;
        avatar_url: string | null;
      }[];
}

function mapLeadActivityRowToRecord(row: LeadActivityRow): LeadActivityRecord {
  const normalizedUser = Array.isArray(row.user) ? row.user[0] : row.user;

  return {
    id: row.id,
    leadId: row.lead_id,
    userId: row.user_id,
    activityType: row.activity_type,
    title: row.title,
    description: row.description,
    metadata: row.metadata,
    createdAt: row.created_at,
    user: normalizedUser
      ? {
          id: normalizedUser.id,
          fullName: normalizedUser.full_name,
          email: normalizedUser.email,
          avatarUrl: normalizedUser.avatar_url,
        }
      : undefined,
  };
}

/**
 * Get lead activities from lead_activities table
 */
export async function getLeadActivities(
  leadId: string,
): Promise<LeadActivityRecord[]> {
  const { data, error } = await supabaseAdmin
    .from("lead_activities")
    .select(LEAD_ACTIVITY_SELECT)
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
  }

  return (data || []).map((row) =>
    mapLeadActivityRowToRecord(row as LeadActivityRow),
  );
}

/**
 * Update lead status (for employees on their assigned leads)
 */
export async function updateLeadStatus(
  leadId: string,
  input: ChangeStatusInput,
  userId: string,
): Promise<LeadRecord> {
  const currentLead = await getLeadById(leadId);
  const oldStatus = currentLead.status;

  if (oldStatus === input.status) {
    return currentLead; // No change needed
  }

  // Build update data - include nal_reason if status is not_a_lead
  const updateData: Record<string, unknown> = {
    status: input.status,
    updated_at: getCurrentTimestamp(),
  };

  // If changing to not_a_lead, save the reason
  if (input.status === "not_a_lead" && input.reason) {
    updateData.nal_reason = input.reason;
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

  // Add to lead_activities (single source of truth)
  const { error: activityError } = await supabaseAdmin
    .from("lead_activities")
    .insert({
      lead_id: leadId,
      user_id: userId,
      activity_type: "status_change",
      title: `Status changed to ${input.status.replace(/_/g, " ")}`,
      description:
        input.reason ||
        `Lead status changed from ${oldStatus} to ${input.status}`,
      metadata: {
        from_status: oldStatus,
        to_status: input.status,
        reason: input.reason,
      },
    });

  if (activityError) {
    console.error("Failed to insert lead activity:", activityError);
  }

  await invalidateLeadDetailPageCache(leadId);

  return mapLeadRowToRecord(data as unknown as LeadRow);
}

// ============ COMMENT FUNCTIONS ============

interface LeadComment {
  id: string;
  leadId: string;
  userId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  isDeleted: boolean;
  user?: {
    id: string;
    fullName: string;
    email: string;
    avatarUrl: string | null;
  };
}

interface CommentRow {
  id: string;
  entity_type: string;
  entity_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
  users?:
    | {
        id: string;
        full_name: string;
        email: string;
        avatar_url: string | null;
      }
    | {
        id: string;
        full_name: string;
        email: string;
        avatar_url: string | null;
      }[];
}

function mapCommentRowToRecord(row: CommentRow): LeadComment {
  const normalizedUser = Array.isArray(row.users) ? row.users[0] : row.users;

  return {
    id: row.id,
    leadId: row.entity_id,
    userId: row.user_id,
    content: row.content,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    isDeleted: row.is_deleted,
    user: normalizedUser
      ? {
          id: normalizedUser.id,
          fullName: normalizedUser.full_name,
          email: normalizedUser.email,
          avatarUrl: normalizedUser.avatar_url,
        }
      : undefined,
  };
}

/**
 * Get lead comments
 */
export async function getLeadComments(
  leadId: string,
  options?: { skipLeadCheck?: boolean },
): Promise<LeadComment[]> {
  // Reuse the existing existence check for standalone endpoints.
  if (!options?.skipLeadCheck) {
    await getLeadById(leadId);
  }

  const { data, error } = await supabaseAdmin
    .from("comments")
    .select(LEAD_COMMENT_SELECT)
    .eq("entity_type", "lead")
    .eq("entity_id", leadId)
    .eq("is_deleted", false)
    .order("created_at", { ascending: false });

  if (error) {
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
  }

  return (data || []).map((row) => mapCommentRowToRecord(row as CommentRow));
}

/**
 * Add comment to lead
 */
export async function addLeadComment(
  leadId: string,
  input: CreateCommentInput,
  userId: string,
): Promise<LeadComment> {
  // First verify the lead exists
  const lead = await getLeadById(leadId);

  const { data, error } = await supabaseAdmin
    .from("comments")
    .insert({
      entity_type: "lead",
      entity_id: leadId,
      user_id: userId,
      content: input.content,
    })
    .select(LEAD_COMMENT_SELECT)
    .single();

  if (error) {
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
  }

  const commentPreview =
    input.content.length > 120
      ? `${input.content.slice(0, 117).trimEnd()}...`
      : input.content;

  await supabaseAdmin.from("user_activities").insert({
    user_id: userId,
    entity_type: "lead",
    entity_id: leadId,
    activity_type: "comment",
    title: "Lead comment added",
    description: `Commented on lead: ${lead.leadName}`,
    metadata: {
      comment_id: data.id,
      comment_preview: commentPreview,
      commented_on: lead.leadName,
    },
    created_at: getTimestampIST(),
  });

  await logActivity({
    actorId: userId,
    entityType: "lead",
    entityId: leadId,
    entityName: lead.leadName,
    eventType: "comment_added",
    source: "lead",
    metadata: {
      comment_id: data.id,
      comment_preview: commentPreview,
    },
  });

  await invalidateLeadDetailPageCache(leadId);

  return mapCommentRowToRecord(data as CommentRow);
}

/**
 * Update comment (admin only)
 */
export async function updateLeadComment(
  commentId: string,
  input: UpdateCommentInput,
  userId: string,
): Promise<LeadComment> {
  const { data, error } = await supabaseAdmin
    .from("comments")
    .update({
      content: input.content,
      updated_at: getCurrentTimestamp(),
    })
    .eq("id", commentId)
    .eq("entity_type", "lead")
    .eq("is_deleted", false)
    .select(LEAD_COMMENT_SELECT)
    .single();

  if (error) {
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
  }

  if (!data) {
    throw ApiError.notFound("Comment");
  }

  await invalidateLeadDetailPageCache(data.entity_id);

  return mapCommentRowToRecord(data as CommentRow);
}

/**
 * Delete comment (admin only - soft delete)
 */
export async function deleteLeadComment(commentId: string): Promise<void> {
  const { error, data } = await supabaseAdmin
    .from("comments")
    .update({
      is_deleted: true,
      updated_at: getCurrentTimestamp(),
    })
    .eq("id", commentId)
    .eq("entity_type", "lead")
    .select("entity_id")
    .maybeSingle();

  if (error) {
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
  }

  if (data?.entity_id) {
    await invalidateLeadDetailPageCache(data.entity_id);
  }
}

// ============ LEAD REMINDER FUNCTIONS ============

interface LeadReminder {
  id: string;
  leadId: string;
  userId: string;
  reminderAt: string;
  note: string | null;
  isSent: boolean;
  isDone: boolean;
  createdAt: string;
  lead?: {
    leadName: string;
  };
}

interface ReminderRow {
  id: string;
  lead_id: string;
  user_id: string;
  reminder_at: string;
  note: string | null;
  is_sent: boolean;
  is_done: boolean;
  created_at: string;
  leads?: {
    lead_name: string;
  };
}

function mapReminderRowToRecord(data: ReminderRow): LeadReminder {
  return {
    id: data.id,
    leadId: data.lead_id,
    userId: data.user_id,
    reminderAt: data.reminder_at,
    note: data.note,
    isSent: data.is_sent,
    isDone: data.is_done ?? false,
    createdAt: data.created_at,
    lead: data.leads ? { leadName: data.leads.lead_name } : undefined,
  };
}

async function enrichReminders<
  T extends ReminderRow,
>(rows: T[]): Promise<Array<LeadReminder & { user?: { fullName: string; avatarUrl: string | null } }>> {
  if (rows.length === 0) return [];

  const leadIds = Array.from(new Set(rows.map((row) => row.lead_id).filter(Boolean)));
  const userIds = Array.from(new Set(rows.map((row) => row.user_id).filter(Boolean)));

  const [{ data: leadsData }, { data: usersData }] = await Promise.all([
    leadIds.length > 0
      ? supabaseAdmin.from("leads").select("id, lead_name").in("id", leadIds)
      : Promise.resolve({ data: [] as any[] }),
    userIds.length > 0
      ? supabaseAdmin
          .from("users")
          .select("id, full_name, avatar_url")
          .in("id", userIds)
      : Promise.resolve({ data: [] as any[] }),
  ]);

  const leadNameById = new Map(
    (leadsData || []).map((lead: any) => [lead.id, lead.lead_name]),
  );
  const userById = new Map(
    (usersData || []).map((user: any) => [
      user.id,
      { fullName: user.full_name, avatarUrl: user.avatar_url },
    ]),
  );

  return rows.map((row) => ({
    ...mapReminderRowToRecord({
      ...row,
      leads: leadNameById.get(row.lead_id)
        ? { lead_name: leadNameById.get(row.lead_id) as string }
        : undefined,
    }),
    user: userById.get(row.user_id),
  }));
}

/**
 * Get reminders for a lead
 */
export async function getLeadReminders(
  leadId: string,
  authUser: AuthUser,
): Promise<LeadReminder[]> {
  let baseQuery = supabaseAdmin
    .from("lead_reminders")
    .select(LEAD_REMINDER_SELECT)
    .eq("lead_id", leadId)
    .order("reminder_at", { ascending: true });

  // If not admin, only show own reminders
  if (authUser.role !== "admin") {
    baseQuery = baseQuery.eq("user_id", authUser.id);
  }

  const { data, error } = await baseQuery;

  if (error) {
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
  }

  const reminders = await enrichReminders((data || []) as ReminderRow[]);
  return reminders.map(({ user, ...reminder }) => reminder);
}

/**
 * Create a lead reminder
 */
export async function createLeadReminder(
  leadId: string,
  userId: string,
  reminderAt: string,
  note?: string,
): Promise<LeadReminder> {
  // Verify lead exists
  await getLeadById(leadId);

  const { data, error } = await supabaseAdmin
    .from("lead_reminders")
    .insert({
      lead_id: leadId,
      user_id: userId,
      reminder_at: reminderAt,
      note: note || null,
      is_sent: false,
    })
    .select(LEAD_REMINDER_SELECT)
    .single();

  if (error) {
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
  }

  const [reminder] = await enrichReminders([data as ReminderRow]);
  if (!reminder) {
    throw ApiError.notFound("Reminder");
  }
  const { user, ...record } = reminder;

  await invalidateLeadDetailPageCache(leadId);

  return record;
}

/**
 * Delete a lead reminder
 */
export async function deleteLeadReminder(
  reminderId: string,
  authUser: AuthUser,
): Promise<void> {
  let query = supabaseAdmin
    .from("lead_reminders")
    .delete()
    .eq("id", reminderId);
  if (authUser.role !== "admin") {
    query = query.eq("user_id", authUser.id); // Non-admins can only delete their own reminders
  }

  const { error, data } = await query.select("id, lead_id").maybeSingle();

  if (error) {
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
  }
  if (!data) {
    throw ApiError.notFound("Reminder");
  }

  if (data.lead_id) {
    await invalidateLeadDetailPageCache(data.lead_id);
  }
}

/**
 * Get all pending reminders for a user
 */
export async function getUserPendingReminders(
  userId: string,
): Promise<LeadReminder[]> {
  const { data, error } = await supabaseAdmin
    .from("lead_reminders")
    .select("*")
    .eq("user_id", userId)
    .eq("is_sent", false)
    .gte("reminder_at", getTimestampIST())
    .order("reminder_at", { ascending: true });

  if (error) {
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
  }

  const reminders = await enrichReminders((data || []) as ReminderRow[]);
  return reminders.map(({ user, ...reminder }) => reminder);
}

/**
 * Get all reminders (paginated, sortable, admin filterable)
 */
export async function getAllReminders(
  query: {
    page?: number;
    limit?: number;
    userId?: string;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
    status?: "pending" | "sent" | "all";
    date?: string; // Format: YYYY-MM-DD
  },
  authUser: AuthUser,
): Promise<PaginatedResult<LeadReminder & { user?: { fullName: string } }>> {
  const page = query.page || 1;
  const limit = query.limit || 20;
  const offset = (page - 1) * limit;

  // Base query – we keep it simple here and push most of the role logic into
  // a second-stage in‑memory filter to avoid generating extremely large
  // `or(lead_id.in.(...))` URL strings which can cause `fetch failed` errors.
  let baseQuery = supabaseAdmin
    .from("lead_reminders")
    .select("*", { count: "exact" });

  // Access Control (coarse filter):
  // - Admin / isGlobal / crm:admin: optionally filter by userId, otherwise org‑wide.
  // - Non‑admin: start by limiting to reminders created by the current user;
  //   we will later *expand* the visible set in memory to include additional
  //   team reminders when the user is a manager.
  const isAdminOrGlobal =
    authUser.role === "admin" ||
    authUser.isGlobal ||
    (authUser.permissions ?? []).includes("crm:admin");

  if (isAdminOrGlobal) {
    if (query.userId) {
      baseQuery = baseQuery.eq("user_id", query.userId);
    }
  } else {
    baseQuery = baseQuery.eq("user_id", authUser.id);
  }

  // Status Filter
  if (query.status === "pending") {
    baseQuery = baseQuery.eq("is_done", false);
  } else if (query.status === "sent") {
    baseQuery = baseQuery.eq("is_done", true);
  }

  // Date Filter
  if (query.date) {
    const startDate = new Date(query.date);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(query.date);
    endDate.setHours(23, 59, 59, 999);

    baseQuery = baseQuery
      .gte("reminder_at", startDate.toISOString())
      .lte("reminder_at", endDate.toISOString());
  }

  // Sorting
  if (query.sortBy === "reminder_at") {
    baseQuery = baseQuery.order("reminder_at", {
      ascending: query.sortOrder === "asc",
    });
  } else {
    // Default sort: pending first, then by date
    baseQuery = baseQuery.order("reminder_at", { ascending: true });
  }

  const { data, error, count } = await baseQuery.range(
    offset,
    offset + limit - 1,
  );

  if (error) throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);

  const rawRows = (data || []) as ReminderRow[];

  // Second‑stage, precise filtering to honor manager visibility rules without
  // constructing enormous `lead_id.in.(...)` lists.
  let visibleRows: ReminderRow[] = rawRows;

  if (!isAdminOrGlobal && authUser.role === "manager" && rawRows.length > 0) {
    // Managers can see:
    // - Reminders they created (already enforced by coarse filter), plus
    // - Reminders on leads assigned to users in any of their departments.
    const deptIds =
      (authUser.departmentIds?.length ?? 0) > 0
        ? authUser.departmentIds!
        : authUser.departmentId
          ? [authUser.departmentId]
          : [];

    if (deptIds.length > 0) {
      const leadIds = Array.from(
        new Set(rawRows.map((r) => r.lead_id).filter(Boolean)),
      );

      if (leadIds.length > 0) {
        const { data: leadsForRows, error: leadsError } = await supabaseAdmin
          .from("leads")
          .select("id, department_id")
          .in("id", leadIds)
          .eq("is_deleted", false);

        if (leadsError) {
          throw new ApiError(ERROR_CODES.DATABASE_ERROR, leadsError.message);
        }

        const allowedLeadSet = new Set(
          (leadsForRows || [])
            .filter((l: any) => l.department_id && deptIds.includes(l.department_id))
            .map((l: any) => l.id),
        );

        visibleRows = rawRows.filter(
          (r) =>
            r.user_id === authUser.id ||
            (r.lead_id && allowedLeadSet.has(r.lead_id)),
        );
      }
    }
  }

  const reminders = await enrichReminders(visibleRows);

  return {
    data: reminders,
    meta: calculatePaginationMeta(count || 0, { page, limit }),
  };
}

/**
 * Get reminders count (optimized for badges/widgets)
 */
export async function getRemindersCount(
  query: {
    userId?: string;
    status?: "pending" | "sent" | "all";
    date?: string; // Format: YYYY-MM-DD
  },
  authUser: AuthUser,
): Promise<number> {
  let baseQuery = supabaseAdmin
    .from("lead_reminders")
    .select("id", { count: "exact", head: true });

  // NOTE: Badge count must be fast and reliable.
  // The previous implementation fetched all owned lead IDs and built a large `or(...lead_id.in.(...))`
  // filter, which can result in long URLs / request failures in development.
  // For the badge/widget, we count only reminders created for the current user (or selected user for admins).
  if (authUser.role !== "admin") {
    baseQuery = baseQuery.eq("user_id", authUser.id);
  } else if (query.userId) {
    baseQuery = baseQuery.eq("user_id", query.userId);
  }

  // Status Filter
  if (query.status === "pending") {
    baseQuery = baseQuery.eq("is_done", false);
  } else if (query.status === "sent") {
    baseQuery = baseQuery.eq("is_done", true);
  }

  // Date Filter
  if (query.date) {
    const startDate = new Date(query.date);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(query.date);
    endDate.setHours(23, 59, 59, 999);

    baseQuery = baseQuery
      .gte("reminder_at", startDate.toISOString())
      .lte("reminder_at", endDate.toISOString());
  }

  const { count, error } = await baseQuery;

  if (error) {
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
  }

  return count || 0;
}

/**
 * Mark a reminder as done
 */
export async function markReminderDone(
  reminderId: string,
  authUser: AuthUser,
): Promise<LeadReminder> {
  let query = supabaseAdmin
    .from("lead_reminders")
    .update({
      is_done: true,
    })
    .eq("id", reminderId);
  if (authUser.role !== "admin") {
    query = query.eq("user_id", authUser.id); // Non-admins can only mark their own reminders
  }

  const { data, error } = await query
    .select(LEAD_REMINDER_SELECT)
    .maybeSingle();

  if (error) {
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
  }

  if (!data) {
    throw ApiError.notFound("Reminder");
  }

  const [reminder] = await enrichReminders([data as ReminderRow]);
  if (!reminder) {
    throw ApiError.notFound("Reminder");
  }
  const { user, ...record } = reminder;

  await invalidateLeadDetailPageCache(record.leadId);

  return record;
}
