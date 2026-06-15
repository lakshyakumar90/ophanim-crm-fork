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

let employeeProfilesHasSalaryBandColumn: boolean | null = null;

export async function hasEmployeeProfilesSalaryBandColumn(): Promise<boolean> {
  if (employeeProfilesHasSalaryBandColumn !== null) {
    return employeeProfilesHasSalaryBandColumn;
  }

  const { error } = await supabaseAdmin
    .from("employee_profiles")
    .select("salary_band_id")
    .limit(1);

  if (!error) {
    employeeProfilesHasSalaryBandColumn = true;
    return true;
  }

  const msg = (error.message || "").toLowerCase();
  if (msg.includes("salary_band_id") || msg.includes("schema cache")) {
    employeeProfilesHasSalaryBandColumn = false;
    return false;
  }

  employeeProfilesHasSalaryBandColumn = true;
  return true;
}

export type GlobalAuthVerifyClient = typeof globalThis & {
  __supabaseAuthVerifyClient?: SupabaseClient;
};

/**
 * Shared Supabase auth-verify client for password verification.
 * Keeps auth checks isolated from supabaseAdmin and avoids per-call allocations.
 */
export function getAuthVerifyClient(): SupabaseClient {
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
export function generateAccessToken(
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
export async function generateRefreshToken(userId: string): Promise<string> {
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
export function getAccessTokenExpiresIn(): number {
  return Math.floor(parseDuration(config.jwt.accessExpiresIn) / 1000);
}
