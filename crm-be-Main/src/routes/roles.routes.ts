import { Router, type Request, type Response } from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import { requirePermission } from "../middleware/authorization.middleware.js";
import { asyncHandler } from "../middleware/error.middleware.js";
import {
  sendSuccess,
  sendCreated,
  sendNoContent,
  ApiError,
} from "../utils/responses.js";
import { ERROR_CODES } from "../utils/error-codes.js";
import type { AuthenticatedRequest } from "../types/api.types.js";
import { supabaseAdmin } from "../config/supabase.js";
import { ALL_PERMISSION_KEYS } from "../lib/permissions.js";

const router: Router = Router();

// All roles routes require authentication
router.use(authenticate as any);

// ----------------------------------------------------------------
// Utility: slugify a role name (only used at creation time)
// Slugs are IMMUTABLE after creation — they are stable identifiers.
// ----------------------------------------------------------------
function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

// ----------------------------------------------------------------
// Utility: validate permission keys array
// Throws ApiError.badRequest if any unknown keys are found
// ----------------------------------------------------------------
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

// ----------------------------------------------------------------
// GET /roles
// List all roles with department info. All authenticated users can read.
// ----------------------------------------------------------------
router.get(
  "/",
  asyncHandler(async (_req: Request, res: Response) => {
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
      departmentName: r.departments?.name ?? null,
      departmentSlug: r.departments?.slug ?? null,
      permissions: r.permissions ?? [],
      isSystem: r.is_system,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));

    sendSuccess(res, roles);
  }),
);

// ----------------------------------------------------------------
// GET /roles/:id
// Get a single role.
// ----------------------------------------------------------------
router.get(
  "/:id",
  asyncHandler(async (req: Request, res: Response) => {
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
      departmentName: (data as any).departments?.name ?? null,
      departmentSlug: (data as any).departments?.slug ?? null,
      permissions: data.permissions ?? [],
      isSystem: data.is_system,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    });
  }),
);

// ----------------------------------------------------------------
// POST /roles
// Create a new custom role. Requires roles:manage.
// ----------------------------------------------------------------
router.post(
  "/",
  requirePermission("roles:manage") as any,
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as unknown as AuthenticatedRequest;
    const { name, scope, department_id, permissions } = req.body as {
      name: string;
      scope: "global" | "department";
      department_id?: string;
      permissions: string[];
    };

    if (!name || typeof name !== "string" || !name.trim()) {
      throw ApiError.badRequest("name is required");
    }
    if (!scope || !["global", "department"].includes(scope)) {
      throw ApiError.badRequest("scope must be 'global' or 'department'");
    }
    if (scope === "department" && !department_id) {
      throw ApiError.badRequest(
        "department_id is required for department-scoped roles",
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
        department_id: scope === "global" ? null : department_id,
        permissions: permissions ?? [],
        is_system: false, // UI can never create a system role
        created_by: authReq.user.id,
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
  }),
);

// ----------------------------------------------------------------
// PUT /roles/:id
// Update a role. Requires roles:manage.
//
// RULES:
//   - Slug is IMMUTABLE — never accepted or applied (✅ Issue 1)
//   - System role name + scope are locked
//   - All incoming permission keys are validated (✅ Issue 2)
// ----------------------------------------------------------------
router.put(
  "/:id",
  requirePermission("roles:manage") as any,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { name, scope, department_id, permissions } = req.body as {
      name?: string;
      scope?: "global" | "department";
      department_id?: string | null;
      permissions?: string[];
    };

    // Fetch existing role
    const { data: existing, error: fetchErr } = await supabaseAdmin
      .from("roles")
      .select("id, name, slug, scope, department_id, is_system, permissions")
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

    if (department_id !== undefined) {
      const resolvedScope = (updates.scope ?? existing.scope) as string;
      const nextDepartmentId =
        resolvedScope === "global" ? null : department_id;

      if (existing.is_system && nextDepartmentId !== existing.department_id) {
        throw ApiError.forbidden(
          "System role department cannot be changed.",
        );
      }

      if (nextDepartmentId !== existing.department_id) {
        updates.department_id = nextDepartmentId;
      }
    }

    // Validate that department-scoped roles still have a department after update
    const finalScope = (updates.scope ?? existing.scope) as string;
    const finalDeptId = (updates.department_id !== undefined
      ? updates.department_id
      : existing.department_id) as string | null;

    if (finalScope === "department" && !finalDeptId) {
      throw ApiError.badRequest(
        "department_id is required for department-scoped roles",
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
  }),
);

// ----------------------------------------------------------------
// DELETE /roles/:id
// Delete a custom role. Requires roles:manage.
//
// RULES:
//   - System roles cannot be deleted
//   - If users are currently assigned this role, respond with 409 and
//     the count so the admin can decide (✅ Issue 6)
//   - Pass ?force=true to bypass the assignment check and cascade-delete
//     all user_role rows (confirm in UI before sending)
// ----------------------------------------------------------------
router.delete(
  "/:id",
  requirePermission("roles:manage") as any,
  asyncHandler(async (req: Request, res: Response) => {
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
  }),
);

// ================================================================
// USER-ROLE ASSIGNMENT
// Routes: GET/POST /users/:userId/roles  +  DELETE /users/:userId/roles/:roleId
// ================================================================

router.get(
  "/users/:userId/roles",
  asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.params;
    const authReq = req as unknown as AuthenticatedRequest;

    // Users can read their own roles; crm:admin can read anyone's
    if (
      authReq.user.id !== userId &&
      !authReq.user.permissions.includes("crm:admin")
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
  }),
);

router.post(
  "/users/:userId/roles",
  requirePermission("crm:admin") as any,
  asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.params;
    const { role_id } = req.body as { role_id: string };
    const authReq = req as unknown as AuthenticatedRequest;

    if (!role_id) throw ApiError.badRequest("role_id is required");

    // Verify target user exists
    const { data: targetUser } = await supabaseAdmin
      .from("users")
      .select("id, is_active")
      .eq("id", userId)
      .single();
    if (!targetUser) throw ApiError.notFound("User");

    // Verify role exists
    const { data: roleExists } = await supabaseAdmin
      .from("roles")
      .select("id, name")
      .eq("id", role_id)
      .single();
    if (!roleExists) throw ApiError.notFound("Role");

    const { data, error } = await supabaseAdmin
      .from("user_roles")
      .insert({
        user_id: userId,
        role_id,
        assigned_by: authReq.user.id,
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

    sendCreated(res, data);
  }),
);

router.delete(
  "/users/:userId/roles/:roleId",
  requirePermission("crm:admin") as any,
  asyncHandler(async (req: Request, res: Response) => {
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

    sendNoContent(res);
  }),
);

export default router;
