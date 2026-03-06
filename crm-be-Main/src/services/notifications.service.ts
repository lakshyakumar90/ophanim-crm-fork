import { supabaseAdmin } from "../config/supabase.js";
import { ApiError } from "../utils/responses.js";
import { ERROR_CODES } from "../utils/error-codes.js";
import {
  parsePaginationParams,
  calculatePaginationMeta,
  calculateOffset,
} from "../utils/pagination.js";
import { getCurrentTimestamp } from "../utils/helpers.js";
import { nowIST, getTimestampIST } from "../utils/date-utils.js";
import type { PaginatedResult } from "../types/api.types.js";

interface NotificationRecord {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  relatedEntityType: string | null;
  relatedEntityId: string | null;
  isRead: boolean;
  actionUrl: string | null;
  priority: string;
  createdAt: string;
}

interface NotificationRow {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  related_entity_type: string | null;
  related_entity_id: string | null;
  is_read: boolean;
  action_url: string | null;
  priority: string;
  created_at: string;
}

function mapNotificationRowToRecord(data: NotificationRow): NotificationRecord {
  return {
    id: data.id,
    userId: data.user_id,
    title: data.title,
    message: data.message,
    type: data.type,
    relatedEntityType: data.related_entity_type,
    relatedEntityId: data.related_entity_id,
    isRead: data.is_read,
    actionUrl: data.action_url,
    priority: data.priority,
    createdAt: data.created_at,
  };
}

/**
 * Get notifications for user
 */
export async function getNotifications(
  userId: string,
  query: { page?: string; limit?: string; unreadOnly?: string },
): Promise<PaginatedResult<NotificationRecord>> {
  const pagination = parsePaginationParams(query);
  const offset = calculateOffset(pagination);

  let baseQuery = supabaseAdmin
    .from("notifications")
    .select(
      "id, user_id, title, message, type, related_entity_type, related_entity_id, is_read, action_url, priority, created_at",
      { count: "exact" },
    )
    .eq("user_id", userId);

  if (query.unreadOnly === "true") {
    baseQuery = baseQuery.eq("is_read", false);
  }

  baseQuery = baseQuery
    .order("created_at", { ascending: false })
    .range(offset, offset + pagination.limit - 1);

  const { data, error, count } = await baseQuery;

  if (error) {
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
  }

  const notifications = (data || []).map((n: any) =>
    mapNotificationRowToRecord(n as unknown as NotificationRow),
  );

  return {
    data: notifications,
    meta: calculatePaginationMeta(count || 0, pagination),
  };
}

/**
 * Get unread count
 */
export async function getUnreadCount(userId: string): Promise<number> {
  const { count, error } = await supabaseAdmin
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_read", false);

  if (error) {
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
  }

  return count || 0;
}

/**
 * Mark notification as read
 */
export async function markAsRead(
  notificationId: string,
  userId: string,
): Promise<void> {
  const { error } = await supabaseAdmin
    .from("notifications")
    .update({ is_read: true })
    .eq("id", notificationId)
    .eq("user_id", userId);

  if (error) {
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
  }
}

/**
 * Mark all as read
 */
export async function markAllAsRead(userId: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", userId)
    .eq("is_read", false);

  if (error) {
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
  }
}

/**
 * Delete notification
 */
export async function deleteNotification(
  notificationId: string,
  userId: string,
): Promise<void> {
  const { error } = await supabaseAdmin
    .from("notifications")
    .delete()
    .eq("id", notificationId)
    .eq("user_id", userId);

  if (error) {
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
  }
}

/**
 * Create notification
 */
export async function createNotification(input: {
  userId: string;
  title: string;
  message: string;
  type: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  actionUrl?: string;
  priority?: string;
}): Promise<NotificationRecord> {
  const { data, error } = await supabaseAdmin
    .from("notifications")
    .insert({
      user_id: input.userId,
      title: input.title,
      message: input.message,
      type: input.type,
      related_entity_type: input.relatedEntityType,
      related_entity_id: input.relatedEntityId,
      action_url: input.actionUrl,
      priority: input.priority || "medium",
    })
    .select()
    .single();

  if (error) {
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
  }

  return mapNotificationRowToRecord(data as unknown as NotificationRow);
}

