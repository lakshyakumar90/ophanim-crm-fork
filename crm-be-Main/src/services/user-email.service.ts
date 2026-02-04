import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import crypto from "crypto";
import { supabaseAdmin } from "../config/supabase.js";
import { config } from "../config/env.js";
import { ApiError } from "../utils/responses.js";
import { ERROR_CODES } from "../utils/error-codes.js";
import { logger } from "../utils/logger.js";
import { getTimestampIST, getTodayIST } from "../utils/date-utils.js";

// Encryption key derived from JWT secret
const ENCRYPTION_KEY = crypto.scryptSync(config.jwt.secret, "salt", 32);
const IV_LENGTH = 16;

// Maximum emails per batch
export const MAX_EMAILS_PER_BATCH = 50;

interface UserEmailSettings {
  id: string;
  userId: string;
  emailType: "smtp" | "gmail";
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpSecure: boolean;
  isConfigured: boolean;
  dailySentCount: number;
  lastSentResetDate: string;
}

interface EmailSettingsRow {
  id: string;
  user_id: string;
  email_type: string;
  smtp_host: string;
  smtp_port: number;
  smtp_user: string;
  smtp_password_encrypted: string;
  smtp_secure: boolean;
  is_configured: boolean;
  daily_sent_count: number;
  last_sent_reset_date: string;
}

/**
 * Encrypt password for storage
 */
