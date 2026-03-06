import type { Request, Response, NextFunction } from "express";
import { ApiError, sendError } from "../utils/responses.js";
import { ERROR_CODES } from "../utils/error-codes.js";
import { logger } from "../utils/logger.js";
import { config } from "../config/env.js";

/**
 * Global error handling middleware
 */
export function errorMiddleware(
  error: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const requestId = (req as Request & { requestId?: string }).requestId;

  // Log error with full stack in development
  if (error instanceof ApiError) {
    logger.warn(
      {
        requestId,
        code: error.code,
        message: error.message,
        details: error.details,
        stack: config.server.isDevelopment ? error.stack : undefined,
      },
      "API Error"
    );
  } else {
    logger.error(
      {
        requestId,
        message: error.message,
        stack: error.stack,
      },
      "Unhandled Error"
    );
  }

  // Send appropriate error response
  if (error instanceof ApiError) {
    sendError(res, error, requestId);
  } else {
    // In development, expose actual error details for debugging
    if (config.server.isDevelopment) {
      const devError = new ApiError(
        ERROR_CODES.INTERNAL_ERROR,
        error.message || "An unexpected error occurred",
        { stack: error.stack }
      );
      sendError(res, devError, requestId);
    } else {
      // Don't expose internal errors in production
      sendError(res, ApiError.internal(), requestId);
    }
  }
}

/**
 * 404 Not Found middleware
 */
export function notFoundMiddleware(
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const error = ApiError.notFound(`Route ${req.method} ${req.path}`);
  const requestId = (req as Request & { requestId?: string }).requestId;
  sendError(res, error, requestId);
}

/**
 * Async handler wrapper to catch errors in async route handlers
 */
export function asyncHandler<T extends Request = Request>(
  fn: (req: T, res: Response, next: NextFunction) => Promise<void>
): (req: T, res: Response, next: NextFunction) => void {
  return (req: T, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
