import { supabaseAdmin } from "../../../config/supabase.js";
import { ApiError } from "../../../utils/responses.js";
import { ERROR_CODES } from "../../../utils/error-codes.js";
import { getCurrentTimestamp } from "../../../utils/helpers.js";
import type { AuthUser } from "../../../types/api.types.js";
import { checkProjectAccess } from "../notes/notes.service.js";
import type {
  CreateTimeEntryInput,
  UpdateTimeEntryInput,
  TimeEntryListQuery,
} from "./time.validator.js";

export interface TimeEntryRecord {
  id: string;
  projectId: string;
  userId: string;
  taskId: string | null;
  entryDate: string;
  hours: number;
  description: string | null;
  status: string;
  submittedAt: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  rejectedReason: string | null;
  createdAt: string;
  updatedAt: string;
  user?: { id: string; fullName: string; email: string; avatarUrl: string | null };
  project?: { id: string; name: string };
  task?: { id: string; title: string } | null;
}

function mapTimeEntryRow(row: any): TimeEntryRecord {
  return {
    id: row.id,
    projectId: row.project_id,
    userId: row.user_id,
    taskId: row.task_id,
    entryDate: row.entry_date,
    hours: Number(row.hours),
    description: row.description,
    status: row.status,
    submittedAt: row.submitted_at,
    approvedBy: row.approved_by,
    approvedAt: row.approved_at,
    rejectedReason: row.rejected_reason,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    user: row.user
      ? {
          id: row.user.id,
          fullName: row.user.full_name,
          email: row.user.email,
          avatarUrl: row.user.avatar_url,
        }
      : undefined,
    project: row.project
      ? { id: row.project.id, name: row.project.name }
      : undefined,
    task: row.task
      ? { id: row.task.id, title: row.task.title }
      : row.task_id
        ? null
        : null,
  };
}

const TIME_ENTRY_SELECT = `
  *,
  user:users!user_id(id, full_name, email, avatar_url),
  project:projects!project_id(id, name),
  task:tasks!task_id(id, title)
`;

async function getTimeEntryOrThrow(id: string): Promise<any> {
  const { data, error } = await supabaseAdmin
    .from("time_entries")
    .select(TIME_ENTRY_SELECT)
    .eq("id", id)
    .single();

  if (error || !data) {
    throw new ApiError(ERROR_CODES.NOT_FOUND, "Time entry not found");
  }

  return data;
}

function canManageEntry(authUser: AuthUser, entry: any): boolean {
  return (
    entry.user_id === authUser.id ||
    authUser.permissions.includes("timesheets:approve") ||
    authUser.permissions.includes("crm:admin")
  );
}

export async function listTimeEntries(
  authUser: AuthUser,
  query: TimeEntryListQuery,
): Promise<TimeEntryRecord[]> {
  let dbQuery = supabaseAdmin
    .from("time_entries")
    .select(TIME_ENTRY_SELECT)
    .order("entry_date", { ascending: false });

  if (query.projectId) {
    const hasAccess = await checkProjectAccess(query.projectId, authUser);
    if (!hasAccess && !authUser.permissions.includes("timesheets:approve")) {
      throw new ApiError(ERROR_CODES.FORBIDDEN, "No access to this project");
    }
    dbQuery = dbQuery.eq("project_id", query.projectId);
  }

  if (query.userId) {
    dbQuery = dbQuery.eq("user_id", query.userId);
  } else if (!authUser.permissions.includes("timesheets:approve")) {
    dbQuery = dbQuery.eq("user_id", authUser.id);
  }

  if (query.status) {
    dbQuery = dbQuery.eq("status", query.status);
  }
  if (query.fromDate) {
    dbQuery = dbQuery.gte("entry_date", query.fromDate);
  }
  if (query.toDate) {
    dbQuery = dbQuery.lte("entry_date", query.toDate);
  }

  const { data, error } = await dbQuery;
  if (error) {
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
  }

  return (data || []).map(mapTimeEntryRow);
}

export async function getTimeEntryById(
  authUser: AuthUser,
  id: string,
): Promise<TimeEntryRecord> {
  const row = await getTimeEntryOrThrow(id);

  if (
    row.user_id !== authUser.id &&
    !(await checkProjectAccess(row.project_id, authUser)) &&
    !authUser.permissions.includes("timesheets:approve")
  ) {
    throw new ApiError(ERROR_CODES.FORBIDDEN);
  }

  return mapTimeEntryRow(row);
}

export async function createTimeEntry(
  authUser: AuthUser,
  input: CreateTimeEntryInput,
): Promise<TimeEntryRecord> {
  const hasAccess = await checkProjectAccess(input.projectId, authUser);
  if (!hasAccess) {
    throw new ApiError(ERROR_CODES.FORBIDDEN, "No access to this project");
  }

  const now = getCurrentTimestamp();
  const { data, error } = await supabaseAdmin
    .from("time_entries")
    .insert({
      project_id: input.projectId,
      user_id: authUser.id,
      task_id: input.taskId ?? null,
      entry_date: input.entryDate,
      hours: input.hours,
      description: input.description ?? null,
      status: "draft",
      created_at: now,
      updated_at: now,
    })
    .select(TIME_ENTRY_SELECT)
    .single();

  if (error || !data) {
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, error?.message);
  }

  return mapTimeEntryRow(data);
}

