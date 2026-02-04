import { Router, type Router as RouterType } from "express";

import { getTimestampIST } from "../utils/date-utils.js";
const router: RouterType = Router();

const startTime = new Date();

/**
 * GET /health
 * Health check endpoint
 */
router.get("/", (_req, res) => {
  const uptime = Math.floor((Date.now() - startTime.getTime()) / 1000);

  res.status(200).json({
    status: "healthy",
    timestamp: getTimestampIST(),
    uptime: `${uptime}s`,
    version: process.env["npm_package_version"] || "1.0.0",
  });
});

/**
 * GET /health/ready
 * Readiness check (can be extended to check DB connection)
 */
router.get("/ready", async (_req, res) => {
  try {
    // In production, you might want to check DB connection here
    res.status(200).json({
      status: "ready",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      status: "not ready",
      timestamp: new Date().toISOString(),
    });
  }
});

import { supabaseAdmin } from "../config/supabase.js";

router.get("/update-rules-temp", async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from("attendance_rules")
    .update({
      work_start_time: "19:00",
      work_end_time: "04:00",
      late_threshold_minutes: 15,
    })
    .eq("id", "1") // Assuming id 1 or we update all. Usually single row.
    .select();

  // If no row, insert one
  if (!data || data.length === 0) {
    await supabaseAdmin.from("attendance_rules").insert({
      work_start_time: "19:00",
      work_end_time: "04:00",
      late_threshold_minutes: 15,
    });
  }

  res.json({ success: true, data, error });
});

export default router;
