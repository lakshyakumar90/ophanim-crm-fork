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

export interface LeadActivityRecord {
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
