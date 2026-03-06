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

export default router;
