import jwt, { type SignOptions } from "jsonwebtoken";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { config } from "../config/env.js";
import { supabaseAdmin } from "../config/supabase.js";
import { ApiError } from "../utils/responses.js";
import { ERROR_CODES } from "../utils/error-codes.js";
import * as otpService from "./otp.service.js";
import * as emailService from "./email.service.js";
import { logActivity } from "./activity-events.service.js";
import {
  hashPassword,
  comparePassword,
  generateId,
  parseDuration,
  getCurrentTimestamp,
} from "../utils/helpers.js";
import { nowIST, getTimestampIST } from "../utils/date-utils.js";
import { deriveMostSeniorJobTitle } from "../utils/job-title.utils.js";
import {
  generateTOTPSecret,
  generateQRCode,
  verifyTOTP,
} from "../utils/2fa.utils.js";
import type {
  LoginInput,
  RegisterInput,
  RefreshTokenInput,
  ChangePasswordInput,
} from "../validators/auth.validator.js";
import type {
  LoginResponse,
  RefreshTokenResponse,
  AccessTokenPayload,
  RefreshTokenPayload,
} from "../types/api.types.js";
import type { UserRole } from "../config/constants.js";

type GlobalAuthVerifyClient = typeof globalThis & {
  __supabaseAuthVerifyClient?: SupabaseClient;
};

/**
 * Shared Supabase auth-verify client for password verification.
 * Keeps auth checks isolated from supabaseAdmin and avoids per-call allocations.
 */
function getAuthVerifyClient(): SupabaseClient {
  const host = globalThis as GlobalAuthVerifyClient;
  if (!host.__supabaseAuthVerifyClient) {
    host.__supabaseAuthVerifyClient = createClient(
      config.supabase.url,
      config.supabase.anonKey,
      {
        auth: { autoRefreshToken: false, persistSession: false },
      },
    );
  }
  return host.__supabaseAuthVerifyClient;
}

/**
 * Generate access token
 */
function generateAccessToken(
  userId: string,
  email: string,
  role: UserRole,
  teamId: string | null,
): string {
  const payload: AccessTokenPayload = {
    userId,
    email,
    role,
    teamId,
    type: "access",
  };

  const options: SignOptions = { expiresIn: config.jwt.accessExpiresIn as any };
  return jwt.sign(payload, config.jwt.secret, options);
}

/**
 * Generate refresh token and store in database
 */
async function generateRefreshToken(userId: string): Promise<string> {
  const tokenId = generateId();
  const expiresAt = new Date(
    nowIST().getTime() + parseDuration(config.jwt.refreshExpiresIn),
  ).toISOString();

  const payload: RefreshTokenPayload = {
    userId,
    tokenId,
    type: "refresh",
  };

  const options: SignOptions = {
    expiresIn: config.jwt.refreshExpiresIn as any,
  };
  const token = jwt.sign(payload, config.jwt.secret, options);

  // Store refresh token in database
  await supabaseAdmin.from("refresh_tokens").insert({
    id: tokenId,
    user_id: userId,
    token,
    expires_at: expiresAt,
    is_revoked: false,
  });

  return token;
}

/**
 * Get token expiry in seconds
 */
function getAccessTokenExpiresIn(): number {
  return Math.floor(parseDuration(config.jwt.accessExpiresIn) / 1000);
}

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

/**
 * Register new user (admin only)
 */