export async function updateTimeEntry(
  authUser: AuthUser,
  id: string,
  input: UpdateTimeEntryInput,
): Promise<TimeEntryRecord> {
  const existing = await getTimeEntryOrThrow(id);

  if (!canManageEntry(authUser, existing)) {
    throw new ApiError(ERROR_CODES.FORBIDDEN);
  }

  if (existing.status === "approved") {
    throw new ApiError(
      ERROR_CODES.VALIDATION_ERROR,
      "Cannot edit an approved time entry",
    );
  }

  if (
    existing.user_id !== authUser.id &&
    !authUser.permissions.includes("timesheets:approve")
  ) {
    throw new ApiError(ERROR_CODES.FORBIDDEN);
  }

  const updates: Record<string, unknown> = {
    updated_at: getCurrentTimestamp(),
  };
  if (input.taskId !== undefined) updates.task_id = input.taskId;
  if (input.entryDate !== undefined) updates.entry_date = input.entryDate;
  if (input.hours !== undefined) updates.hours = input.hours;
  if (input.description !== undefined) updates.description = input.description;

  const { data, error } = await supabaseAdmin
    .from("time_entries")
    .update(updates)
    .eq("id", id)
    .select(TIME_ENTRY_SELECT)
    .single();

  if (error || !data) {
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, error?.message);
  }

  return mapTimeEntryRow(data);
}

export async function deleteTimeEntry(
  authUser: AuthUser,
  id: string,
): Promise<void> {
  const existing = await getTimeEntryOrThrow(id);

  if (existing.user_id !== authUser.id && !authUser.permissions.includes("timesheets:approve")) {
    throw new ApiError(ERROR_CODES.FORBIDDEN);
  }

  if (existing.status === "approved") {
    throw new ApiError(
      ERROR_CODES.VALIDATION_ERROR,
      "Cannot delete an approved time entry",
    );
  }

  const { error } = await supabaseAdmin.from("time_entries").delete().eq("id", id);
  if (error) {
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
  }
}

export async function submitTimeEntry(
  authUser: AuthUser,
  id: string,
): Promise<TimeEntryRecord> {
  const existing = await getTimeEntryOrThrow(id);

  if (existing.user_id !== authUser.id) {
    throw new ApiError(ERROR_CODES.FORBIDDEN);
  }

  if (!["draft", "rejected"].includes(existing.status)) {
    throw new ApiError(
      ERROR_CODES.VALIDATION_ERROR,
      "Only draft or rejected entries can be submitted",
    );
  }

  const now = getCurrentTimestamp();
  const { data, error } = await supabaseAdmin
    .from("time_entries")
    .update({
      status: "submitted",
      submitted_at: now,
      rejected_reason: null,
      updated_at: now,
    })
    .eq("id", id)
    .select(TIME_ENTRY_SELECT)
    .single();

  if (error || !data) {
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, error?.message);
  }

  return mapTimeEntryRow(data);
}

export async function approveTimeEntry(
  authUser: AuthUser,
  id: string,
): Promise<TimeEntryRecord> {
  if (!authUser.permissions.includes("timesheets:approve")) {
    throw new ApiError(ERROR_CODES.FORBIDDEN, "Missing timesheets:approve");
  }

  const existing = await getTimeEntryOrThrow(id);
  if (existing.status !== "submitted") {
    throw new ApiError(
      ERROR_CODES.VALIDATION_ERROR,
      "Only submitted entries can be approved",
    );
  }

  const now = getCurrentTimestamp();
  const { data, error } = await supabaseAdmin
    .from("time_entries")
    .update({
      status: "approved",
      approved_by: authUser.id,
      approved_at: now,
      updated_at: now,
    })
    .eq("id", id)
    .select(TIME_ENTRY_SELECT)
    .single();

  if (error || !data) {
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, error?.message);
  }

  return mapTimeEntryRow(data);
}

export async function rejectTimeEntry(
  authUser: AuthUser,
  id: string,
  reason: string,
): Promise<TimeEntryRecord> {
  if (!authUser.permissions.includes("timesheets:approve")) {
    throw new ApiError(ERROR_CODES.FORBIDDEN, "Missing timesheets:approve");
  }

  const existing = await getTimeEntryOrThrow(id);
  if (existing.status !== "submitted") {
    throw new ApiError(
      ERROR_CODES.VALIDATION_ERROR,
      "Only submitted entries can be rejected",
    );
  }

  const now = getCurrentTimestamp();
  const { data, error } = await supabaseAdmin
    .from("time_entries")
    .update({
      status: "rejected",
      rejected_reason: reason,
      approved_by: null,
      approved_at: null,
      updated_at: now,
    })
    .eq("id", id)
    .select(TIME_ENTRY_SELECT)
    .single();

  if (error || !data) {
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, error?.message);
  }

  return mapTimeEntryRow(data);
}
