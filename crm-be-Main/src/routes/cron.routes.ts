import { Router, Request, Response } from "express";
import {
  processLeadReminders,
  processTaskReminders,
} from "../services/reminder.service.js";

const router: Router = Router();

/**
 * GET /api/v1/cron/reminders
 * Cron endpoint for processing reminders
 * Called by Vercel Cron every 5 minutes
 */
router.get("/reminders", async (req, res) => {
  // Verify the request is from Vercel Cron
  const authHeader = req.headers.authorization;

  // In production, Vercel sets CRON_SECRET automatically
  // For local dev, we skip this check
  if (process.env.VERCEL && process.env.CRON_SECRET) {
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return res.status(401).json({ error: "Unauthorized" });
    }
  }

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

export default router;
