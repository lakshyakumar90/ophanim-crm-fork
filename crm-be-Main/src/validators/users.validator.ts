import { z } from "zod";
import { USER_ROLES, ALL_JOB_TITLES } from "../config/constants.js";

// Common UUID param
export const uuidParamSchema = z.object({
  id: z.string().uuid("Invalid ID format"),
});

// Create user
export const createUserSchema = z.object({
  email: z.string().email("Invalid email format"),
  fullName: z
    .string()
    .min(2, "Full name must be at least 2 characters")
    .max(100),
  role: z.enum(["admin", "manager", "employee"]).default("employee"),
  teamId: z.string().uuid().optional().nullable(),
  managerId: z.string().uuid().optional().nullable(),
  phone: z.string().max(20).optional().nullable(),
});

// Job title enum values - categorized by role
// Employee job titles (includes department-specific roles)
export const EMPLOYEE_JOB_TITLES = [
  "developer",
  "designer",
  "seo_specialist",
  "content_writer",
  "sales_employee",
  "finance_employee",
  "hr_employee",
] as const;

// Manager job titles
export const MANAGER_JOB_TITLES = [
  "sales_manager",
  "finance_manager",
  "project_manager",
  "hr_manager",
] as const;

// All job titles combined
export const JOB_TITLES = [
  ...EMPLOYEE_JOB_TITLES,
  ...MANAGER_JOB_TITLES,
] as const;

export type JobTitle = (typeof JOB_TITLES)[number];

// Update user
export const updateUserSchema = z.object({
  email: z.string().email("Invalid email format").optional(),
  fullName: z.string().min(2).max(100).optional(),
  role: z.enum(["admin", "manager", "employee"]).optional(),
  teamId: z.string().uuid().optional().nullable(),
  departmentId: z.string().uuid().optional().nullable(),
  managerId: z.string().uuid().optional().nullable(),
  phone: z.string().max(20).optional().nullable(),
  avatarUrl: z.string().url().optional().nullable(),
  isActive: z.boolean().optional(),
  themePreference: z.string().optional(),
  primaryColor: z.string().optional(),
  is2faEnabled: z.boolean().optional(),
  notificationPreferences: z.record(z.string(), z.boolean()).optional(),
  jobTitle: z.enum(JOB_TITLES).optional().nullable(),
});

// Update profile (for own profile) - Users can only update phone, avatar, and preferences
// Name, email, and role can only be changed by admin
export const updateProfileSchema = z.object({
  phone: z.string().max(20).optional().nullable(),
  avatarUrl: z.string().url().optional().nullable(),
  themePreference: z.string().optional(),
  primaryColor: z.string().optional(),
  is2faEnabled: z.boolean().optional(),
  notificationPreferences: z.record(z.string(), z.boolean()).optional(),
});

// User list query
export const userListQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  role: z.string().optional(),
  teamId: z.string().uuid().optional(),
  isActive: z.string().optional(),
  search: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
  departmentId: z.string().uuid().optional(),
  jobTitle: z.string().optional(),
});

// Types
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type UserListQuery = z.infer<typeof userListQuerySchema>;

export interface UpdatePreferencesInput {
  themePreference?: string;
  primaryColor?: string;
  is2faEnabled?: boolean;
  notificationPreferences?: Record<string, boolean>;
  userId?: string; // Implicit from token usually
}
