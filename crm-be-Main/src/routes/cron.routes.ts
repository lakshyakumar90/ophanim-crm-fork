import { Router, Request, Response } from "express";
import { config } from "../config/env.js";
import { supabaseAdmin } from "../config/supabase.js";
import {
  processLeadReminders,
  processTaskReminders,
} from "../services/reminder.service.js";
import { bulkAutoLogoutDueSessions } from "../services/attendance.service.js";
import { logger } from "../utils/logger.js";

const router: Router = Router();

router.use((_req, res, next): void => {
  if (!config.cron.enableHttpCron) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  next();
});

/**
 * Verify cron request authorization.
 * CRON_SECRET is mandatory and enforced for every cron request.
 * Returns true if authorized, false otherwise.
 */
function verifyCronAuth(req: Request, res: Response): boolean {
  const cronSecret = config.cron.secret;
  if (!cronSecret) {
    res.status(500).json({ error: "CRON_SECRET is not configured" });
    return false;
  }

  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${cronSecret}`) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  return true;
}

/**
 * GET /api/v1/cron/reminders
 * Cron endpoint for processing reminders
 * Called by external scheduler when ENABLE_HTTP_CRON=true
 */
router.get("/reminders", async (req, res) => {
  if (!verifyCronAuth(req, res)) return;

  try {
    logger.info("[Cron] Starting reminder processing...");

    // Process all reminder types
    await Promise.all([processTaskReminders(), processLeadReminders()]);

    logger.info("[Cron] Reminder processing completed");

    return res.status(200).json({
      success: true,
      message: "Reminders processed successfully",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error({ error }, "[Cron] Error processing reminders");
    return res.status(500).json({
      success: false,
      error: "Failed to process reminders",
    });
  }
});

/**
 * POST /api/v1/cron/auto-logout
 * Cron endpoint for auto-logging out users who forgot to clock out
 * Called by external scheduler when ENABLE_HTTP_CRON=true
 */
router.post("/auto-logout", async (req, res) => {
  if (!verifyCronAuth(req, res)) return;

  const startedAt = Date.now();
  let runId: number | null = null;

  try {
    const { data: runInsert } = await supabaseAdmin
      .from("cron_job_runs")
      .insert({
        job_name: "auto_logout",
        started_at: new Date().toISOString(),
        processed_count: 0,
      })
      .select("id")
      .single();

    runId = (runInsert as any)?.id ?? null;
  } catch (trackingErr) {
    logger.error(
      { error: trackingErr },
      "[Cron] Failed to insert cron run tracking record",
    );
    // Continue with the actual job even if tracking fails
  }

  try {
    logger.info("[Cron] Starting auto-logout processing...");

    const loggedOutCount = await bulkAutoLogoutDueSessions();
    logger.info(
      { loggedOutCount },
      "[Cron] Auto-logout completed",
    );

    if (runId) {
      await supabaseAdmin
        .from("cron_job_runs")
        .update({
          finished_at: new Date().toISOString(),
          success: true,
          processed_count: loggedOutCount,
          duration_ms: Date.now() - startedAt,
          error_message: null,
        })
        .eq("id", runId);
    }

    return res.status(200).json({
      success: true,
      loggedOutCount,
    });
  } catch (error) {
    logger.error({ error }, "[Cron] Error processing auto-logout");

    if (runId) {
      await supabaseAdmin
        .from("cron_job_runs")
        .update({
          finished_at: new Date().toISOString(),
          success: false,
          duration_ms: Date.now() - startedAt,
          error_message:
            error instanceof Error ? error.message : "Unknown error",
        })
        .eq("id", runId);
    }

    return res.status(500).json({
      success: false,
      error: "Failed to process auto-logout",
    });
  }
});

/**
 * GET /api/v1/cron/auto-logout/status
 * Monitoring endpoint for last auto-logout run.
 */
router.get("/auto-logout/status", async (req, res) => {
  if (!verifyCronAuth(req, res)) return;
  const { data, error } = await supabaseAdmin
    .from("cron_job_runs")
    .select("*")
    .eq("job_name", "auto_logout")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return res.status(500).json({
      success: false,
      error: "Failed to fetch auto-logout status",
    });
  }

  return res.status(200).json({
    success: true,
    data,
    now: new Date().toISOString(),
  });
});

export default router;
