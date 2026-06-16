import { supabaseAdmin } from "../../../config/supabase.js";
import { ApiError } from "../../../utils/responses.js";
import { ERROR_CODES } from "../../../utils/error-codes.js";
import { getCurrentTimestamp } from "../../../utils/helpers.js";

export async function listExitChecklists(query: {
  status?: string;
  user_id?: string;
}) {
  let dbQuery = supabaseAdmin
    .from("exit_checklists")
    .select(
      "*, employee:users!user_id(id, full_name, email, job_title), created_by_user:users!created_by(id, full_name)",
    )
    .order("created_at", { ascending: false });

  if (query.status) dbQuery = dbQuery.eq("status", query.status);
  if (query.user_id) dbQuery = dbQuery.eq("user_id", query.user_id);

  const { data, error } = await dbQuery;
  if (error) throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
  return data || [];
}

export async function getExitChecklistById(id: string) {
  const { data, error } = await supabaseAdmin
    .from("exit_checklists")
    .select(
      "*, employee:users!user_id(id, full_name, email, job_title), created_by_user:users!created_by(id, full_name)",
    )
    .eq("id", id)
    .single();

  if (error || !data) throw ApiError.notFound("Exit checklist");
  return data;
}

export async function getExitChecklistByUserId(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("exit_checklists")
    .select(
      "*, employee:users!user_id(id, full_name, email, job_title), created_by_user:users!created_by(id, full_name)",
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
  return data || [];
}

export async function createExitChecklist(
  input: Record<string, unknown>,
  createdBy: string,
) {
  const { data, error } = await supabaseAdmin
    .from("exit_checklists")
    .insert({
      ...input,
      completed_items: input.completed_items || [],
      created_by: createdBy,
    })
    .select()
    .single();

  if (error) throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
  return data;
}

export async function updateExitChecklist(
  id: string,
  input: Record<string, unknown>,
) {
  const { data, error } = await supabaseAdmin
    .from("exit_checklists")
    .update({ ...input, updated_at: getCurrentTimestamp() })
    .eq("id", id)
    .select()
    .single();

  if (error) throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
  if (!data) throw ApiError.notFound("Exit checklist");
  return data;
}

export async function completeExitItem(id: string, itemId: string) {
  const checklist = await getExitChecklistById(id);
  const completed = new Set<string>(
    Array.isArray(checklist.completed_items) ? checklist.completed_items : [],
  );
  completed.add(itemId);

  const template = Array.isArray(checklist.template_json)
    ? checklist.template_json
    : [];
  const allComplete =
    template.length > 0 &&
    template.every((item: { id?: string; title?: string }, index: number) => {
      const key = item.id || item.title || String(index);
      return completed.has(key);
    });

  return updateExitChecklist(id, {
    completed_items: Array.from(completed),
    status: allComplete ? "completed" : "in_progress",
  });
}
