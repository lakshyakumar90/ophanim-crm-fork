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
  type LeadRecord,
  type LeadRow,
} from "./leads.shared.js";

import { getLeadById } from "./leads-crud.service.js";

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
