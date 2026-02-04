import type { Request, Response, NextFunction } from "express";
import { v4 as uuidv4 } from "uuid";
import { logger } from "../utils/logger.js";

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

  // Log request
  const startTime = Date.now();

  logger.info(
    {
      requestId,
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
      userAgent: req.get("user-agent"),
    },
    "Incoming request"
  );

  // Log response on finish
  res.on("finish", () => {
    const duration = Date.now() - startTime;
    logger.info(
      {
        requestId,
        method: req.method,
        url: req.originalUrl,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
      },
      "Request completed"
    );
  });

  next();
}
