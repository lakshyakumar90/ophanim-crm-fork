import { Request, Response } from "express";
import { getTimestampIST } from "../../../utils/date-utils.js";

const startTime = new Date();

export const healthCheck = (_req: Request, res: Response) => {
  const uptime = Math.floor((Date.now() - startTime.getTime()) / 1000);
  res.status(200).json({
    status: "healthy",
    timestamp: getTimestampIST(),
    uptime: `${uptime}s`,
    version: process.env["npm_package_version"] || "1.0.0",
  });
};

export const readinessCheck = async (_req: Request, res: Response) => {
  try {
    res.status(200).json({
      status: "ready",
      timestamp: new Date().toISOString(),
    });
  } catch {
    res.status(503).json({
      status: "not ready",
      timestamp: new Date().toISOString(),
    });
  }
};
