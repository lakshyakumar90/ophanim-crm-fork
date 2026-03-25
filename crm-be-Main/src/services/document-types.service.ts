import { supabaseAdmin } from "../config/supabase.js";
import { ApiError } from "../utils/responses.js";
import { ERROR_CODES } from "../utils/error-codes.js";

export interface HrDocumentTypeRow {
  id: string;
  slug: string;
  label: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

function mapRow(r: any): HrDocumentTypeRow {
  return {
    id: r.id,
    slug: r.slug,
    label: r.label,
    description: r.description,
    sortOrder: r.sort_order,
    isActive: r.is_active,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export async function listDocumentTypes(options?: {
  activeOnly?: boolean;
}): Promise<HrDocumentTypeRow[]> {
  let q = supabaseAdmin.from("hr_document_types").select("*");
  if (options?.activeOnly) {
    q = q.eq("is_active", true);
  }
  const { data, error } = await q.order("sort_order", { ascending: true });
  if (error) {
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
  }
  return (data || []).map(mapRow);
}

export async function assertActiveDocumentTypeSlug(slug: string): Promise<void> {
  const { data, error } = await supabaseAdmin
    .from("hr_document_types")
    .select("id")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
  }
  if (!data) {
    throw new ApiError(
      ERROR_CODES.VALIDATION_ERROR,
      `Unknown or inactive document type: ${slug}`,
    );
  }
}

export async function createDocumentType(input: {
  slug: string;
  label: string;
  description?: string;
  sortOrder?: number;
}): Promise<HrDocumentTypeRow> {
  const slug = input.slug.trim().toLowerCase().replace(/-/g, "_");
  if (!/^[a-z][a-z0-9_]{0,62}$/.test(slug)) {
    throw new ApiError(
      ERROR_CODES.VALIDATION_ERROR,
      "Slug must start with a letter and contain only lowercase letters, numbers, and underscores",
    );
  }

  const { data, error } = await supabaseAdmin
    .from("hr_document_types")
    .insert({
      slug,
      label: input.label.trim(),
      description: input.description?.trim() || null,
      sort_order: input.sortOrder ?? 100,
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new ApiError(
        ERROR_CODES.VALIDATION_ERROR,
        "A document type with this slug already exists",
      );
    }
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
  }

  return mapRow(data);
}

export async function updateDocumentType(
  id: string,
  patch: {
    label?: string;
    description?: string | null;
    sortOrder?: number;
    isActive?: boolean;
  },
): Promise<HrDocumentTypeRow> {
  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (patch.label !== undefined) updates.label = patch.label.trim();
  if (patch.description !== undefined)
    updates.description =
      patch.description === null || patch.description === ""
        ? null
        : String(patch.description).trim();
  if (patch.sortOrder !== undefined) updates.sort_order = patch.sortOrder;
  if (patch.isActive !== undefined) updates.is_active = patch.isActive;

  const { data, error } = await supabaseAdmin
    .from("hr_document_types")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
  }
  if (!data) {
    throw ApiError.notFound("Document type");
  }

  return mapRow(data);
}
