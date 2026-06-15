import jwt, { type SignOptions } from "jsonwebtoken";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { config } from "../../../config/env.js";
import { supabaseAdmin } from "../../../config/supabase.js";
import { ApiError } from "../../../utils/responses.js";
import { ERROR_CODES } from "../../../utils/error-codes.js";
import * as otpService from "./otp.service.js";
import * as emailService from "../../operations/email/email.service.js";
import { logActivity } from "../../shared/activity-events.service.js";
import {
  hashPassword,
  comparePassword,
  generateId,
  parseDuration,
  getCurrentTimestamp,
} from "../../../utils/helpers.js";
import { nowIST, getTimestampIST } from "../../../utils/date-utils.js";
import { deriveMostSeniorJobTitle } from "../../../utils/job-title.utils.js";
import {
  generateTOTPSecret,
  generateQRCode,
  verifyTOTP,
} from "../../../utils/2fa.utils.js";
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
} from "../../../types/api.types.js";
import type { UserRole } from "../../../config/constants.js";

import {
  hasEmployeeProfilesSalaryBandColumn,
  getAuthVerifyClient,
  generateAccessToken,
  generateRefreshToken,
  getAccessTokenExpiresIn,
} from "./auth.shared.js";

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