/**
 * Create bulk notifications
 */
export async function createBulkNotifications(
  userIds: string[],
  notification: {
    title: string;
    message: string;
    type: string;
    relatedEntityType?: string;
    relatedEntityId?: string;
    actionUrl?: string;
  },
): Promise<number> {
  const records = userIds.map((userId) => ({
    user_id: userId,
    title: notification.title,
    message: notification.message,
    type: notification.type,
    related_entity_type: notification.relatedEntityType,
    related_entity_id: notification.relatedEntityId,
    action_url: notification.actionUrl,
    priority: "medium",
  }));

  const { error, count } = await supabaseAdmin
    .from("notifications")
    .insert(records);

  if (error) {
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
  }

  return count || userIds.length;
}

/**
 * Get notification preferences
 */
export async function getPreferences(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("notification_preferences")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error || !data) {
    // Return defaults
    return {
      leadAssignment: true,
      taskAssignment: true,
      statusUpdates: true,
      mentions: true,
      systemNotifications: true,
      attendanceAlerts: true,
      emailNotifications: false,
    };
  }

  return {
    leadAssignment: data.lead_assignment,
    taskAssignment: data.task_assignment,
    statusUpdates: data.status_updates,
    mentions: data.mentions,
    systemNotifications: data.system_notifications,
    attendanceAlerts: data.attendance_alerts,
    emailNotifications: data.email_notifications,
  };
}

/**
 * Update notification preferences
 */
export async function updatePreferences(
  userId: string,
  prefs: {
    leadAssignment?: boolean;
    taskAssignment?: boolean;
    statusUpdates?: boolean;
    mentions?: boolean;
    systemNotifications?: boolean;
    attendanceAlerts?: boolean;
    emailNotifications?: boolean;
  },
) {
  const { data: existing } = await supabaseAdmin
    .from("notification_preferences")
    .select("id")
    .eq("user_id", userId)
    .single();

  const updateData: Record<string, unknown> = {};
  if (prefs.leadAssignment !== undefined)
    updateData["lead_assignment"] = prefs.leadAssignment;
  if (prefs.taskAssignment !== undefined)
    updateData["task_assignment"] = prefs.taskAssignment;
  if (prefs.statusUpdates !== undefined)
    updateData["status_updates"] = prefs.statusUpdates;
  if (prefs.mentions !== undefined) updateData["mentions"] = prefs.mentions;
  if (prefs.systemNotifications !== undefined)
    updateData["system_notifications"] = prefs.systemNotifications;
  if (prefs.attendanceAlerts !== undefined)
    updateData["attendance_alerts"] = prefs.attendanceAlerts;
  if (prefs.emailNotifications !== undefined)
    updateData["email_notifications"] = prefs.emailNotifications;
  updateData["updated_at"] = getTimestampIST();

  if (existing) {
    const { data, error } = await supabaseAdmin
      .from("notification_preferences")
      .update(updateData)
      .eq("id", existing.id)
      .select()
      .single();

    if (error) {
      throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
    }

    return data;
  } else {
    const { data, error } = await supabaseAdmin
      .from("notification_preferences")
      .insert({
        user_id: userId,
        ...updateData,
      })
      .select()
      .single();

    if (error) {
      throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
    }

    return data;
  }
}

/**
 * Cleanup old notifications (older than 30 days)
 */
export async function cleanupOldNotifications(): Promise<number> {
  const thirtyDaysAgo = nowIST();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data, error } = await supabaseAdmin
    .from("notifications")
    .delete()
    .lt("created_at", thirtyDaysAgo.toISOString())
    .eq("is_read", true)
    .select("id");

  if (error) {
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
  }

  return data?.length || 0;
}
