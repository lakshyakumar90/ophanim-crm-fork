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

    next();
  } catch (error) {
    console.error("Auth Middleware Error:", error);
    next(error);
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