export function encryptPassword(password: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv("aes-256-cbc", ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(password, "utf8", "hex");
  encrypted += cipher.final("hex");
  return iv.toString("hex") + ":" + encrypted;
}

/**
 * Decrypt password from storage
 */
export function decryptPassword(encryptedPassword: string): string {
  const [ivHex, encrypted] = encryptedPassword.split(":");
  const iv = Buffer.from(ivHex!, "hex");
  const decipher = crypto.createDecipheriv("aes-256-cbc", ENCRYPTION_KEY, iv);
  let decrypted = decipher.update(encrypted!, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

/**
 * Get user's email settings
 */
export async function getUserEmailSettings(
  userId: string,
): Promise<UserEmailSettings | null> {
  const { data, error } = await supabaseAdmin
    .from("user_email_settings")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error || !data) {
    return null;
  }

  const row = data as EmailSettingsRow;
  return {
    id: row.id,
    userId: row.user_id,
    emailType: row.email_type as "smtp" | "gmail",
    smtpHost: row.smtp_host,
    smtpPort: row.smtp_port,
    smtpUser: row.smtp_user,
    smtpSecure: row.smtp_secure,
    isConfigured: row.is_configured,
    dailySentCount: row.daily_sent_count,
    lastSentResetDate: row.last_sent_reset_date,
  };
}

/**
 * Save user email settings
 */
export async function saveUserEmailSettings(
  userId: string,
  settings: {
    emailType: "smtp" | "gmail";
    smtpHost: string;
    smtpPort: number;
    smtpUser: string;
    smtpPassword: string;
    smtpSecure: boolean;
  },
): Promise<UserEmailSettings> {
  const encryptedPassword = encryptPassword(settings.smtpPassword);

  const { data, error } = await supabaseAdmin
    .from("user_email_settings")
    .upsert(
      {
        user_id: userId,
        email_type: settings.emailType,
        smtp_host: settings.smtpHost,
        smtp_port: settings.smtpPort,
        smtp_user: settings.smtpUser,
        smtp_password_encrypted: encryptedPassword,
        smtp_secure: settings.smtpSecure,
        is_configured: true,
        updated_at: getTimestampIST(),
      },
      { onConflict: "user_id" },
    )
    .select()
    .single();

  if (error) {
    throw new ApiError(
      ERROR_CODES.DATABASE_ERROR,
      "Failed to save email settings",
    );
  }

  const row = data as EmailSettingsRow;
  return {
    id: row.id,
    userId: row.user_id,
    emailType: row.email_type as "smtp" | "gmail",
    smtpHost: row.smtp_host,
    smtpPort: row.smtp_port,
    smtpUser: row.smtp_user,
    smtpSecure: row.smtp_secure,
    isConfigured: row.is_configured,
    dailySentCount: row.daily_sent_count,
    lastSentResetDate: row.last_sent_reset_date,
  };
}

/**
 * Delete user email settings
 */
export async function deleteUserEmailSettings(userId: string): Promise<void> {
  await supabaseAdmin
    .from("user_email_settings")
    .delete()
    .eq("user_id", userId);
}

/**
 * Create SMTP transporter for user
 */
export async function createUserTransporter(
  userId: string,
): Promise<Transporter> {
  const { data, error } = await supabaseAdmin
    .from("user_email_settings")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error || !data) {
    throw new ApiError(
      ERROR_CODES.VALIDATION_ERROR,
      "Email settings not configured. Please configure your email in Settings.",
    );
  }

  const row = data as EmailSettingsRow;
  const password = decryptPassword(row.smtp_password_encrypted);

  return nodemailer.createTransport({
    host: row.smtp_host,
    port: row.smtp_port,
    secure: row.smtp_secure,
    auth: {
      user: row.smtp_user,
      pass: password,
    },
  });
}

/**
 * Test email configuration
 */
export async function testEmailConfiguration(
  userId: string,
): Promise<{ success: boolean; message: string }> {
  try {
    const transporter = await createUserTransporter(userId);
    await transporter.verify();

    // Update last test result
    await supabaseAdmin
      .from("user_email_settings")
      .update({
        last_test_at: getTimestampIST(),
        last_test_success: true,
      })
      .eq("user_id", userId);

    return { success: true, message: "Email configuration is valid" };
  } catch (error: any) {
    // Update last test result
    await supabaseAdmin
      .from("user_email_settings")
      .update({
        last_test_at: getTimestampIST(),
        last_test_success: false,
      })
      .eq("user_id", userId);

    return {
      success: false,
      message: error.message || "Failed to connect to email server",
    };
  }
}

/**
 * Send email using user's configuration
 */
export async function sendUserEmail(
  userId: string,
  options: {
    to: string;
    toName?: string;
    subject: string;
    html: string;
    text?: string;
    leadId?: string;
  },
): Promise<{ success: boolean; error?: string }> {
  try {
    const settings = await getUserEmailSettings(userId);
    if (!settings?.isConfigured) {
      throw new Error("Email settings not configured");
    }

    const transporter = await createUserTransporter(userId);

    await transporter.sendMail({
      from: settings.smtpUser,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });

    // Log the sent email
    await supabaseAdmin.from("email_send_log").insert({
      user_id: userId,
      recipient_email: options.to,
      recipient_name: options.toName,
      subject: options.subject,
      lead_id: options.leadId,
      status: "sent",
    });

    // Increment daily count
    await incrementDailySentCount(userId);

    logger.info(
      { to: options.to, subject: options.subject },
      "User email sent",
    );
    return { success: true };
  } catch (error: any) {
    // Log failed attempt
    await supabaseAdmin.from("email_send_log").insert({
      user_id: userId,
      recipient_email: options.to,
      recipient_name: options.toName,
      subject: options.subject,
      lead_id: options.leadId,
      status: "failed",
      error_message: error.message,
    });

    logger.error({ error, to: options.to }, "Failed to send user email");
    return { success: false, error: error.message };
  }
}

/**
 * Send bulk emails (max 50)
 */
export async function sendBulkUserEmails(
  userId: string,
  emails: Array<{
    to: string;
    toName?: string;
    subject: string;
    html: string;
    leadId?: string;
  }>,
): Promise<{
  totalSent: number;
  totalFailed: number;
  results: Array<{ email: string; success: boolean; error?: string }>;
}> {
  if (emails.length > MAX_EMAILS_PER_BATCH) {
    throw new ApiError(
      ERROR_CODES.VALIDATION_ERROR,
      `Maximum ${MAX_EMAILS_PER_BATCH} emails per batch`,
    );
  }

  const settings = await getUserEmailSettings(userId);
  if (!settings?.isConfigured) {
    throw new ApiError(
      ERROR_CODES.VALIDATION_ERROR,
      "Email settings not configured",
    );
  }

  const results: Array<{ email: string; success: boolean; error?: string }> =
    [];
  let totalSent = 0;
  let totalFailed = 0;

  // Send emails sequentially to avoid rate limiting
  for (const email of emails) {
    const result = await sendUserEmail(userId, email);
    results.push({
      email: email.to,
      success: result.success,
      error: result.error,
    });

    if (result.success) {
      totalSent++;
    } else {
      totalFailed++;
    }

    // Small delay between emails to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  return { totalSent, totalFailed, results };
}

/**
 * Increment daily sent count
 */
async function incrementDailySentCount(userId: string): Promise<void> {
  const today = getTodayIST();

  const { data } = await supabaseAdmin
    .from("user_email_settings")
    .select("last_sent_reset_date, daily_sent_count")
    .eq("user_id", userId)
    .single();

  if (data) {
    const resetDate = data.last_sent_reset_date;
    if (resetDate !== today) {
      // Reset counter for new day
      await supabaseAdmin
        .from("user_email_settings")
        .update({
          daily_sent_count: 1,
          last_sent_reset_date: today,
        })
        .eq("user_id", userId);
    } else {
      // Increment counter
      await supabaseAdmin
        .from("user_email_settings")
        .update({
          daily_sent_count: (data.daily_sent_count || 0) + 1,
        })
        .eq("user_id", userId);
    }
  }
}

/**
 * Get email send history
 */
export async function getEmailSendHistory(
  userId: string,
  options?: { limit?: number; offset?: number; leadId?: string },
): Promise<any[]> {
  let query = supabaseAdmin
    .from("email_send_log")
    .select("*")
    .eq("user_id", userId)
    .order("sent_at", { ascending: false });

  if (options?.leadId) {
    query = query.eq("lead_id", options.leadId);
  }

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  if (options?.offset) {
    query = query.range(
      options.offset,
      options.offset + (options.limit || 20) - 1,
    );
  }

  const { data, error } = await query;

  if (error) {
    return [];
  }

  return data || [];
}
