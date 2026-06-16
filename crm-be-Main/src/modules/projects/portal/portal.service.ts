import { randomBytes } from "node:crypto";
import { supabaseAdmin } from "../../../config/supabase.js";
import { ApiError } from "../../../utils/responses.js";
import { ERROR_CODES } from "../../../utils/error-codes.js";
import { getISTTimestamp } from "../../../utils/date-utils.js";
import { logger } from "../../../utils/logger.js";
import type { AuthUser } from "../../../types/api.types.js";
import { checkProjectAccess } from "../notes/notes.service.js";

const DEFAULT_TOKEN_TTL_DAYS = 30;

function generatePortalToken(): string {
  return randomBytes(32).toString("base64url");
}

async function assertPortalManageAccess(
  projectId: string,
  authUser: AuthUser,
): Promise<void> {
  const hasAccess = await checkProjectAccess(projectId, authUser);
  if (!hasAccess) {
    throw new ApiError(ERROR_CODES.FORBIDDEN);
  }

  const canManage =
    authUser.role === "admin" ||
    authUser.permissions.includes("projects:edit");

  if (!canManage) {
    const { data: project } = await supabaseAdmin
      .from("projects")
      .select("manager_id")
      .eq("id", projectId)
      .single();

    if (project?.manager_id !== authUser.id) {
      throw new ApiError(ERROR_CODES.FORBIDDEN, "Missing projects:edit");
    }
  }
}

export async function createProjectPortalToken(
  projectId: string,
  authUser: AuthUser,
  expiresInDays: number = DEFAULT_TOKEN_TTL_DAYS,
) {
  await assertPortalManageAccess(projectId, authUser);

  const { data: project, error: projectError } = await supabaseAdmin
    .from("projects")
    .select("id, status")
    .eq("id", projectId)
    .single();

  if (projectError || !project) {
    throw new ApiError(ERROR_CODES.NOT_FOUND, "Project not found");
  }

  if (project.status === "cancelled") {
    throw new ApiError(
      ERROR_CODES.VALIDATION_ERROR,
      "Cannot create portal link for cancelled projects",
    );
  }

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiresInDays);

  const { data, error } = await supabaseAdmin
    .from("project_portal_tokens")
    .insert({
      project_id: projectId,
      token: generatePortalToken(),
      expires_at: expiresAt.toISOString(),
      created_by: authUser.id,
    })
    .select(
      `
      *,
      creator:users!project_portal_tokens_created_by_fkey(id, full_name, email)
    `,
    )
    .single();

  if (error) {
    logger.error({ error }, "Error creating project portal token");
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
  }

  return data;
}

export async function listProjectPortalTokens(
  projectId: string,
  authUser: AuthUser,
) {
  await assertPortalManageAccess(projectId, authUser);

  const { data, error } = await supabaseAdmin
    .from("project_portal_tokens")
    .select(
      `
      *,
      creator:users!project_portal_tokens_created_by_fkey(id, full_name, email)
    `,
    )
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
  }

  return data || [];
}

export async function revokeProjectPortalToken(
  tokenId: string,
  authUser: AuthUser,
) {
  const { data: tokenRow, error: fetchError } = await supabaseAdmin
    .from("project_portal_tokens")
    .select("id, project_id")
    .eq("id", tokenId)
    .single();

  if (fetchError || !tokenRow) {
    throw new ApiError(ERROR_CODES.NOT_FOUND, "Token not found");
  }

  await assertPortalManageAccess(tokenRow.project_id, authUser);

  const { data, error } = await supabaseAdmin
    .from("project_portal_tokens")
    .update({ revoked_at: getISTTimestamp() })
    .eq("id", tokenId)
    .is("revoked_at", null)
    .select()
    .single();

  if (error || !data) {
    throw new ApiError(ERROR_CODES.NOT_FOUND, "Token not found or already revoked");
  }

  return data;
}

async function validateTokenRecord(token: string) {
  const { data, error } = await supabaseAdmin
    .from("project_portal_tokens")
    .select("*")
    .eq("token", token)
    .single();

  if (error || !data) {
    throw new ApiError(ERROR_CODES.NOT_FOUND, "Invalid or expired portal link");
  }

  if (data.revoked_at) {
    throw new ApiError(ERROR_CODES.FORBIDDEN, "This portal link has been revoked");
  }

  if (new Date(data.expires_at) < new Date()) {
    throw new ApiError(ERROR_CODES.FORBIDDEN, "This portal link has expired");
  }

  return data;
}

export async function getProjectStatusByPortalToken(token: string) {
  const tokenRecord = await validateTokenRecord(token);

  await supabaseAdmin
    .from("project_portal_tokens")
    .update({
      view_count: (tokenRecord.view_count || 0) + 1,
      last_viewed_at: getISTTimestamp(),
    })
    .eq("id", tokenRecord.id);

  const { data: project, error: projectError } = await supabaseAdmin
    .from("projects")
    .select(
      `
      id,
      name,
      description,
      client_name,
      status,
      priority,
      start_date,
      end_date,
      updated_at
    `,
    )
    .eq("id", tokenRecord.project_id)
    .single();

  if (projectError || !project) {
    throw new ApiError(ERROR_CODES.NOT_FOUND, "Project not found");
  }

  const [milestonesRes, sprintsRes, tasksRes] = await Promise.all([
    supabaseAdmin
      .from("project_milestones")
      .select("id, name, status, due_date, completed_at")
      .eq("project_id", project.id)
      .order("sort_order", { ascending: true }),
    supabaseAdmin
      .from("sprints")
      .select("id, name, status, start_date, end_date")
      .eq("project_id", project.id)
      .order("start_date", { ascending: false })
      .limit(5),
    supabaseAdmin
      .from("tasks")
      .select("id, status")
      .eq("project_id", project.id)
      .eq("is_deleted", false),
  ]);

  const milestones = milestonesRes.data || [];
  const tasks = tasksRes.data || [];

  return {
    project: {
      id: project.id,
      name: project.name,
      description: project.description,
      clientName: project.client_name,
      status: project.status,
      priority: project.priority,
      startDate: project.start_date,
      endDate: project.end_date,
      updatedAt: project.updated_at,
    },
    milestones: milestones.map((m) => ({
      id: m.id,
      name: m.name,
      status: m.status,
      dueDate: m.due_date,
      completedAt: m.completed_at,
    })),
    sprints: (sprintsRes.data || []).map((s) => ({
      id: s.id,
      name: s.name,
      status: s.status,
      startDate: s.start_date,
      endDate: s.end_date,
    })),
    progress: {
      milestonesTotal: milestones.length,
      milestonesCompleted: milestones.filter((m) => m.status === "completed").length,
      tasksTotal: tasks.length,
      tasksCompleted: tasks.filter((t) => t.status === "completed").length,
    },
    tokenExpiresAt: tokenRecord.expires_at,
  };
}
