import { supabaseAdmin } from "../../../config/supabase.js";
import { ApiError } from "../../../utils/responses.js";
import { ERROR_CODES } from "../../../utils/error-codes.js";
import { getCurrentTimestamp } from "../../../utils/helpers.js";

export async function listBenefitPlans(query: { is_active?: boolean }) {
  let dbQuery = supabaseAdmin
    .from("benefit_plans")
    .select("*, created_by_user:users!created_by(id, full_name)")
    .order("name");

  if (query.is_active !== undefined) {
    dbQuery = dbQuery.eq("is_active", query.is_active);
  }

  const { data, error } = await dbQuery;
  if (error) throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
  return data || [];
}

export async function getBenefitPlanById(id: string) {
  const { data, error } = await supabaseAdmin
    .from("benefit_plans")
    .select("*, created_by_user:users!created_by(id, full_name)")
    .eq("id", id)
    .single();

  if (error || !data) throw ApiError.notFound("Benefit plan");
  return data;
}

export async function createBenefitPlan(
  input: Record<string, unknown>,
  createdBy: string,
) {
  const { data, error } = await supabaseAdmin
    .from("benefit_plans")
    .insert({ ...input, created_by: createdBy })
    .select()
    .single();

  if (error) throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
  return data;
}

export async function updateBenefitPlan(id: string, input: Record<string, unknown>) {
  const { data, error } = await supabaseAdmin
    .from("benefit_plans")
    .update({ ...input, updated_at: getCurrentTimestamp() })
    .eq("id", id)
    .select()
    .single();

  if (error) throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
  if (!data) throw ApiError.notFound("Benefit plan");
  return data;
}

export async function deleteBenefitPlan(id: string) {
  const { error } = await supabaseAdmin.from("benefit_plans").delete().eq("id", id);
  if (error) throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
}

export async function listEnrollments(query: {
  user_id?: string;
  plan_id?: string;
  status?: string;
}) {
  let dbQuery = supabaseAdmin
    .from("benefit_enrollments")
    .select(
      "*, plan:benefit_plans(id, name, description), employee:users!user_id(id, full_name, email)",
    )
    .order("enrolled_at", { ascending: false });

  if (query.user_id) dbQuery = dbQuery.eq("user_id", query.user_id);
  if (query.plan_id) dbQuery = dbQuery.eq("plan_id", query.plan_id);
  if (query.status) dbQuery = dbQuery.eq("status", query.status);

  const { data, error } = await dbQuery;
  if (error) throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
  return data || [];
}

export async function getEnrollmentById(id: string) {
  const { data, error } = await supabaseAdmin
    .from("benefit_enrollments")
    .select(
      "*, plan:benefit_plans(*), employee:users!user_id(id, full_name, email)",
    )
    .eq("id", id)
    .single();

  if (error || !data) throw ApiError.notFound("Benefit enrollment");
  return data;
}

export async function createEnrollment(
  input: Record<string, unknown>,
  createdBy: string,
) {
  const { data, error } = await supabaseAdmin
    .from("benefit_enrollments")
    .insert({ ...input, created_by: createdBy })
    .select(
      "*, plan:benefit_plans(id, name), employee:users!user_id(id, full_name, email)",
    )
    .single();

  if (error) throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
  return data;
}

export async function updateEnrollment(id: string, input: Record<string, unknown>) {
  const payload: Record<string, unknown> = {
    ...input,
    updated_at: getCurrentTimestamp(),
  };

  if (input.status === "cancelled") {
    payload.cancelled_at = getCurrentTimestamp();
  }

  const { data, error } = await supabaseAdmin
    .from("benefit_enrollments")
    .update(payload)
    .eq("id", id)
    .select(
      "*, plan:benefit_plans(id, name), employee:users!user_id(id, full_name, email)",
    )
    .single();

  if (error) throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
  if (!data) throw ApiError.notFound("Benefit enrollment");
  return data;
}

export async function getMyEnrollments(userId: string) {
  return listEnrollments({ user_id: userId });
}
