import { Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "../../../types/api.types.js";
import {
  sendSuccess,
  sendCreated,
  sendNoContent,
  ApiError,
} from "../../../utils/responses.js";
import { ERROR_CODES } from "../../../utils/error-codes.js";
import { supabaseAdmin } from "../../../config/supabase.js";
import { ALL_PERMISSION_KEYS } from "../../../lib/permissions.js";
import { slugToJobTitle } from "../../../utils/job-title.utils.js";
import { ensurePmSpecialistRoles } from "./roles.seed.js";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

function assertValidPermissions(permissions: unknown): asserts permissions is string[] {
  if (!Array.isArray(permissions)) {
    throw ApiError.badRequest("permissions must be an array");
  }
  const invalid = permissions.filter((p) => !ALL_PERMISSION_KEYS.includes(p));
  if (invalid.length > 0) {
    throw ApiError.badRequest(
      `Invalid permission keys: ${invalid.join(", ")}. Valid keys: ${ALL_PERMISSION_KEYS.join(", ")}`,
    );
  }
}

export const listRoles = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {

    await ensurePmSpecialistRoles();

    const { data, error } = await supabaseAdmin
      .from("roles")
      .select("*, departments(id, name, slug)")
      .order("is_system", { ascending: false })
      .order("created_at", { ascending: true });

    if (error) throw new ApiError(ERROR_CODES.INTERNAL_ERROR, error.message);

    const roles = (data || []).map((r: any) => ({
      id: r.id,
      name: r.name,
      slug: r.slug,
      scope: r.scope,
      departmentId: r.department_id,
      departmentIds: r.department_ids ?? (r.department_id ? [r.department_id] : []),
      departmentName: r.departments?.name ?? null,
      departmentSlug: r.departments?.slug ?? null,
      permissions: r.permissions ?? [],
      isSystem: r.is_system,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));

    sendSuccess(res, roles);
  } catch (error) {
    next(error);
  }
};

export const getRoleById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {

    const { id } = req.params;

    const { data, error } = await supabaseAdmin
      .from("roles")
      .select("*, departments(id, name, slug)")
      .eq("id", id)
      .single();

    if (error || !data) throw ApiError.notFound("Role");

    sendSuccess(res, {
      id: data.id,
      name: data.name,
      slug: data.slug,
      scope: data.scope,
      departmentId: data.department_id,
      departmentIds: (data as any).department_ids ?? (data.department_id ? [data.department_id] : []),
      departmentName: (data as any).departments?.name ?? null,
      departmentSlug: (data as any).departments?.slug ?? null,
      permissions: data.permissions ?? [],
      isSystem: data.is_system,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    });
  } catch (error) {
    next(error);
  }
};

export const createRole = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {

    const { name, scope, department_id, department_ids, permissions } = req.body as {
      name: string;
      scope: "global" | "department";
      department_id?: string;
      department_ids?: string[];
      permissions: string[];
    };

    // Normalise: prefer department_ids array, fall back to single department_id
    const resolvedDeptIds: string[] | null =
      scope === "global"
        ? null
        : Array.isArray(department_ids) && department_ids.length > 0
          ? department_ids
          : department_id
            ? [department_id]
            : null;

    if (!name || typeof name !== "string" || !name.trim()) {
      throw ApiError.badRequest("name is required");
    }
    if (!scope || !["global", "department"].includes(scope)) {
      throw ApiError.badRequest("scope must be 'global' or 'department'");
    }
    if (scope === "department" && (!resolvedDeptIds || resolvedDeptIds.length === 0)) {
      throw ApiError.badRequest(
        "At least one department is required for department-scoped roles",
      );
    }

    // Validate all permission keys (✅ Issue 2)
    assertValidPermissions(permissions ?? []);

    const slug = slugify(name.trim());
    if (!slug) {
      throw ApiError.badRequest("Role name produces an empty slug");
    }

    const { data, error } = await supabaseAdmin
      .from("roles")
      .insert({
        name: name.trim(),
        slug, // Set once at creation — never changes again (✅ Issue 1)
        scope,
        department_id: resolvedDeptIds ? resolvedDeptIds[0] : null,
        department_ids: resolvedDeptIds,
        permissions: permissions ?? [],
        is_system: false, // UI can never create a system role
        created_by: req.user.id,
      })
      .select("*")
      .single();

    if (error) {
      if (error.code === "23505") {
        throw ApiError.conflict(
          `A role with slug '${slug}' already exists. Choose a different name.`,
        );
      }
      throw new ApiError(ERROR_CODES.INTERNAL_ERROR, error.message);
    }

    sendCreated(res, data);
  } catch (error) {
    next(error);
  }
};

