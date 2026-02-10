import { Router, Request, Response } from "express";
import {
  processLeadReminders,
  processTaskReminders,
} from "../services/reminder.service.js";
import { bulkAutoLogoutDueSessions } from "../services/attendance.service.js";

const router: Router = Router();

const autoLogoutMonitor = {
  lastRunAt: null as string | null,
  lastSuccessAt: null as string | null,
  lastLoggedOutCount: 0,
  lastError: null as string | null,
  lastDurationMs: 0,
};

/**
 * Verify cron request authorization.
 * CRON_SECRET is mandatory and enforced for every cron request.
 * Returns true if authorized, false otherwise.
 */
function verifyCronAuth(req: Request, res: Response): boolean {
  const cronSecret = process.env.CRON_SECRET;
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
 * Called by Vercel Cron every 5 minutes
 */
router.get("/reminders", async (req, res) => {
  if (!verifyCronAuth(req, res)) return;

  try {
    console.log("[Cron] Starting reminder processing...");

    // Process all reminder types
    await Promise.all([processTaskReminders(), processLeadReminders()]);

    console.log("[Cron] Reminder processing completed");

    return res.status(200).json({
      success: true,
      message: "Reminders processed successfully",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Cron] Error processing reminders:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to process reminders",
    });
  }
});

/**
 * GET /api/v1/cron/auto-logout
 * Cron endpoint for auto-logging out users who forgot to clock out
 * Called by Vercel Cron every 5 minutes
 */
router.get("/auto-logout", async (req, res) => {
  if (!verifyCronAuth(req, res)) return;

  const startedAt = Date.now();
  autoLogoutMonitor.lastRunAt = new Date().toISOString();

  try {
    console.log("[Cron] Starting auto-logout processing...");

    const loggedOutCount = await bulkAutoLogoutDueSessions();
    console.log(`[Cron] Auto-logout completed: ${loggedOutCount} sessions`);
    autoLogoutMonitor.lastSuccessAt = new Date().toISOString();
    autoLogoutMonitor.lastLoggedOutCount = loggedOutCount;
    autoLogoutMonitor.lastError = null;
    autoLogoutMonitor.lastDurationMs = Date.now() - startedAt;

    return res.status(200).json({
      success: true,
      loggedOutCount,
    });
  } catch (error) {
    console.error("[Cron] Error processing auto-logout:", error);
    autoLogoutMonitor.lastError =
      error instanceof Error ? error.message : "Unknown error";
    autoLogoutMonitor.lastDurationMs = Date.now() - startedAt;
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

  return res.status(200).json({
    success: true,
    data: autoLogoutMonitor,
    now: new Date().toISOString(),
  });
});

export default router;
