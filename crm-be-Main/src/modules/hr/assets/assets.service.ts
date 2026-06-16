import { supabaseAdmin } from "../../../config/supabase.js";
import { ApiError } from "../../../utils/responses.js";
import { ERROR_CODES } from "../../../utils/error-codes.js";
import { getCurrentTimestamp } from "../../../utils/helpers.js";

export async function listAssets(query: {
  status?: string;
  assigned_user_id?: string;
  search?: string;
}) {
  let dbQuery = supabaseAdmin
    .from("assets")
    .select(
      "*, assigned_user:users!assigned_user_id(id, full_name, email), created_by_user:users!created_by(id, full_name)",
    )
    .order("created_at", { ascending: false });

  if (query.status) dbQuery = dbQuery.eq("status", query.status);
  if (query.assigned_user_id) {
    dbQuery = dbQuery.eq("assigned_user_id", query.assigned_user_id);
  }
  if (query.search) {
    dbQuery = dbQuery.or(
      `name.ilike.%${query.search}%,serial_number.ilike.%${query.search}%`,
    );
  }

  const { data, error } = await dbQuery;
  if (error) throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
  return data || [];
}

export async function getAssetById(id: string) {
  const { data, error } = await supabaseAdmin
    .from("assets")
    .select(
      "*, assigned_user:users!assigned_user_id(id, full_name, email), created_by_user:users!created_by(id, full_name)",
    )
    .eq("id", id)
    .single();

  if (error || !data) throw ApiError.notFound("Asset");
  return data;
}

export async function createAsset(
  input: Record<string, unknown>,
  createdBy: string,
) {
  const { data, error } = await supabaseAdmin
    .from("assets")
    .insert({ ...input, created_by: createdBy })
    .select()
    .single();

  if (error) throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
  return data;
}

export async function updateAsset(id: string, input: Record<string, unknown>) {
  const { data, error } = await supabaseAdmin
    .from("assets")
    .update({ ...input, updated_at: getCurrentTimestamp() })
    .eq("id", id)
    .select()
    .single();

  if (error) throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
  if (!data) throw ApiError.notFound("Asset");
  return data;
}

export async function deleteAsset(id: string) {
  const { error } = await supabaseAdmin.from("assets").delete().eq("id", id);
  if (error) throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
}

export async function assignAsset(
  assetId: string,
  userId: string,
  assignedBy: string,
  notes?: string,
) {
  const asset = await getAssetById(assetId);
  if (asset.status === "retired") {
    throw new ApiError(ERROR_CODES.VALIDATION_ERROR, "Cannot assign a retired asset");
  }

  const { data: activeAssignment } = await supabaseAdmin
    .from("asset_assignments")
    .select("id")
    .eq("asset_id", assetId)
    .is("returned_at", null)
    .maybeSingle();

  if (activeAssignment) {
    throw new ApiError(
      ERROR_CODES.CONFLICT,
      "Asset is already assigned. Return it before reassigning.",
    );
  }

  const { data: assignment, error: assignError } = await supabaseAdmin
    .from("asset_assignments")
    .insert({
      asset_id: assetId,
      user_id: userId,
      assigned_by: assignedBy,
      notes,
    })
    .select(
      "*, user:users!user_id(id, full_name, email), assigned_by_user:users!assigned_by(id, full_name)",
    )
    .single();

  if (assignError) {
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, assignError.message);
  }

  const { data: updatedAsset, error: assetError } = await supabaseAdmin
    .from("assets")
    .update({
      assigned_user_id: userId,
      status: "assigned",
      updated_at: getCurrentTimestamp(),
    })
    .eq("id", assetId)
    .select()
    .single();

  if (assetError) throw new ApiError(ERROR_CODES.DATABASE_ERROR, assetError.message);

  return { asset: updatedAsset, assignment };
}

export async function returnAsset(assetId: string) {
  const { data: activeAssignment, error: findError } = await supabaseAdmin
    .from("asset_assignments")
    .select("*")
    .eq("asset_id", assetId)
    .is("returned_at", null)
    .maybeSingle();

  if (findError) throw new ApiError(ERROR_CODES.DATABASE_ERROR, findError.message);
  if (!activeAssignment) {
    throw new ApiError(ERROR_CODES.NOT_FOUND, "No active assignment for this asset");
  }

  const { data: assignment, error: updateAssignError } = await supabaseAdmin
    .from("asset_assignments")
    .update({ returned_at: getCurrentTimestamp() })
    .eq("id", activeAssignment.id)
    .select()
    .single();

  if (updateAssignError) {
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, updateAssignError.message);
  }

  const { data: asset, error: assetError } = await supabaseAdmin
    .from("assets")
    .update({
      assigned_user_id: null,
      status: "available",
      updated_at: getCurrentTimestamp(),
    })
    .eq("id", assetId)
    .select()
    .single();

  if (assetError) throw new ApiError(ERROR_CODES.DATABASE_ERROR, assetError.message);

  return { asset, assignment };
}

export async function listAssignments(query: {
  asset_id?: string;
  user_id?: string;
  active_only?: boolean;
}) {
  let dbQuery = supabaseAdmin
    .from("asset_assignments")
    .select(
      "*, asset:assets(id, name, serial_number), user:users!user_id(id, full_name, email)",
    )
    .order("assigned_at", { ascending: false });

  if (query.asset_id) dbQuery = dbQuery.eq("asset_id", query.asset_id);
  if (query.user_id) dbQuery = dbQuery.eq("user_id", query.user_id);
  if (query.active_only) dbQuery = dbQuery.is("returned_at", null);

  const { data, error } = await dbQuery;
  if (error) throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
  return data || [];
}
