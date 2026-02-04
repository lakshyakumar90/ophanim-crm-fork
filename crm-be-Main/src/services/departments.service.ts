import { supabaseAdmin } from "../config/supabase.js";
import { ApiError } from "../utils/responses.js";
import { ERROR_CODES } from "../utils/error-codes.js";
import type { Department } from "../types/api.types.js";

// Helper to convert snake_case to camelCase for a single department
function toCamelCase(row: Record<string, unknown>): Department {
  return {
    id: row.id as string,
    name: row.name as string,
    slug: row.slug as string,
    description: row.description as string | null,
    icon: row.icon as string | null,
    color: row.color as string | null,
    isActive: row.is_active as boolean,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

// Get all departments
export async function getDepartments(): Promise<Department[]> {
  const { data, error } = await supabaseAdmin
    .from("departments")
    .select("*")
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error) {
    throw new ApiError(
      ERROR_CODES.DATABASE_ERROR,
      "Failed to fetch departments",
      500,
    );
  }

  return (data || []).map(toCamelCase);
}

// Get department by ID
export async function getDepartmentById(
  id: string,
): Promise<Department | null> {
  const { data, error } = await supabaseAdmin
    .from("departments")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }
    throw new ApiError(
      ERROR_CODES.DATABASE_ERROR,
      "Failed to fetch department",
      500,
    );
  }

  return data ? toCamelCase(data) : null;
}

// Get department by slug
export async function getDepartmentBySlug(
  slug: string,
): Promise<Department | null> {
  const { data, error } = await supabaseAdmin
    .from("departments")
    .select("*")
    .eq("slug", slug)
    .eq("is_active", true)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }
    throw new ApiError(
      ERROR_CODES.DATABASE_ERROR,
      "Failed to fetch department",
      500,
    );
  }

  return data ? toCamelCase(data) : null;
}

// Create department (Admin only)
export async function createDepartment(input: {
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  color?: string;
}): Promise<Department> {
  const { data, error } = await supabaseAdmin
    .from("departments")
    .insert({
      name: input.name,
      slug: input.slug.toLowerCase(),
      description: input.description || null,
      icon: input.icon || null,
      color: input.color || null,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new ApiError(
        ERROR_CODES.CONFLICT,
        "Department with this name or slug already exists",
        409,
      );
    }
    throw new ApiError(
      ERROR_CODES.DATABASE_ERROR,
      "Failed to create department",
      500,
    );
  }

  return toCamelCase(data);
}

// Update department (Admin only)
export async function updateDepartment(
  id: string,
  input: {
    name?: string;
    description?: string;
    icon?: string;
    color?: string;
    isActive?: boolean;
  },
): Promise<Department> {
  const updateData: Record<string, unknown> = {};
  if (input.name !== undefined) updateData.name = input.name;
  if (input.description !== undefined)
    updateData.description = input.description;
  if (input.icon !== undefined) updateData.icon = input.icon;
  if (input.color !== undefined) updateData.color = input.color;
  if (input.isActive !== undefined) updateData.is_active = input.isActive;

  const { data, error } = await supabaseAdmin
    .from("departments")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      throw new ApiError(ERROR_CODES.NOT_FOUND, "Department not found", 404);
    }
    throw new ApiError(
      ERROR_CODES.DATABASE_ERROR,
      "Failed to update department",
      500,
    );
  }

  return toCamelCase(data);
}

// Get department ID by slug (utility function for other services)
export async function getDepartmentIdBySlug(
  slug: string,
): Promise<string | null> {
  const dept = await getDepartmentBySlug(slug);
  return dept?.id || null;
}

export const departmentsService = {
  getDepartments,
  getDepartmentById,
  getDepartmentBySlug,
  createDepartment,
  updateDepartment,
  getDepartmentIdBySlug,
};
