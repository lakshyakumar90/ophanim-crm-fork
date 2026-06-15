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

  const hasSalaryBandColumn = await hasEmployeeProfilesSalaryBandColumn();

  await supabaseAdmin.from("employee_profiles").upsert(
    hasSalaryBandColumn
      ? {
          user_id: userId,
          current_ctc: input.currentCtc ?? null,
          salary_components: input.salaryComponents ?? null,
          salary_band_id: input.salaryBandId ?? null,
          hr_status: "active",
        }
      : {
          user_id: userId,
          current_ctc: input.currentCtc ?? null,
          salary_components: input.salaryComponents ?? null,
          hr_status: "active",
        },
    { onConflict: "user_id" },
  );

  if (input.currentCtc !== undefined) {
    await supabaseAdmin.from("employee_compensation_history").insert({
      employee_id: userId,
      effective_date: new Date().toISOString().split("T")[0],
      previous_ctc: null,
      new_ctc: input.currentCtc,
      change_percentage: null,
      reason: "Initial compensation setup",
      approved_by: createdBy,
    });
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