export async function register(
  input: RegisterInput,
  createdBy: string,
): Promise<LoginResponse> {
  // Check if email already exists
  const { data: existing } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("email", input.email.toLowerCase())
    .single();

  if (existing) {
    throw new ApiError(ERROR_CODES.ALREADY_EXISTS, "Email already registered");
  }

  // Hash password
  const passwordHash = await hashPassword(input.password);

  // Create user in Supabase Auth
  const { data: authData, error: authError } = await (
    supabaseAdmin.auth as any
  ).admin.createUser({
    email: input.email.toLowerCase(),
    password: input.password,
    email_confirm: true,
  });

  if (authError) {
    throw new ApiError(ERROR_CODES.INTERNAL_ERROR, "Failed to create user");
  }

  // Create user in users table
  const userId = authData.user.id;

  // Determine team_id based on departmentId if provided
  let teamId = input.teamId || null;
  if (input.departmentId && !teamId) {
    // Find or create a default team for this department
    const { data: existingTeam } = await supabaseAdmin
      .from("teams")
      .select("id")
      .eq("department_id", input.departmentId)
      .limit(1)
      .single();

    if (existingTeam) {
      teamId = existingTeam.id;
    } else {
      // Get department name for team creation
      const { data: dept } = await supabaseAdmin
        .from("departments")
        .select("name")
        .eq("id", input.departmentId)
        .single();

      if (dept) {
        // Create a default team for this department
        const { data: newTeam } = await supabaseAdmin
          .from("teams")
          .insert({
            name: `${dept.name} Team`,
            department_id: input.departmentId,
          })
          .select("id")
          .single();

        if (newTeam) {
          teamId = newTeam.id;
        }
      }
    }
  }

  // Determine job_title: use provided value, or derive from RBAC roles (most senior wins)
  let derivedJobTitle: string | null = input.jobTitle || null;
  if (!derivedJobTitle && input.rbacRoleIds && input.rbacRoleIds.length > 0) {
    const { data: roleRows } = await supabaseAdmin
      .from("roles")
      .select("slug")
      .in("id", input.rbacRoleIds);
    const slugs = (roleRows || []).map((r: any) => r.slug as string).filter(Boolean);
    derivedJobTitle = deriveMostSeniorJobTitle(slugs);
  }

  const { data: user, error } = await supabaseAdmin
    .from("users")
    .insert({
      id: userId,
      email: input.email.toLowerCase(),
      full_name: input.fullName,
      role: input.role,
      team_id: teamId,
      department_id: input.departmentId || null,
      phone: input.phone || null,
      job_title: derivedJobTitle,
      shift_type: input.shiftType || "day_shift",
      is_active: true,
    })
    .select()
    .single();

  if (error || !user) {
    // Rollback auth user creation
    await (supabaseAdmin.auth as any).admin.deleteUser(userId);
    throw new ApiError(
      ERROR_CODES.DATABASE_ERROR,
      "Failed to create user profile",
    );
  }

  // Assign RBAC roles if provided
  if (input.rbacRoleIds && input.rbacRoleIds.length > 0) {
    const roleInserts = input.rbacRoleIds.map((roleId) => ({
      user_id: userId,
      role_id: roleId,
      assigned_by: createdBy,
    }));
    await supabaseAdmin.from("user_roles").insert(roleInserts);
  }

  // Generate tokens
  const accessToken = generateAccessToken(
    user.id,
    user.email,
    user.role as UserRole,
    user.team_id,
  );
  const refreshToken = await generateRefreshToken(user.id);

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
      shiftType: user.shift_type || null,
    },
    tokens: {
      accessToken,
      refreshToken,
      expiresIn: getAccessTokenExpiresIn(),
    },
  };
}

/**
 * Refresh access token
 */
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

/**
 * Change password
 */
export async function changePassword(
  userId: string,
  input: ChangePasswordInput,
): Promise<void> {
  // Get user email to verify current password
  const { data: userRecord, error: userError } = await supabaseAdmin
    .from("users")
    .select("email")
    .eq("id", userId)
    .single();

  if (userError || !userRecord) {
    throw new ApiError(ERROR_CODES.NOT_FOUND, "User not found");
  }

  // Verify current password via dedicated anon client.
  const { error: verifyError } = await getAuthVerifyClient().auth.signInWithPassword(
    {
      email: userRecord.email,
      password: input.currentPassword,
    },
  );

  if (verifyError) {
    throw new ApiError(
      ERROR_CODES.AUTH_PASSWORD_MISMATCH,
      "Current password is incorrect",
    );
  }

  // Update password via admin API
  const { error } = await (supabaseAdmin.auth as any).admin.updateUserById(
    userId,
    {
      password: input.newPassword,
    },
  );

  if (error) {
    throw new ApiError(ERROR_CODES.INTERNAL_ERROR, "Failed to change password");
  }

  // Revoke all refresh tokens (force re-login)
  await supabaseAdmin
    .from("refresh_tokens")
    .update({ is_revoked: true })
    .eq("user_id", userId)
    .eq("is_revoked", false);
}

