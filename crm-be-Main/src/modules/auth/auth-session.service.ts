import jwt, { type SignOptions } from "jsonwebtoken";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { config } from "../../config/env.js";
import { supabaseAdmin } from "../../config/supabase.js";
import { ApiError } from "../../utils/responses.js";
import { ERROR_CODES } from "../../utils/error-codes.js";
import * as otpService from "./otp.service.js";
import * as emailService from "../operations/email/email.service.js";
import { logActivity } from "../shared/activity-events.service.js";
import {
  hashPassword,
  comparePassword,
  generateId,
  parseDuration,
  getCurrentTimestamp,
} from "../../utils/helpers.js";
import { nowIST, getTimestampIST } from "../../utils/date-utils.js";
import { deriveMostSeniorJobTitle } from "../../utils/job-title.utils.js";
import {
  generateTOTPSecret,
  generateQRCode,
  verifyTOTP,
} from "../../utils/2fa.utils.js";
import type {
  LoginInput,
  RegisterInput,
  RefreshTokenInput,
  ChangePasswordInput,
} from "./auth.validator.js";
import type {
  LoginResponse,
  RefreshTokenResponse,
  AccessTokenPayload,
  RefreshTokenPayload,
} from "../../types/api.types.js";
import type { UserRole } from "../../config/constants.js";

import {
  hasEmployeeProfilesSalaryBandColumn,
  getAuthVerifyClient,
  generateAccessToken,
  generateRefreshToken,
  getAccessTokenExpiresIn,
} from "./auth.shared.js";

/**
 * Login user
 */
export async function login(input: LoginInput): Promise<LoginResponse> {
  // Verify credentials via dedicated anon client (does not mutate supabaseAdmin auth state).
  const { error: authError } = await getAuthVerifyClient().auth.signInWithPassword(
    {
      email: input.email.toLowerCase(),
      password: input.password,
    },
  );

  if (authError) {
    throw new ApiError(ERROR_CODES.AUTH_INVALID_CREDENTIALS);
  }

  // Get user profile from users table
  const { data: user, error } = await supabaseAdmin
    .from("users")
    .select("*, departments(slug, name)")
    .eq("email", input.email.toLowerCase())
    .single();

  if (error || !user) {
    throw new ApiError(ERROR_CODES.AUTH_INVALID_CREDENTIALS);
  }

  // Check if account is active
  if (!user.is_active) {
    throw new ApiError(ERROR_CODES.AUTH_ACCOUNT_DISABLED);
  }

  // Check if 2FA is enabled
  if (user.is_2fa_enabled && user.two_factor_secret) {
    // Return partial response - frontend needs to call /auth/login/2fa
    return {
      requires2FA: true,
      userId: user.id,
      user: null,
      tokens: null,
    } as any;
  }

  // Generate tokens
  const accessToken = generateAccessToken(
    user.id,
    user.email,
    user.role as UserRole,
    user.team_id,
  );
  const refreshToken = await generateRefreshToken(user.id);

  // Update last login
  await supabaseAdmin
    .from("users")
    .update({ last_login: getCurrentTimestamp() })
    .eq("id", user.id);

  // Log login activity
  await supabaseAdmin.from("user_activities").insert({
    user_id: user.id,
    activity_type: "login",
    title: "User logged in",
    description: `${user.full_name} logged in`,
    metadata: { email: user.email },
    created_at: getTimestampIST(),
  });

  await logActivity({
    actorId: user.id,
    entityType: "user",
    entityId: user.id,
    entityName: user.full_name,
    eventType: "login",
    source: "auth",
    metadata: { email: user.email },
  });

  return {
    requires2FA: false,
    user: {
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      role: user.role as UserRole,
      teamId: user.team_id,
      avatarUrl: user.avatar_url,
      themePreference: user.theme_preference,
      primaryColor: user.primary_color,
      departmentId: user.department_id,
      departmentSlug: Array.isArray(user.departments)
        ? user.departments[0]?.slug
        : (user.departments as any)?.slug,
      departmentName: Array.isArray(user.departments)
        ? user.departments[0]?.name
        : (user.departments as any)?.name,
      shiftType: user.shift_type || null,
    },
    tokens: {
      accessToken,
      refreshToken,
      expiresIn: getAccessTokenExpiresIn(),
    },
  };
}

export async function refreshAccessToken(
  input: RefreshTokenInput,
): Promise<RefreshTokenResponse> {
  try {
    // Verify refresh token
    const decoded = jwt.verify(
      input.refreshToken,
      config.jwt.secret,
    ) as RefreshTokenPayload;

    if (decoded.type !== "refresh") {
      throw new ApiError(ERROR_CODES.AUTH_REFRESH_TOKEN_INVALID);
    }

    // Check if token exists and is not revoked
    const { data: storedToken, error: tokenError } = await supabaseAdmin
      .from("refresh_tokens")
      .select("*")
      .eq("id", decoded.tokenId)
      .eq("is_revoked", false)
      .single();

    if (tokenError || !storedToken) {
      throw new ApiError(ERROR_CODES.AUTH_REFRESH_TOKEN_INVALID);
    }

    // Check expiry
    if (new Date(storedToken.expires_at) < nowIST()) {
      throw new ApiError(ERROR_CODES.AUTH_REFRESH_TOKEN_EXPIRED);
    }

    // Get user
    const { data: user, error: userError } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("id", decoded.userId)
      .single();

    if (userError || !user) {
      throw new ApiError(ERROR_CODES.AUTH_REFRESH_TOKEN_INVALID);
    }

    if (!user.is_active) {
      throw new ApiError(ERROR_CODES.AUTH_ACCOUNT_DISABLED);
    }

    // Check if token needs rotation (expires in less than 1 day)
    const expiresAt = new Date(storedToken.expires_at).getTime();
    const now = nowIST().getTime();
    const oneDayMs = 24 * 60 * 60 * 1000;
    const shouldRotate = expiresAt - now < oneDayMs;

    let newRefreshToken = input.refreshToken;

    if (shouldRotate) {
      // Revoke old refresh token
      await supabaseAdmin
        .from("refresh_tokens")
        .update({ is_revoked: true })
        .eq("id", decoded.tokenId);

      // Generate new token
      newRefreshToken = await generateRefreshToken(user.id);
    }

    // Generate new access token
    const accessToken = generateAccessToken(
      user.id,
      user.email,
      user.role as UserRole,
      user.team_id,
    );

    return {
      accessToken,
      refreshToken: newRefreshToken,
      expiresIn: getAccessTokenExpiresIn(),
    };
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new ApiError(ERROR_CODES.AUTH_REFRESH_TOKEN_EXPIRED);
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new ApiError(ERROR_CODES.AUTH_REFRESH_TOKEN_INVALID);
    }
    throw error;
  }
}

