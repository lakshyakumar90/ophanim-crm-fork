import { supabaseAdmin } from "../../../config/supabase.js";
import { ApiError } from "../../../utils/responses.js";
import { ERROR_CODES } from "../../../utils/error-codes.js";
import { getCurrentTimestamp } from "../../../utils/helpers.js";
import type { AuthUser } from "../../../types/api.types.js";
import { checkProjectAccess } from "../notes/notes.service.js";
import type {
  CreateMilestoneInput,
  UpdateMilestoneInput,
  CreateDeliverableInput,
  UpdateDeliverableInput,
} from "./milestones.validator.js";

export interface MilestoneRecord {
  id: string;
  projectId: string;
  name: string;
  description: string | null;
  dueDate: string | null;
  status: string;
  sortOrder: number;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  deliverables?: DeliverableRecord[];
}

export interface DeliverableRecord {
  id: string;
  milestoneId: string;
  name: string;
  description: string | null;
  isCompleted: boolean;
  completedAt: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

function mapMilestoneRow(row: any, deliverables?: any[]): MilestoneRecord {
  return {
    id: row.id,
    projectId: row.project_id,
    name: row.name,
    description: row.description,
    dueDate: row.due_date,
    status: row.status,
    sortOrder: row.sort_order,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deliverables: deliverables?.map(mapDeliverableRow),
  };
}

function mapDeliverableRow(row: any): DeliverableRecord {
  return {
    id: row.id,
    milestoneId: row.milestone_id,
    name: row.name,
    description: row.description,
    isCompleted: row.is_completed,
    completedAt: row.completed_at,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function assertProjectAccess(
  projectId: string,
  authUser: AuthUser,
  requireManage = false,
): Promise<void> {
  const hasAccess = await checkProjectAccess(projectId, authUser);
  if (!hasAccess) {
    throw new ApiError(ERROR_CODES.FORBIDDEN);
  }

  if (
    requireManage &&
    !authUser.permissions.includes("milestones:manage") &&
    authUser.role !== "admin"
  ) {
    const { data: project } = await supabaseAdmin
      .from("projects")
      .select("manager_id")
      .eq("id", projectId)
      .single();

    if (project?.manager_id !== authUser.id) {
      throw new ApiError(ERROR_CODES.FORBIDDEN, "Missing milestones:manage");
    }
  }
}

export async function listMilestones(
  projectId: string,
  authUser: AuthUser,
): Promise<MilestoneRecord[]> {
  await assertProjectAccess(projectId, authUser);

  const { data, error } = await supabaseAdmin
    .from("project_milestones")
    .select(
      `
      *,
      deliverables:milestone_deliverables(*)
    `,
    )
    .eq("project_id", projectId)
    .order("sort_order", { ascending: true });

  if (error) {
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
  }

  return (data || []).map((row: any) =>
    mapMilestoneRow(row, row.deliverables || []),
  );
}

export async function getMilestoneById(
  projectId: string,
  milestoneId: string,
  authUser: AuthUser,
): Promise<MilestoneRecord> {
  await assertProjectAccess(projectId, authUser);

  const { data, error } = await supabaseAdmin
    .from("project_milestones")
    .select(
      `
      *,
      deliverables:milestone_deliverables(*)
    `,
    )
    .eq("id", milestoneId)
    .eq("project_id", projectId)
    .single();

  if (error || !data) {
    throw new ApiError(ERROR_CODES.NOT_FOUND, "Milestone not found");
  }

  return mapMilestoneRow(data, data.deliverables || []);
}

export async function createMilestone(
  projectId: string,
  authUser: AuthUser,
  input: CreateMilestoneInput,
): Promise<MilestoneRecord> {
  await assertProjectAccess(projectId, authUser, true);

  const now = getCurrentTimestamp();
  const { data, error } = await supabaseAdmin
    .from("project_milestones")
    .insert({
      project_id: projectId,
      name: input.name,
      description: input.description ?? null,
      due_date: input.dueDate ?? null,
      status: input.status ?? "pending",
      sort_order: input.sortOrder ?? 0,
      created_at: now,
      updated_at: now,
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, error?.message);
  }

  return mapMilestoneRow(data, []);
}

export async function updateMilestone(
  projectId: string,
  milestoneId: string,
  authUser: AuthUser,
  input: UpdateMilestoneInput,
): Promise<MilestoneRecord> {
  await assertProjectAccess(projectId, authUser, true);

  const updates: Record<string, unknown> = {
    updated_at: getCurrentTimestamp(),
  };
  if (input.name !== undefined) updates.name = input.name;
  if (input.description !== undefined) updates.description = input.description;
  if (input.dueDate !== undefined) updates.due_date = input.dueDate;
  if (input.status !== undefined) {
    updates.status = input.status;
    updates.completed_at =
      input.status === "completed" ? getCurrentTimestamp() : null;
  }
  if (input.sortOrder !== undefined) updates.sort_order = input.sortOrder;

  const { data, error } = await supabaseAdmin
    .from("project_milestones")
    .update(updates)
    .eq("id", milestoneId)
    .eq("project_id", projectId)
    .select(
      `
      *,
      deliverables:milestone_deliverables(*)
    `,
    )
    .single();

  if (error || !data) {
    throw new ApiError(ERROR_CODES.NOT_FOUND, "Milestone not found");
  }

  return mapMilestoneRow(data, data.deliverables || []);
}

export async function deleteMilestone(
  projectId: string,
  milestoneId: string,
  authUser: AuthUser,
): Promise<void> {
  await assertProjectAccess(projectId, authUser, true);

  const { error } = await supabaseAdmin
    .from("project_milestones")
    .delete()
    .eq("id", milestoneId)
    .eq("project_id", projectId);

  if (error) {
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
  }
}

export async function listDeliverables(
  projectId: string,
  milestoneId: string,
  authUser: AuthUser,
): Promise<DeliverableRecord[]> {
  await getMilestoneById(projectId, milestoneId, authUser);

  const { data, error } = await supabaseAdmin
    .from("milestone_deliverables")
    .select("*")
    .eq("milestone_id", milestoneId)
    .order("sort_order", { ascending: true });

  if (error) {
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
  }

  return (data || []).map(mapDeliverableRow);
}

export async function createDeliverable(
  projectId: string,
  milestoneId: string,
  authUser: AuthUser,
  input: CreateDeliverableInput,
): Promise<DeliverableRecord> {
  await assertProjectAccess(projectId, authUser, true);
  await getMilestoneById(projectId, milestoneId, authUser);

  const now = getCurrentTimestamp();
  const { data, error } = await supabaseAdmin
    .from("milestone_deliverables")
    .insert({
      milestone_id: milestoneId,
      name: input.name,
      description: input.description ?? null,
      is_completed: input.isCompleted ?? false,
      completed_at: input.isCompleted ? now : null,
      sort_order: input.sortOrder ?? 0,
      created_at: now,
      updated_at: now,
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, error?.message);
  }

  return mapDeliverableRow(data);
}

export async function updateDeliverable(
  projectId: string,
  milestoneId: string,
  deliverableId: string,
  authUser: AuthUser,
  input: UpdateDeliverableInput,
): Promise<DeliverableRecord> {
  await assertProjectAccess(projectId, authUser, true);

  const updates: Record<string, unknown> = {
    updated_at: getCurrentTimestamp(),
  };
  if (input.name !== undefined) updates.name = input.name;
  if (input.description !== undefined) updates.description = input.description;
  if (input.sortOrder !== undefined) updates.sort_order = input.sortOrder;
  if (input.isCompleted !== undefined) {
    updates.is_completed = input.isCompleted;
    updates.completed_at = input.isCompleted ? getCurrentTimestamp() : null;
  }

  const { data, error } = await supabaseAdmin
    .from("milestone_deliverables")
    .update(updates)
    .eq("id", deliverableId)
    .eq("milestone_id", milestoneId)
    .select("*")
    .single();

  if (error || !data) {
    throw new ApiError(ERROR_CODES.NOT_FOUND, "Deliverable not found");
  }

  return mapDeliverableRow(data);
}

export async function deleteDeliverable(
  projectId: string,
  milestoneId: string,
  deliverableId: string,
  authUser: AuthUser,
): Promise<void> {
  await assertProjectAccess(projectId, authUser, true);

  const { error } = await supabaseAdmin
    .from("milestone_deliverables")
    .delete()
    .eq("id", deliverableId)
    .eq("milestone_id", milestoneId);

  if (error) {
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
  }
}
