import { Request, Response, NextFunction } from "express";
import { config } from "../../../config/env.js";
import { supabaseAdmin } from "../../../config/supabase.js";
import {
  processLeadReminders,
  processTaskReminders,
} from "../../operations/workers/reminder.service.js";
import { processPerformanceDeadlineReminders } from "../../hr/performance/performance.service.js";
import { bulkAutoLogoutDueSessions } from "../../operations/attendance/attendance.service.js";
import { logger } from "../../../utils/logger.js";
import { runComplianceChecks } from "../../hr/analytics/hr-analytics.service.js";

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

export const processReminders = async (
  req: Request,
  res: Response,
  _next: NextFunction,
) => {
  if (!verifyCronAuth(req, res)) return;

  try {
    logger.info("[Cron] Starting reminder processing...");

    await Promise.all([
      processTaskReminders(),
      processLeadReminders(),
      processPerformanceDeadlineReminders(),
    ]);

    logger.info("[Cron] Reminder processing completed");

    res.status(200).json({
      success: true,
      message: "Reminders processed successfully",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error({ error }, "[Cron] Error processing reminders");
    res.status(500).json({
      success: false,
      error: "Failed to process reminders",
    });
  }
};

export const autoLogout = async (
  req: Request,
  res: Response,
  _next: NextFunction,
) => {
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
  }

  try {
    logger.info("[Cron] Starting auto-logout processing...");

    const loggedOutCount = await bulkAutoLogoutDueSessions();
    logger.info({ loggedOutCount }, "[Cron] Auto-logout completed");

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

    res.status(200).json({
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

    res.status(500).json({
      success: false,
      error: "Failed to process auto-logout",
    });
  }
};

export const getAutoLogoutStatus = async (
  req: Request,
  res: Response,
  _next: NextFunction,
) => {
  if (!verifyCronAuth(req, res)) return;

  const { data, error } = await supabaseAdmin
    .from("cron_job_runs")
    .select("*")
    .eq("job_name", "auto_logout")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    res.status(500).json({
      success: false,
      error: "Failed to fetch auto-logout status",
    });
    return;
  }

  res.status(200).json({
    success: true,
    data,
    now: new Date().toISOString(),
  });
};

export const complianceChecks = async (
  req: Request,
  res: Response,
  _next: NextFunction,
) => {
  if (!verifyCronAuth(req, res)) return;

  try {
    logger.info("[Cron] Starting HR compliance checks...");
    const result = await runComplianceChecks();
    logger.info(
      { notificationsSent: result.notificationsSent },
      "[Cron] HR compliance checks completed",
    );

    res.status(200).json(result);
  } catch (error) {
    logger.error({ error }, "[Cron] Error processing HR compliance checks");
    res.status(500).json({
      success: false,
      error: "Failed to process compliance checks",
    });
  }
};
