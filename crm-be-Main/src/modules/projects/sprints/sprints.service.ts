import { supabaseAdmin } from "../../../config/supabase.js";
import { ApiError } from "../../../utils/responses.js";
import { ERROR_CODES } from "../../../utils/error-codes.js";
import { getCurrentTimestamp } from "../../../utils/helpers.js";
import type { AuthUser } from "../../../types/api.types.js";
import { checkProjectAccess } from "../notes/notes.service.js";
import type { CreateSprintInput, UpdateSprintInput } from "./sprints.validator.js";

export interface SprintRecord {
  id: string;
  projectId: string;
  name: string;
  goal: string | null;
  startDate: string | null;
  endDate: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  taskCount?: number;
}

function mapSprintRow(row: any, taskCount?: number): SprintRecord {
  return {
    id: row.id,
    projectId: row.project_id,
    name: row.name,
    goal: row.goal,
    startDate: row.start_date,
    endDate: row.end_date,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    taskCount,
  };
}

async function assertProjectAccess(
  projectId: string,
  authUser: AuthUser,
  requireEdit = false,
): Promise<void> {
  const hasAccess = await checkProjectAccess(projectId, authUser);
  if (!hasAccess) {
    throw new ApiError(ERROR_CODES.FORBIDDEN);
  }

  if (requireEdit) {
    const isManagerOrAdmin =
      authUser.role === "admin" ||
      authUser.permissions.includes("projects:edit");

    if (!isManagerOrAdmin) {
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
}

export async function listSprints(
  projectId: string,
  authUser: AuthUser,
): Promise<SprintRecord[]> {
  await assertProjectAccess(projectId, authUser);

  const { data, error } = await supabaseAdmin
    .from("sprints")
    .select("*")
    .eq("project_id", projectId)
    .order("start_date", { ascending: false });

  if (error) {
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
  }

  const sprints = data || [];
  if (sprints.length === 0) {
    return [];
  }

  const sprintIds = sprints.map((s: any) => s.id);
  const { data: taskCounts } = await supabaseAdmin
    .from("tasks")
    .select("sprint_id")
    .in("sprint_id", sprintIds)
    .eq("is_deleted", false);

  const countMap = new Map<string, number>();
  for (const row of taskCounts || []) {
    if (row.sprint_id) {
      countMap.set(row.sprint_id, (countMap.get(row.sprint_id) || 0) + 1);
    }
  }

  return sprints.map((row: any) => mapSprintRow(row, countMap.get(row.id) || 0));
}

export async function getSprintById(
  projectId: string,
  sprintId: string,
  authUser: AuthUser,
): Promise<SprintRecord> {
  await assertProjectAccess(projectId, authUser);

  const { data, error } = await supabaseAdmin
    .from("sprints")
    .select("*")
    .eq("id", sprintId)
    .eq("project_id", projectId)
    .single();

  if (error || !data) {
    throw new ApiError(ERROR_CODES.NOT_FOUND, "Sprint not found");
  }

  const { count } = await supabaseAdmin
    .from("tasks")
    .select("id", { count: "exact", head: true })
    .eq("sprint_id", sprintId)
    .eq("is_deleted", false);

  return mapSprintRow(data, count || 0);
}

export async function createSprint(
  projectId: string,
  authUser: AuthUser,
  input: CreateSprintInput,
): Promise<SprintRecord> {
  await assertProjectAccess(projectId, authUser, true);

  const now = getCurrentTimestamp();
  const { data, error } = await supabaseAdmin
    .from("sprints")
    .insert({
      project_id: projectId,
      name: input.name,
      goal: input.goal ?? null,
      start_date: input.startDate ?? null,
      end_date: input.endDate ?? null,
      status: input.status ?? "planned",
      created_at: now,
      updated_at: now,
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, error?.message);
  }

  return mapSprintRow(data, 0);
}

export async function updateSprint(
  projectId: string,
  sprintId: string,
  authUser: AuthUser,
  input: UpdateSprintInput,
): Promise<SprintRecord> {
  await assertProjectAccess(projectId, authUser, true);

  const updates: Record<string, unknown> = {
    updated_at: getCurrentTimestamp(),
  };
  if (input.name !== undefined) updates.name = input.name;
  if (input.goal !== undefined) updates.goal = input.goal;
  if (input.startDate !== undefined) updates.start_date = input.startDate;
  if (input.endDate !== undefined) updates.end_date = input.endDate;
  if (input.status !== undefined) updates.status = input.status;

  const { data, error } = await supabaseAdmin
    .from("sprints")
    .update(updates)
    .eq("id", sprintId)
    .eq("project_id", projectId)
    .select("*")
    .single();

  if (error || !data) {
    throw new ApiError(ERROR_CODES.NOT_FOUND, "Sprint not found");
  }

  const { count } = await supabaseAdmin
    .from("tasks")
    .select("id", { count: "exact", head: true })
    .eq("sprint_id", sprintId)
    .eq("is_deleted", false);

  return mapSprintRow(data, count || 0);
}

export async function deleteSprint(
  projectId: string,
  sprintId: string,
  authUser: AuthUser,
): Promise<void> {
  await assertProjectAccess(projectId, authUser, true);

  const { error } = await supabaseAdmin
    .from("sprints")
    .delete()
    .eq("id", sprintId)
    .eq("project_id", projectId);

  if (error) {
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
  }
}
