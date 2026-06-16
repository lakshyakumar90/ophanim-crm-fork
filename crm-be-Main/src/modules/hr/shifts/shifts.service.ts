import { supabaseAdmin } from "../../../config/supabase.js";
import { ApiError } from "../../../utils/responses.js";
import { ERROR_CODES } from "../../../utils/error-codes.js";
import { getCurrentTimestamp } from "../../../utils/helpers.js";

export async function listShifts(query: {
  user_id?: string;
  from_date?: string;
  to_date?: string;
  shift_type?: string;
}) {
  let dbQuery = supabaseAdmin
    .from("shifts")
    .select(
      "*, employee:users!user_id(id, full_name, email, shift_type), created_by_user:users!created_by(id, full_name)",
    )
    .order("shift_date", { ascending: true })
    .order("start_time", { ascending: true });

  if (query.user_id) dbQuery = dbQuery.eq("user_id", query.user_id);
  if (query.from_date) dbQuery = dbQuery.gte("shift_date", query.from_date);
  if (query.to_date) dbQuery = dbQuery.lte("shift_date", query.to_date);
  if (query.shift_type) dbQuery = dbQuery.eq("shift_type", query.shift_type);

  const { data, error } = await dbQuery;
  if (error) throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
  return data || [];
}

export async function getShiftById(id: string) {
  const { data, error } = await supabaseAdmin
    .from("shifts")
    .select(
      "*, employee:users!user_id(id, full_name, email, shift_type), created_by_user:users!created_by(id, full_name)",
    )
    .eq("id", id)
    .single();

  if (error || !data) throw ApiError.notFound("Shift");
  return data;
}

export async function createShift(
  input: Record<string, unknown>,
  createdBy: string,
) {
  const { data, error } = await supabaseAdmin
    .from("shifts")
    .insert({ ...input, created_by: createdBy })
    .select()
    .single();

  if (error) throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
  return data;
}

export async function bulkCreateShifts(
  shifts: Record<string, unknown>[],
  createdBy: string,
) {
  const rows = shifts.map((shift) => ({ ...shift, created_by: createdBy }));
  const { data, error } = await supabaseAdmin
    .from("shifts")
    .upsert(rows, { onConflict: "user_id,shift_date" })
    .select();

  if (error) throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
  return data || [];
}

export async function updateShift(id: string, input: Record<string, unknown>) {
  const { data, error } = await supabaseAdmin
    .from("shifts")
    .update({ ...input, updated_at: getCurrentTimestamp() })
    .eq("id", id)
    .select()
    .single();

  if (error) throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
  if (!data) throw ApiError.notFound("Shift");
  return data;
}

export async function deleteShift(id: string) {
  const { error } = await supabaseAdmin.from("shifts").delete().eq("id", id);
  if (error) throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
}

export async function getMyShifts(
  userId: string,
  query: { from_date?: string; to_date?: string },
) {
  return listShifts({ user_id: userId, ...query });
}