/**
 * Logout user (revoke refresh tokens)
 */
export async function logout(
  userId: string,
  refreshToken?: string,
): Promise<void> {
  if (refreshToken) {
    // Revoke specific token
    try {
      const decoded = jwt.verify(
        refreshToken,
        config.jwt.secret,
      ) as RefreshTokenPayload;
      await supabaseAdmin
        .from("refresh_tokens")
        .update({ is_revoked: true })
        .eq("id", decoded.tokenId);
    } catch {
      // Ignore invalid token on logout
    }
  } else {
    // Revoke all tokens for user
    await supabaseAdmin
      .from("refresh_tokens")
      .update({ is_revoked: true })
      .eq("user_id", userId)
      .eq("is_revoked", false);
  }

  // Log logout activity
  await supabaseAdmin.from("user_activities").insert({
    user_id: userId,
    activity_type: "logout",
    title: "User logged out",
    created_at: getTimestampIST(),
  });

  await logActivity({
    actorId: userId,
    entityType: "user",
    entityId: userId,
    eventType: "logout",
    source: "auth",
  });
}

export async function getCurrentUser(userId: string) {
  // First try with shift_type (requires migration 032)
  let userData: any = null;

  const { data: user, error } = await supabaseAdmin
    .from("users")
    .select(
      `
      id,
      email,
      full_name,
      role,
      team_id,
      department_id,
      departments(slug, name),
      phone,
      avatar_url,
      is_active,
      last_login,
      created_at,
      theme_preference,
      primary_color,
      is_2fa_enabled,
      shift_type
    `,
    )
    .eq("id", userId)
    .single();

  if (!error && user) {
    userData = user;
  } else {
    // Fallback: query without shift_type (column may not exist yet)
    const { data: fallbackUser, error: fallbackError } = await supabaseAdmin
      .from("users")
      .select(
        `
        id,
        email,
        full_name,
        role,
        team_id,
        department_id,
        departments(slug, name),
        phone,
        avatar_url,
        is_active,
        last_login,
        created_at,
        theme_preference,
        primary_color,
        is_2fa_enabled
      `,
      )
      .eq("id", userId)
      .single();

    if (fallbackError || !fallbackUser) {
      throw new ApiError(ERROR_CODES.NOT_FOUND, "User not found");
    }
    userData = fallbackUser;
  }

  // Fetch RBAC permissions (graceful: empty if migration not run yet)
  let permissionsData: {
    permissions: string[] | null;
    role_ids: string[] | null;
    role_names: string[] | null;
    is_global: boolean | null;
    department_ids: string[] | null;
  } | null = null;

  try {
    const { data: resolved } = await supabaseAdmin
      .from("user_resolved_permissions" as any)
      .select("permissions, role_ids, role_names, is_global, department_ids")
      .eq("user_id", userData.id)
      .maybeSingle();
    permissionsData = resolved as any;
  } catch {
    // RBAC view may not exist yet — silently degrade
  }

  return {
    id: userData.id,
    email: userData.email,
    fullName: userData.full_name,
    role: userData.role,
    teamId: userData.team_id,
    phone: userData.phone,
    avatarUrl: userData.avatar_url,
    isActive: userData.is_active,
    lastLogin: userData.last_login,
    createdAt: userData.created_at,
    themePreference: userData.theme_preference,
    primaryColor: userData.primary_color,
    is2faEnabled: userData.is_2fa_enabled || false,
    departmentId: userData.department_id,
    jobTitle: userData.job_title || null,
    departmentSlug: Array.isArray(userData.departments)
      ? userData.departments[0]?.slug
      : (userData.departments as any)?.slug,
    departmentName: Array.isArray(userData.departments)
      ? userData.departments[0]?.name
      : (userData.departments as any)?.name,
    shiftType: userData.shift_type || null,
    // RBAC
    permissions: permissionsData?.permissions ?? [],
    roleIds: permissionsData?.role_ids ?? [],
    roleNames: permissionsData?.role_names ?? [],
    isGlobal: permissionsData?.is_global ?? false,
    departmentIds: permissionsData?.department_ids ?? [],
  };
}

/**
 * Clean up expired refresh tokens
 */
export async function cleanupExpiredTokens(): Promise<number> {
  const { data, error } = await supabaseAdmin
    .from("refresh_tokens")
    .delete()
    .lt("expires_at", getTimestampIST())
    .select("id");

  return data?.length || 0;
}
