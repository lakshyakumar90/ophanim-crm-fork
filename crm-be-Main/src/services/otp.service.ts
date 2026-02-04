import { supabaseAdmin } from "../config/supabase.js";
import { ApiError } from "../utils/responses.js";
import { ERROR_CODES } from "../utils/error-codes.js";
import { logger } from "../utils/logger.js";
import { nowIST, getTimestampIST } from "../utils/date-utils.js";

const OTP_EXPIRY_MINUTES = 10;
const OTP_LENGTH = 6;

type OTPType = "email_verification" | "password_reset";

/**
 * Generate a random 6-digit OTP
 */
function generateOTPCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Generate and store OTP for email verification
 */
export async function generateOTP(
  email: string,
  type: OTPType = "email_verification",
): Promise<string> {
  const normalizedEmail = email.toLowerCase().trim();
  const otpCode = generateOTPCode();
  const expiresAt = new Date(
    nowIST().getTime() + OTP_EXPIRY_MINUTES * 60 * 1000,
  ).toISOString();

  // Invalidate any existing unused OTPs for this email and type
  await supabaseAdmin
    .from("otp_tokens")
    .update({ is_used: true })
    .eq("email", normalizedEmail)
    .eq("type", type)
    .eq("is_used", false);

  // Create new OTP
  const { error } = await supabaseAdmin.from("otp_tokens").insert({
    email: normalizedEmail,
    otp_code: otpCode,
    type,
    expires_at: expiresAt,
    is_used: false,
  });

  if (error) {
    logger.error({ error, email: normalizedEmail }, "Failed to generate OTP");
    throw new ApiError(ERROR_CODES.INTERNAL_ERROR, "Failed to generate OTP");
  }

  logger.info({ email: normalizedEmail, type }, "OTP generated successfully");
  return otpCode;
}

/**
 * Verify OTP code
 */
export async function verifyOTP(
  email: string,
  otp: string,
  type: OTPType = "email_verification",
): Promise<boolean> {
  const normalizedEmail = email.toLowerCase().trim();

  // Find valid OTP
  const { data: otpRecord, error } = await supabaseAdmin
    .from("otp_tokens")
    .select("*")
    .eq("email", normalizedEmail)
    .eq("otp_code", otp)
    .eq("type", type)
    .eq("is_used", false)
    .gte("expires_at", getTimestampIST())
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error || !otpRecord) {
    logger.warn({ email: normalizedEmail, type }, "Invalid or expired OTP");
    return false;
  }

  // Mark OTP as used
  await supabaseAdmin
    .from("otp_tokens")
    .update({ is_used: true })
    .eq("id", otpRecord.id);

  logger.info({ email: normalizedEmail, type }, "OTP verified successfully");
  return true;
}

/**
 * Clean up expired OTP tokens
 */
export async function cleanupExpiredOTPs(): Promise<number> {
  const { data, error } = await supabaseAdmin
    .from("otp_tokens")
    .delete()
    .or(`expires_at.lt.${getTimestampIST()},is_used.eq.true`)
    .select("id");

  if (error) {
    logger.error({ error }, "Failed to cleanup expired OTPs");
    return 0;
  }

  const count = data?.length || 0;
  if (count > 0) {
    logger.info({ count }, "Cleaned up expired OTPs");
  }
  return count;
}

/**
 * Check if email has recently requested OTP (rate limiting)
 */
export async function hasRecentOTPRequest(
  email: string,
  type: OTPType = "email_verification",
  cooldownMinutes: number = 1,
): Promise<boolean> {
  const normalizedEmail = email.toLowerCase().trim();
  const cooldownTime = new Date(
    nowIST().getTime() - cooldownMinutes * 60 * 1000,
  ).toISOString();

  const { data } = await supabaseAdmin
    .from("otp_tokens")
    .select("id")
    .eq("email", normalizedEmail)
    .eq("type", type)
    .gte("created_at", cooldownTime)
    .limit(1);

  return (data?.length || 0) > 0;
}