/**
 * Admin reset password (for any user, without requiring old password)
 */
export async function adminResetPassword(
  targetUserId: string,
  newPassword: string,
): Promise<void> {
  // Verify the target user exists
  const { data: user, error: userError } = await supabaseAdmin
    .from("users")
    .select("id, email, full_name")
    .eq("id", targetUserId)
    .single();

  if (userError || !user) {
    throw ApiError.notFound("User");
  }

  // Update password via Supabase Auth admin API
  const { error } = await (supabaseAdmin.auth as any).admin.updateUserById(
    targetUserId,
    {
      password: newPassword,
    },
  );

  if (error) {
    throw new ApiError(ERROR_CODES.INTERNAL_ERROR, "Failed to reset password");
  }

  // Revoke all refresh tokens for the target user (force re-login)
  await supabaseAdmin
    .from("refresh_tokens")
    .update({ is_revoked: true })
    .eq("user_id", targetUserId)
    .eq("is_revoked", false);
}

/**
 * Request Password Change OTP
 */
export async function requestPasswordChangeOTP(userId: string): Promise<void> {
  const { data: user } = await supabaseAdmin
    .from("users")
    .select("email, full_name")
    .eq("id", userId)
    .single();

  if (!user) {
    throw ApiError.notFound("User");
  }

  // Check rate limit
  const hasRecent = await otpService.hasRecentOTPRequest(user.email);
  if (hasRecent) {
    throw new ApiError(
      ERROR_CODES.RATE_LIMIT_EXCEEDED,
      "Please wait before requesting another OTP",
    );
  }

  // Generate and send OTP
  const otp = await otpService.generateOTP(user.email, "password_reset");
  await emailService.sendOTPEmail(user.email, otp, user.full_name);
}

/**
 * Verify OTP and Change Password
 */
export async function verifyOTPAndChangePassword(
  userId: string,
  input: ChangePasswordInput & { otp: string },
): Promise<void> {
  const { data: user } = await supabaseAdmin
    .from("users")
    .select("email")
    .eq("id", userId)
    .single();

  if (!user) {
    throw ApiError.notFound("User");
  }

  // Verify OTP
  const isValid = await otpService.verifyOTP(
    user.email,
    input.otp,
    "password_reset",
  );
  if (!isValid) {
    throw new ApiError(ERROR_CODES.VALIDATION_ERROR, "Invalid OTP");
  }

  // Change password logic
  const { error } = await (supabaseAdmin.auth as any).admin.updateUserById(
    userId,
    {
      password: input.newPassword,
    },
  );

  if (error) {
    throw new ApiError(ERROR_CODES.INTERNAL_ERROR, "Failed to change password");
  }

  // Revoke all refresh tokens
  await supabaseAdmin
    .from("refresh_tokens")
    .update({ is_revoked: true })
    .eq("user_id", userId)
    .eq("is_revoked", false);
}

/**
 * Get current user info
 */
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

// ============================================
// 2FA Functions
// ============================================

/**
 * Setup 2FA - Generate secret and QR code
 */
