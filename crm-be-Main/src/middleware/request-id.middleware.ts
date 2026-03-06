import type { Request, Response, NextFunction } from "express";
import { v4 as uuidv4 } from "uuid";
import { config } from "../config/env.js";
import { logger } from "../utils/logger.js";

function shouldSkipRequestLog(req: Request): boolean {
  if (req.method === "OPTIONS") return true;

  const url = req.originalUrl || req.url || "";
  return (
    url === "/health" ||
    url.startsWith("/health") ||
    url === "/favicon.ico" ||
    url.startsWith("/_next/")
  );
}

/**
 * Middleware to add request ID and logging
 */
export function requestIdMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Generate or use existing request ID
  const requestId = (req.headers["x-request-id"] as string) || uuidv4();

  // Attach to request
  (req as Request & { requestId: string }).requestId = requestId;

  // Set response header
  res.setHeader("X-Request-ID", requestId);

  const startTime = Date.now();

  // Log response on finish
  res.on("finish", () => {
    if (shouldSkipRequestLog(req)) return;

    const shouldSampleSuccess =
      res.statusCode < 400 &&
      Math.random() > config.logging.requestLogSampleRate;

    if (shouldSampleSuccess) return;

    const duration = Date.now() - startTime;
    logger.info(
      {
        requestId,
        method: req.method,
        url: req.originalUrl,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        ip: req.ip,
      },
      "Request completed"
    );
  });

  next();
}