export const updateRole = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {

    const { id } = req.params;
    const { name, scope, department_id, department_ids, permissions } = req.body as {
      name?: string;
      scope?: "global" | "department";
      department_id?: string | null;
      department_ids?: string[] | null;
      permissions?: string[];
    };

    // Fetch existing role
    const { data: existing, error: fetchErr } = await supabaseAdmin
      .from("roles")
      .select("id, name, slug, scope, department_id, department_ids, is_system, permissions")
      .eq("id", id)
      .single();

    if (fetchErr || !existing) throw ApiError.notFound("Role");

    // Validate permission keys if provided (✅ Issue 2)
    if (permissions !== undefined) {
      assertValidPermissions(permissions);
    }

    // Build update payload — slug is NEVER included (✅ Issue 1)
    const updates: Record<string, unknown> = {};

    if (name !== undefined) {
      const trimmed = name.trim();
      if (!trimmed) throw ApiError.badRequest("name cannot be empty");
      if (existing.is_system && trimmed !== existing.name) {
        throw ApiError.forbidden(
          "System role names cannot be changed. Only permissions can be updated.",
        );
      }
      if (trimmed !== existing.name) {
        updates.name = trimmed;
      }
      // NOTE: slug is intentionally NOT updated — it is a stable identifier
    }

    if (scope !== undefined) {
      if (!["global", "department"].includes(scope)) {
        throw ApiError.badRequest("scope must be 'global' or 'department'");
      }
      if (existing.is_system && scope !== existing.scope) {
        throw ApiError.forbidden("System role scope cannot be changed.");
      }
      if (scope !== existing.scope) {
        updates.scope = scope;
      }
    }

    // Handle department_ids (new multi-dept) or legacy department_id
    if (department_ids !== undefined || department_id !== undefined) {
      const resolvedScope = (updates.scope ?? existing.scope) as string;

      const newDeptIds: string[] | null =
        resolvedScope === "global"
          ? null
          : Array.isArray(department_ids) && department_ids.length > 0
            ? department_ids
            : department_id
              ? [department_id]
              : null;

      if (existing.is_system) {
        throw ApiError.forbidden("System role department cannot be changed.");
      }

      updates.department_ids = newDeptIds;
      updates.department_id = newDeptIds ? newDeptIds[0] : null;
    }

    // Validate that department-scoped roles still have a department after update
    const finalScope = (updates.scope ?? existing.scope) as string;
    const finalDeptIds = (updates.department_ids !== undefined
      ? updates.department_ids
      : (existing as any).department_ids) as string[] | null;
    const finalDeptId = (updates.department_id !== undefined
      ? updates.department_id
      : existing.department_id) as string | null;

    if (finalScope === "department" && (!finalDeptIds?.length && !finalDeptId)) {
      throw ApiError.badRequest(
        "At least one department is required for department-scoped roles",
      );
    }

    if (
      permissions !== undefined &&
      JSON.stringify(permissions) !== JSON.stringify(existing.permissions ?? [])
    ) {
      updates.permissions = permissions;
    }

    if (Object.keys(updates).length === 0) {
      sendSuccess(res, existing);
      return;
    }

    const { data, error } = await supabaseAdmin
      .from("roles")
      .update(updates)
      .eq("id", id)
      .select("*")
      .single();

    if (error) throw new ApiError(ERROR_CODES.INTERNAL_ERROR, error.message);

    sendSuccess(res, data);
  } catch (error) {
    next(error);
  }
};

export const deleteRole = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {

    const { id } = req.params;
    const force = req.query["force"] === "true";

    const { data: existing, error: fetchErr } = await supabaseAdmin
      .from("roles")
      .select("id, is_system, name")
      .eq("id", id)
      .single();

    if (fetchErr || !existing) throw ApiError.notFound("Role");

    if (existing.is_system) {
      throw ApiError.forbidden(
        `System role '${existing.name}' cannot be deleted. You can modify its permissions but not remove it.`,
      );
    }

    // Count users currently assigned this role (✅ Issue 6)
    const { count: assignedCount } = await supabaseAdmin
      .from("user_roles")
      .select("id", { count: "exact", head: true })
      .eq("role_id", id);

    if (assignedCount && assignedCount > 0 && !force) {
      // Return a 409 with details so the UI can show a confirmation
      res.status(409).json({
        success: false,
        error: {
          code: "ROLE_IN_USE",
          message: `Role '${existing.name}' is currently assigned to ${assignedCount} user${assignedCount === 1 ? "" : "s"}. Pass ?force=true to delete it and remove all assignments.`,
          details: { assignedCount, roleName: existing.name },
        },
      });
      return;
    }

    // Delete role (user_roles rows cascade-delete via FK)
    const { error } = await supabaseAdmin.from("roles").delete().eq("id", id);

    if (error) throw new ApiError(ERROR_CODES.INTERNAL_ERROR, error.message);

    sendNoContent(res);
  } catch (error) {
    next(error);
  }
};

