import rateLimit from "express-rate-limit";
import type { Request, Response } from "express";
import { config } from "../config/env.js";
import { ERROR_CODES } from "../utils/error-codes.js";

/**
 * Default rate limiter for all routes
 */
export const defaultRateLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: ERROR_CODES.RATE_LIMIT_EXCEEDED,
      message: "Too many requests, please try again later",
    },
  },
  keyGenerator: (req: Request): string => {
    // Use user ID if authenticated, otherwise use IP
    const user = (req as Request & { user?: { id: string } }).user;
    return user?.id || req.ip || "unknown";
  },
  validate: false,
});

/**
 * Stricter rate limiter for auth routes
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: ERROR_CODES.RATE_LIMIT_EXCEEDED,
      message: "Too many login attempts, please try again in 15 minutes",
    },
  },
  skipSuccessfulRequests: true,
});

/**
 * Rate limiter for bulk operations
 */
export const bulkOperationRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // 5 bulk operations per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: ERROR_CODES.RATE_LIMIT_EXCEEDED,
      message: "Too many bulk operations, please try again later",
    },
  },
});

/**
 * Rate limiter for exports
 */
export const exportRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 3, // 3 exports per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: ERROR_CODES.RATE_LIMIT_EXCEEDED,
      message: "Too many export requests, please try again later",
    },
  },
});

/**
 * Strict rate limiter for internal endpoints
 */
export const internalRouteRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: ERROR_CODES.RATE_LIMIT_EXCEEDED,
      message: "Too many internal requests, please try again later",
    },
  },
});
