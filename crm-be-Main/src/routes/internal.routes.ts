import { Router, Request, Response } from "express";
import { supabaseAdmin } from "../config/supabase.js";
import { SHIFT_TYPES } from "../config/constants.js";
import { getTimestampIST } from "../utils/date-utils.js";
import { getCurrentTimestamp } from "../utils/helpers.js";

const router: Router = Router();

/**
 * Verify internal API request authorization using CRON_SECRET
 */
function verifyInternalAuth(req: Request, res: Response): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error("[Internal API] CRON_SECRET not configured");
    res.status(500).json({ error: "Server configuration error" });
    return false;
  }

  const authHeader = req.headers["x-cron-secret"];
  if (authHeader !== cronSecret) {
    console.warn("[Internal API] Unauthorized request attempt");
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }

  return true;
}

/**
 * POST /api/v1/internal/auto-logout
 * Secure endpoint for auto-logout processing
 * Called by GitHub Actions at shift end times
 */
router.post("/auto-logout", async (req: Request, res: Response) => {
  if (!verifyInternalAuth(req, res)) return;

  try {
    const now = new Date();
    const nowISO = getTimestampIST();

    console.log(`[Auto-Logout] Starting processing at ${nowISO}`);

    // Find all attendance records where:
    // 1. clock_out_time is NULL (still clocked in)
    // 2. shift_end_time has passed (shift should have ended)
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
      console.error("[Auto-Logout] Error fetching records:", fetchError);
      return res.status(500).json({
        success: false,
        error: "Database query failed",
      });
    }

    if (!openRecords || openRecords.length === 0) {
      console.log("[Auto-Logout] No records to process");
      return res.status(200).json({
        success: true,
        message: "No records to process",
        processed: 0,
        timestamp: nowISO,
      });
    }

    console.log(`[Auto-Logout] Found ${openRecords.length} records to process`);

    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    // Process each record
    for (const record of openRecords) {
      try {
        // Use shift_end_time as the clock_out_time (not current time)
        // This ensures accurate attendance even if cron runs late
        const clockOutTime = record.shift_end_time;
        const clockIn = new Date(record.clock_in_time);
        const clockOut = new Date(clockOutTime);
        const breakDuration = record.break_duration || 0;

        // Calculate total hours
        const totalMinutes =
          (clockOut.getTime() - clockIn.getTime()) / 60000 - breakDuration;
        const totalHours = Math.round((totalMinutes / 60) * 100) / 100;

        // Determine final status based on hours worked
        let status = record.status;
        // Default thresholds (should match attendance_rules but using safe defaults)
        const halfDayHours = 4;
        const fullDayHours = 8;

        if (totalHours < halfDayHours) {
          status = "half_day";
        } else if (totalHours >= fullDayHours) {
          status = record.status === "late" ? "late" : "present";
        }

        // Build notes
        const autoNote = `[Auto] Shift ended - auto logged out`;
        const updateNotes = record.notes
          ? `${record.notes}\n${autoNote}`
          : autoNote;

        // Update the attendance record
        const { error: updateError } = await supabaseAdmin
          .from("attendance")
          .update({
            clock_out_time: clockOutTime, // Use shift_end_time, not now
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

        // Log the auto-logout activity
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

        successCount++;
      } catch (error: any) {
        errorCount++;
        errors.push(`User ${record.user_id}: ${error.message}`);
        console.error(`[Auto-Logout] Error processing user ${record.user_id}:`, error);
      }
    }

    console.log(`[Auto-Logout] Completed: ${successCount} success, ${errorCount} errors`);

    return res.status(200).json({
      success: true,
      message: "Auto-logout processing completed",
      processed: successCount,
      errors: errorCount,
      errorDetails: errors.length > 0 ? errors : undefined,
      timestamp: nowISO,
    });
  } catch (error: any) {
    console.error("[Auto-Logout] Unexpected error:", error);
    return res.status(500).json({
      success: false,
      error: "Auto-logout processing failed",
      message: error.message,
    });
  }
});

export default router;
