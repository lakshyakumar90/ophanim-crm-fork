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

// ============ COMMENT FUNCTIONS ============

export interface LeadComment {
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
