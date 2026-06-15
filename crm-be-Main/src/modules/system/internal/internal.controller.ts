import { Request, Response, NextFunction } from "express";
import { supabaseAdmin } from "../../../config/supabase.js";
import { config } from "../../../config/env.js";
import { getTimestampIST } from "../../../utils/date-utils.js";
import { getCurrentTimestamp } from "../../../utils/helpers.js";
import { logger } from "../../../utils/logger.js";
import { logActivity } from "../../shared/activity-events.service.js";

function verifyInternalAuth(req: Request, res: Response): boolean {
  const cronSecret = config.cron.secret;
  if (!cronSecret) {
    logger.error("[Internal API] CRON_SECRET not configured");
    res.status(500).json({ error: "Server configuration error" });
    return false;
  }

  const authHeader = req.headers["x-cron-secret"];
  if (authHeader !== cronSecret) {
    logger.warn("[Internal API] Unauthorized request attempt");
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }

  return true;
}

export const autoLogout = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (!verifyInternalAuth(req, res)) return;

  try {
    const nowISO = getTimestampIST();

    logger.info(`[Auto-Logout] Starting processing at ${nowISO}`);

    const { data: openRecords, error: fetchError } = await supabaseAdmin
      .from("attendance")
      .select(`
        id,
        user_id,
        clock_in_time,
        shift_end_time,
        break_duration,
        status,
        notes
      `)
      .is("clock_out_time", null)
      .not("shift_end_time", "is", null)
      .lte("shift_end_time", nowISO);

    if (fetchError) {
      logger.error({ error: fetchError }, "[Auto-Logout] Error fetching records");
      res.status(500).json({
        success: false,
        error: "Database query failed",
      });
      return;
    }

    if (!openRecords || openRecords.length === 0) {
      logger.info("[Auto-Logout] No records to process");
      res.status(200).json({
        success: true,
        message: "No records to process",
        processed: 0,
        timestamp: nowISO,
      });
      return;
    }

    logger.info(`[Auto-Logout] Found ${openRecords.length} records to process`);

    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    for (const record of openRecords) {
      try {
        const clockOutTime = record.shift_end_time;
        const clockIn = new Date(record.clock_in_time);
        const clockOut = new Date(clockOutTime);
        const breakDuration = record.break_duration || 0;

        const totalMinutes =
          (clockOut.getTime() - clockIn.getTime()) / 60000 - breakDuration;
        const totalHours = Math.round((totalMinutes / 60) * 100) / 100;

        let status = record.status;
        const halfDayHours = 4;
        const fullDayHours = 9;

        if (totalHours < halfDayHours) {
          status = "half_day";
        } else if (totalHours >= fullDayHours) {
          status = record.status === "late" ? "late" : "present";
        }

        const autoNote = `[Auto] Shift ended - auto logged out`;
        const updateNotes = record.notes
          ? `${record.notes}\n${autoNote}`
          : autoNote;

        const { error: updateError } = await supabaseAdmin
          .from("attendance")
          .update({
            clock_out_time: clockOutTime,
            total_hours: totalHours,
            status,
            notes: updateNotes,
            auto_logged_out: true,
            updated_at: getCurrentTimestamp(),
          })
          .eq("id", record.id);

        if (updateError) {
          throw new Error(updateError.message);
        }

        await supabaseAdmin.from("user_activities").insert({
          user_id: record.user_id,
          activity_type: "auto_clock_out",
          title: "Auto-logged out",
          description: "Shift ended - automatically clocked out",
          metadata: {
            clock_out_time: clockOutTime,
            total_hours: totalHours,
            auto_logged_out: true,
          },
          created_at: nowISO,
        });

        await logActivity({
          actorId: record.user_id,
          entityType: "attendance",
          entityId: record.id,
          eventType: "auto_clock_out",
          source: "attendance",
          metadata: {
            clock_out_time: clockOutTime,
            total_hours: totalHours,
          },
        });

        successCount++;
      } catch (error: any) {
        errorCount++;
        errors.push(`User ${record.user_id}: ${error.message}`);
        logger.error(
          { error, userId: record.user_id },
          "[Auto-Logout] Error processing attendance record",
        );
      }
    }

    logger.info(
      `[Auto-Logout] Completed: ${successCount} success, ${errorCount} errors`,
    );

    res.status(200).json({
      success: true,
      message: "Auto-logout processing completed",
      processed: successCount,
      errors: errorCount,
      errorDetails: errors.length > 0 ? errors : undefined,
      timestamp: nowISO,
    });
  } catch (error: any) {
    logger.error({ error }, "[Auto-Logout] Unexpected error");
    res.status(500).json({
      success: false,
      error: "Auto-logout processing failed",
      message: error.message,
    });
  }
};
