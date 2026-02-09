import { Router, Request, Response } from "express";
import {
  processLeadReminders,
  processTaskReminders,
} from "../services/reminder.service.js";
import { autoLogoutShiftUsers } from "../services/attendance.service.js";

const router: Router = Router();

/**
 * Verify cron request authorization.
 * If CRON_SECRET is set (locally or on Vercel), always enforce it.
 * Returns true if authorized, false otherwise.
 */
function verifyCronAuth(req: Request, res: Response): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = req.headers.authorization;
    if (authHeader !== `Bearer ${cronSecret}`) {
      res.status(401).json({ error: "Unauthorized" });
      return false;
    }
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

  try {
    console.log("[Cron] Starting auto-logout processing...");

    const result = await autoLogoutShiftUsers();

    console.log(
      `[Cron] Auto-logout completed: ${result.dayShiftCount} day shift, ${result.nightShiftCount} night shift`,
    );

    if (result.errors.length > 0) {
      console.error("[Cron] Auto-logout errors:", result.errors);
    }

    return res.status(200).json({
      success: true,
      message: "Auto-logout processed successfully",
      data: result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Cron] Error processing auto-logout:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to process auto-logout",
    });
  }
});

export default router;