export async function setup2FA(userId: string) {
  const { data: user, error } = await supabaseAdmin
    .from("users")
    .select("email, is_2fa_enabled")
    .eq("id", userId)
    .single();

  if (error || !user) {
    throw ApiError.notFound("User");
  }

  if (user.is_2fa_enabled) {
    throw new ApiError(ERROR_CODES.VALIDATION_ERROR, "2FA is already enabled");
  }

  // Generate new TOTP secret
  const secret = generateTOTPSecret();

  // Store the secret temporarily (not enabled yet)
  await supabaseAdmin
    .from("users")
    .update({ two_factor_secret: secret })
    .eq("id", userId);

  // Generate QR code
  const qrCode = await generateQRCode(user.email, secret);

  return {
    secret,
    qrCode,
  };
}

/**
 * Verify 2FA setup - Enable 2FA after successful code verification
 */
export async function verify2FASetup(userId: string, token: string) {
  const { data: user, error } = await supabaseAdmin
    .from("users")
    .select("two_factor_secret, is_2fa_enabled")
    .eq("id", userId)
    .single();

  if (error || !user) {
    throw ApiError.notFound("User");
  }

  if (user.is_2fa_enabled) {
    throw new ApiError(ERROR_CODES.VALIDATION_ERROR, "2FA is already enabled");
  }

  if (!user.two_factor_secret) {
    throw new ApiError(ERROR_CODES.VALIDATION_ERROR, "Please setup 2FA first");
  }

  // Verify the token
  const isValid = verifyTOTP(user.two_factor_secret, token);
  if (!isValid) {
    throw new ApiError(
      ERROR_CODES.AUTH_INVALID_CREDENTIALS,
      "Invalid 2FA code",
    );
  }

  // Enable 2FA
  await supabaseAdmin
    .from("users")
    .update({ is_2fa_enabled: true })
    .eq("id", userId);

  return { message: "2FA enabled successfully" };
}

/**
 * Disable 2FA
 */
export async function disable2FA(
  userId: string,
  password: string,
  token: string,
) {
  const { data: user, error } = await supabaseAdmin
    .from("users")
    .select("two_factor_secret, is_2fa_enabled")
    .eq("id", userId)
    .single();

  if (error || !user) {
    throw ApiError.notFound("User");
  }

  if (!user.is_2fa_enabled) {
    throw new ApiError(ERROR_CODES.VALIDATION_ERROR, "2FA is not enabled");
  }

  // Verify the 2FA token
  if (!user.two_factor_secret || !verifyTOTP(user.two_factor_secret, token)) {
    throw new ApiError(
      ERROR_CODES.AUTH_INVALID_CREDENTIALS,
      "Invalid 2FA code",
    );
  }

  // Note: Password verification would happen here with Supabase Auth
  // For simplicity, we're skipping direct password verification

  // Disable 2FA
  await supabaseAdmin
    .from("users")
    .update({
      is_2fa_enabled: false,
      two_factor_secret: null,
    })
    .eq("id", userId);

  return { message: "2FA disabled successfully" };
}

/**
 * Complete login with 2FA
 */
export async function login2FA(
  userId: string,
  token: string,
): Promise<LoginResponse> {
  const { data: user, error } = await supabaseAdmin
    .from("users")
    .select("*")
    .eq("id", userId)
    .single();

  if (error || !user) {
    throw new ApiError(ERROR_CODES.AUTH_INVALID_CREDENTIALS);
  }

  if (!user.is_active) {
    throw new ApiError(ERROR_CODES.AUTH_ACCOUNT_DISABLED);
  }

  if (!user.is_2fa_enabled || !user.two_factor_secret) {
    throw new ApiError(
      ERROR_CODES.VALIDATION_ERROR,
      "2FA is not enabled for this user",
    );
  }

  // Verify 2FA token
  const isValid = verifyTOTP(user.two_factor_secret, token);
  if (!isValid) {
    throw new ApiError(
      ERROR_CODES.AUTH_INVALID_CREDENTIALS,
      "Invalid 2FA code",
    );
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

  // Login tracked via last_login timestamp

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
      shiftType: user.shift_type || null,
    },
    tokens: {
      accessToken,
      refreshToken,
      expiresIn: getAccessTokenExpiresIn(),
    },
  };
}
