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
  LEAD_DETAIL_SELECT,
  LEAD_ACTIVITY_SELECT,
  LEAD_COMMENT_SELECT,
  LEAD_REMINDER_SELECT,
  type LeadRecord,
  type LeadRow,
} from "./leads.shared.js";
import { getLeadById } from "./leads-crud.service.js";

// ============ LEAD REMINDER FUNCTIONS ============

export interface LeadReminder {
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
