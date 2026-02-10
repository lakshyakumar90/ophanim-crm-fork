import type { Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config/env.js";
import { supabaseAdmin } from "../config/supabase.js";
import { ApiError } from "../utils/responses.js";
import { ERROR_CODES } from "../utils/error-codes.js";
import type {
  AuthenticatedRequest,
  AccessTokenPayload,
  AuthUser,
} from "../types/api.types.js";
import type { UserRole } from "../config/constants.js";

/**
 * Extract and verify JWT token from Authorization header
 */
function extractToken(authHeader: string | undefined): string {
  if (!authHeader) {
    throw new ApiError(ERROR_CODES.AUTH_TOKEN_MISSING);
  }

  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0]?.toLowerCase() !== "bearer") {
    throw new ApiError(
      ERROR_CODES.AUTH_TOKEN_INVALID,
      "Invalid authorization header format",
    );
  }

  return parts[1]!;
}

/**
 * Verify and decode JWT token
 */
function verifyToken(token: string): AccessTokenPayload {
  try {
    const decoded = jwt.verify(token, config.jwt.secret) as AccessTokenPayload;

    if (decoded.type !== "access") {
      throw new ApiError(ERROR_CODES.AUTH_TOKEN_INVALID, "Invalid token type");
    }

    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new ApiError(ERROR_CODES.AUTH_TOKEN_EXPIRED);
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new ApiError(ERROR_CODES.AUTH_TOKEN_INVALID);
    }
    throw error;
  }
}

/**
 * Authentication middleware - validates JWT and attaches user to request
 */
export async function authenticate(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const token = extractToken(req.headers.authorization);
    const payload = verifyToken(token);

    // Verify user still exists and is active
    const { data: user, error } = await supabaseAdmin
      .from("users")
      .select("id, email, role, team_id, department_id, is_active")
      .eq("id", payload.userId)
      .single();

    if (error || !user) {
      throw new ApiError(ERROR_CODES.AUTH_TOKEN_INVALID, "User not found");
    }

    if (!user.is_active) {
      throw new ApiError(ERROR_CODES.AUTH_ACCOUNT_DISABLED);
    }

    // Attach user to request
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role as UserRole,
      teamId: user.team_id,
      departmentId: user.department_id,
    };

    // Safety fallback: close overdue sessions and reject this request
    const autoLoggedOut = await checkAndAutoLogout(user.id);
    if (autoLoggedOut) {
      throw new ApiError(
        ERROR_CODES.UNAUTHORIZED,
        "Session expired due to auto-logout",
      );
    }

    next();
  } catch (error) {
    console.error("Auth Middleware Error:", error);
    next(error);
  }
}

/**
 * Lazy auto-logout check - called on each authenticated request
 * If user has an ACTIVE session where auto_logout_time has passed, complete it.
 */
async function checkAndAutoLogout(userId: string): Promise<boolean> {
  try {
    const now = new Date().toISOString();

    // Find open attendance where auto-logout time has passed
    const { data: openRecord } = await supabaseAdmin
      .from("attendance")
      .select(
        "id, clock_in_time, auto_logout_time, break_duration, status, notes, session_status",
      )
      .eq("user_id", userId)
      .eq("session_status", "ACTIVE")
      .not("auto_logout_time", "is", null)
      .lte("auto_logout_time", now)
      .single();

    if (!openRecord) return false;

    const clockOutTime = openRecord.auto_logout_time;
    const clockIn = new Date(openRecord.clock_in_time);
    const clockOut = new Date(clockOutTime);
    const breakDuration = openRecord.break_duration || 0;

    const totalMinutes =
      (clockOut.getTime() - clockIn.getTime()) / 60000 - breakDuration;
    const totalHours = Math.round((totalMinutes / 60) * 100) / 100;

    // Determine status
    let status = openRecord.status;
    const halfDayHours = 4;
    const fullDayHours = 9;
    if (totalHours < halfDayHours) {
      status = "half_day";
    } else if (totalHours >= fullDayHours) {
      status = openRecord.status === "late" ? "late" : "present";
    }

    const autoNote = "[Auto] Shift ended - lazy auto-logout on request";
    const updateNotes = openRecord.notes
      ? `${openRecord.notes}\n${autoNote}`
      : autoNote;

    await supabaseAdmin
      .from("attendance")
      .update({
        clock_out_time: clockOutTime,
        logout_time: now,
        session_status: "COMPLETED",
        logout_type: "AUTO",
        total_hours: totalHours,
        status,
        notes: updateNotes,
        auto_logged_out: true,
        updated_at: now,
      } as any)
      .eq("id", openRecord.id);

    console.log(`[Lazy Auto-Logout] User ${userId} auto-logged out`);
    return true;
  } catch (error) {
    // Don't fail the request if auto-logout check fails
    console.warn("[Lazy Auto-Logout] Error:", error);
    return false;
  }
}

/**
 * Optional authentication - doesn't fail if no token provided
 */
export async function optionalAuthenticate(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.headers.authorization) {
      return next();
    }

    await authenticate(req, _res, next);
  } catch {
    // Ignore auth errors for optional auth
    next();
  }
}

/**
 * Get user info from request (helper)
 */
export function getAuthUser(req: AuthenticatedRequest): AuthUser {
  if (!req.user) {
    throw new ApiError(ERROR_CODES.AUTH_TOKEN_MISSING);
  }
  return req.user;
}
