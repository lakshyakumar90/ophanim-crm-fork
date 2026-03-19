import type { Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config/env.js";
import { supabaseAdmin } from "../config/supabase.js";
import { ApiError } from "../utils/responses.js";
import { ERROR_CODES } from "../utils/error-codes.js";
import { logger } from "../utils/logger.js";
import type {
  AuthenticatedRequest,
  AccessTokenPayload,
  AuthUser,
} from "../types/api.types.js";
import type { UserRole } from "../config/constants.js";

type AuthCacheValue = {
  user: AuthUser;
  isActive: boolean;
  expiresAt: number;
};

type GlobalAuthCache = typeof globalThis & {
  __authUserCache?: Map<string, AuthCacheValue>;
};

function getAuthCache(): Map<string, AuthCacheValue> {
  const cacheHost = globalThis as GlobalAuthCache;
  if (!cacheHost.__authUserCache) {
    cacheHost.__authUserCache = new Map<string, AuthCacheValue>();
  }
  return cacheHost.__authUserCache;
}

function shouldBypassAuthCache(req: AuthenticatedRequest): boolean {
  if (req.headers["x-auth-fresh"] === "1") return true;

  // Sensitive path where fresh user status is safer than cached role/state.
  const adminUsersPath = "/api/v1/admin/users";
  return req.originalUrl.startsWith(adminUsersPath);
}

function mapDbUserToAuthUser(
  user: {
    id: string;
    email: string;
    role: string;
    team_id: string | null;
    department_id: string | null;
  },
  resolved?: {
    permissions: string[] | null;
    role_ids: string[] | null;
    role_names: string[] | null;
    is_global: boolean | null;
    department_ids: string[] | null;
  } | null,
): AuthUser {
  return {
    id: user.id,
    email: user.email,
    role: user.role as UserRole,
    teamId: user.team_id,
    departmentId: user.department_id,
    permissions: resolved?.permissions ?? [],
    roleIds: resolved?.role_ids ?? [],
    roleNames: resolved?.role_names ?? [],
    isGlobal: resolved?.is_global ?? false,
    departmentIds: resolved?.department_ids ?? [],
  };
}

/**
 * Fetch resolved permissions for a user from the RBAC view.
 * Returns null gracefully if the view does not exist yet (migration pending).
 */
async function fetchUserPermissions(userId: string): Promise<{
  permissions: string[] | null;
  role_ids: string[] | null;
  role_names: string[] | null;
  is_global: boolean | null;
  department_ids: string[] | null;
} | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from("user_resolved_permissions" as any)
      .select("permissions, role_ids, role_names, is_global, department_ids")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      // View may not exist yet — silently degrade to empty permissions
      logger.warn({ userId, error: error.message }, "RBAC: Could not fetch permissions (view may not exist yet)");
      return null;
    }
    return data as any;
  } catch (err) {
    logger.warn({ userId, err }, "RBAC: Exception fetching permissions");
    return null;
  }
}

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
 * Also loads resolved RBAC permissions from user_resolved_permissions view.
 */
export async function authenticate(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const token = extractToken(req.headers.authorization);
    const payload = verifyToken(token);
    const now = Date.now();
    const cache = getAuthCache();
    const useCache = !shouldBypassAuthCache(req);

    let cached = useCache ? cache.get(payload.userId) : undefined;

    if (!cached || cached.expiresAt <= now) {
      // Fetch user row and permissions in parallel
      const [userResult, resolved] = await Promise.all([
        supabaseAdmin
          .from("users")
          .select("id, email, role, team_id, department_id, is_active")
          .eq("id", payload.userId)
          .single(),
        fetchUserPermissions(payload.userId),
      ]);

      const { data: dbUser, error } = userResult;

      if (error || !dbUser) {
        throw new ApiError(ERROR_CODES.AUTH_TOKEN_INVALID, "User not found");
      }

      cached = {
        user: mapDbUserToAuthUser(dbUser, resolved),
        isActive: dbUser.is_active,
        expiresAt: now + config.auth.userCacheTtlMs,
      };

      cache.set(payload.userId, cached);
    }

    if (!cached.isActive) {
      throw new ApiError(ERROR_CODES.AUTH_ACCOUNT_DISABLED);
    }

    req.user = cached.user;

    if (config.auth.enableLazyAutoLogout) {
      // Optional fallback when pg_cron is unavailable.
      const autoLoggedOut = await checkAndAutoLogout(cached.user.id);
      if (autoLoggedOut) {
        cache.delete(payload.userId);
        throw new ApiError(
          ERROR_CODES.UNAUTHORIZED,
          "Session expired due to auto-logout",
        );
      }
    }

    next();
  } catch (error) {
    logger.error({ error }, "Auth middleware error");
    next(error);
  }
}

/**
 * Lazy auto-logout check - called on each authenticated request
 * If user has an open session where auto_logout_time has passed, complete it.
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
      .is("clock_out_time", null)
      .not("clock_in_time", "is", null)
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
        logout_type: "AUTO_SHIFT",
        total_hours: totalHours,
        status,
        notes: updateNotes,
        auto_logged_out: true,
        updated_at: now,
      } as any)
      .eq("id", openRecord.id);

    logger.info({ userId }, "[Lazy Auto-Logout] User auto-logged out");
    return true;
  } catch (error) {
    // Don't fail the request if auto-logout check fails
    logger.warn({ userId, error }, "[Lazy Auto-Logout] Error");
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
