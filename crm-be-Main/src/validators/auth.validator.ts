import { z } from "zod";
import { ALL_JOB_TITLES } from "../config/constants.js";

// Password requirements
const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number")
  .regex(
    /[^A-Za-z0-9]/,
    "Password must contain at least one special character",
  );

// Login
export const loginSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(1, "Password is required"),
});

// Job title enum values - imported from constants for consistency
// Re-export for backward compatibility
export const EMPLOYEE_JOB_TITLES = [
  "developer",
  "designer",
  "seo_specialist",
  "content_writer",
  "sales_employee",
  "finance_employee",
  "hr_employee",
] as const;

export const MANAGER_JOB_TITLES = [
  "sales_manager",
  "finance_manager",
  "project_manager",
  "hr_manager",
] as const;

export const JOB_TITLES = [
  ...EMPLOYEE_JOB_TITLES,
  ...MANAGER_JOB_TITLES,
] as const;

export type JobTitle = (typeof JOB_TITLES)[number];

// Register (admin creating user) - Admin role NOT allowed via normal creation
// Only manager and employee roles can be created through the register flow
export const registerSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: passwordSchema,
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  role: z.enum(["manager", "employee"]).default("employee"),
  teamId: z.string().uuid().optional().nullable(),
  departmentId: z.string().uuid("Department is required for non-admin users"),
  phone: z.string().optional().nullable(),
  jobTitle: z.enum(ALL_JOB_TITLES).optional().nullable(),
  shiftType: z.enum(["day_shift", "night_shift"]).default("day_shift").optional(),
});

// Refresh token
export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token is required"),
});

// Change password
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: passwordSchema,
});

// Change password via OTP
export const otpChangePasswordSchema = z.object({
  otp: z.string().length(6, "OTP must be 6 digits"),
  newPassword: passwordSchema,
});

// Forgot password
export const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email format"),
});

// Reset password
export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Reset token is required"),
  newPassword: passwordSchema,
});

// 2FA Setup verification
export const verify2FASchema = z.object({
  token: z.string().length(6, "2FA code must be 6 digits"),
});

// 2FA Login
export const login2FASchema = z.object({
  userId: z.string().uuid("Invalid user ID"),
  token: z.string().length(6, "2FA code must be 6 digits"),
});

// Disable 2FA
export const disable2FASchema = z.object({
  password: z.string().min(1, "Password is required"),
  token: z.string().length(6, "2FA code must be 6 digits"),
});

// Admin reset password (for any user)
export const adminResetPasswordSchema = z.object({
  newPassword: passwordSchema,
});

// Types
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type OtpChangePasswordInput = z.infer<typeof otpChangePasswordSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type Verify2FAInput = z.infer<typeof verify2FASchema>;
export type Login2FAInput = z.infer<typeof login2FASchema>;
export type Disable2FAInput = z.infer<typeof disable2FASchema>;
export type AdminResetPasswordInput = z.infer<typeof adminResetPasswordSchema>;
