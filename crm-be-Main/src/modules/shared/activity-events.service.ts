import { supabaseAdmin } from "../../config/supabase.js";
import { getTimestampIST } from "../../utils/date-utils.js";
import { logger } from "../../utils/logger.js";

export interface ActivityEvent {
  actorId: string;
  entityType: string;
  entityId?: string;
  entityName?: string;
  eventType: string;   // e.g. 'comment_added', 'status_changed', 'task_created'
  source?: string;     // origin context: 'lead' | 'task' | 'team' | 'attendance'
  metadata?: Record<string, unknown>;
}

/**
 * Dual-write helper — inserts a row into activity_events alongside the legacy
 * user_activities / lead_activities inserts.
 *
 * Failures are logged but NOT re-thrown so they never break the primary write.
 * Remove the try/catch and make it async after cut-over (B-8) when this is the
 * sole write path.
 */
export async function logActivity(event: ActivityEvent): Promise<void> {
  try {
    const { error } = await supabaseAdmin.from("activity_events").insert({
      actor_id: event.actorId,
      entity_type: event.entityType,
      entity_id: event.entityId ?? null,
      entity_name: event.entityName ?? null,
      event_type: event.eventType,
      source: event.source ?? null,
      metadata: event.metadata ?? null,
      created_at: getTimestampIST(),
    });

    if (error) {
      logger.warn({ err: error }, "[activity-events] dual-write insert failed");
    }
  } catch (err) {
    logger.warn({ err }, "[activity-events] dual-write unexpected error");
  }
}