export const getUserRoles = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {

    const { userId } = req.params;
    // Users can read their own roles; crm:admin can read anyone's
    if (
      req.user.id !== userId &&
      !req.user.permissions.includes("crm:admin")
    ) {
      throw ApiError.forbidden("Cannot read another user's roles");
    }

    const { data, error } = await supabaseAdmin
      .from("user_roles")
      .select(
        `
        id,
        user_id,
        role_id,
        assigned_at,
        roles (
          id, name, slug, scope, department_id,
          departments ( name )
        )
      `,
      )
      .eq("user_id", userId)
      .order("assigned_at", { ascending: true });

    if (error) throw new ApiError(ERROR_CODES.INTERNAL_ERROR, error.message);

    const assignments = (data || []).map((ur: any) => ({
      id: ur.id,
      userId: ur.user_id,
      roleId: ur.role_id,
      roleName: ur.roles?.name ?? null,
      roleSlug: ur.roles?.slug ?? null,
      roleScope: ur.roles?.scope ?? null,
      departmentName: ur.roles?.departments?.name ?? null,
      assignedAt: ur.assigned_at,
    }));

    sendSuccess(res, assignments);
  } catch (error) {
    next(error);
  }
};

export const assignUserRole = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {

    const { userId } = req.params;
    const { role_id } = req.body as { role_id: string };
    if (!role_id) throw ApiError.badRequest("role_id is required");

    // Verify target user exists
    const { data: targetUser } = await supabaseAdmin
      .from("users")
      .select("id, is_active")
      .eq("id", userId)
      .single();
    if (!targetUser) throw ApiError.notFound("User");

    // Verify role exists (also fetch slug and department to sync job_title)
    const { data: roleExists } = await supabaseAdmin
      .from("roles")
      .select("id, name, slug, department_id, departments(slug)")
      .eq("id", role_id)
      .single();
    if (!roleExists) throw ApiError.notFound("Role");

    const { data, error } = await supabaseAdmin
      .from("user_roles")
      .insert({
        user_id: userId,
        role_id,
        assigned_by: req.user.id,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        throw ApiError.conflict(
          `Role '${roleExists.name}' is already assigned to this user`,
        );
      }
      throw new ApiError(ERROR_CODES.INTERNAL_ERROR, error.message);
    }

    // Sync job_title on the users table based on the assigned RBAC role slug.
    // Only set job_title if the user has none yet — never overwrite an existing one.
    // Multi-role users keep their primary department's job_title; the RBAC role_names
    // array is the source of truth for what roles they actually hold.
    // slugToJobTitle is dynamic: any slug → job_title by replacing hyphens with underscores.
    const roleSlug = (roleExists as any).slug as string | undefined;
    const derivedJobTitle = roleSlug ? slugToJobTitle(roleSlug) : undefined;
    if (derivedJobTitle) {
      const { data: currentUser } = await supabaseAdmin
        .from("users")
        .select("job_title")
        .eq("id", userId)
        .single();
      const currentJobTitle = (currentUser as any)?.job_title as string | null;
      // Only set if no job_title exists yet — don't overwrite primary department title
      if (!currentJobTitle) {
        await supabaseAdmin
          .from("users")
          .update({ job_title: derivedJobTitle })
          .eq("id", userId);
      }
    }

    // Invalidate auth cache for this user so next request gets fresh permissions
    const cacheHost = globalThis as any;
    if (cacheHost.__authUserCache) {
      cacheHost.__authUserCache.delete(userId);
    }

    sendCreated(res, data);
  } catch (error) {
    next(error);
  }
};

export const removeUserRole = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {

    const { userId, roleId } = req.params;

    // Verify the assignment exists before attempting delete
    const { data: assignment } = await supabaseAdmin
      .from("user_roles")
      .select("id")
      .eq("user_id", userId)
      .eq("role_id", roleId)
      .single();

    if (!assignment) throw ApiError.notFound("Role assignment");

    const { error } = await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", userId)
      .eq("role_id", roleId);

    if (error) throw new ApiError(ERROR_CODES.INTERNAL_ERROR, error.message);

    // Invalidate auth cache for this user so next request gets fresh permissions
    const cacheHost = globalThis as any;
    if (cacheHost.__authUserCache) {
      cacheHost.__authUserCache.delete(userId);
    }

    sendNoContent(res);
  } catch (error) {
    next(error);
  }
};

