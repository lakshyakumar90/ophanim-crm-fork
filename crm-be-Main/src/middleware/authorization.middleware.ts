import type { Response, NextFunction } from "express";
import { USER_ROLES, type UserRole } from "../config/constants.js";
import { ApiError } from "../utils/responses.js";
import { ERROR_CODES } from "../utils/error-codes.js";
import type { AuthenticatedRequest } from "../types/api.types.js";
import { supabaseAdmin } from "../config/supabase.js";

/**
 * Check if user has one of the required legacy roles.
 * Use requirePermission() for new feature guards instead.
 */
export function requireRole(...allowedRoles: UserRole[]) {
  return (
    req: AuthenticatedRequest,
    _res: Response,
    next: NextFunction,
  ): void => {
    if (!req.user) {
      throw new ApiError(ERROR_CODES.AUTH_TOKEN_MISSING);
    }

    if (!allowedRoles.includes(req.user.role)) {
      throw new ApiError(
        ERROR_CODES.FORBIDDEN,
        `This action requires one of these roles: ${allowedRoles.join(", ")}`,
      );
    }

    next();
  };
}

/**
 * Require admin role (legacy — prefer requirePermission('crm:admin'))
 */
export const requireAdmin = requireRole(USER_ROLES.ADMIN);

/**
 * Require manager or admin role (legacy — prefer requirePermission)
 */
export const requireManager = requireRole(USER_ROLES.ADMIN, USER_ROLES.MANAGER);

/**
 * Require any authenticated user
 */
export const requireAuth = requireRole(
  USER_ROLES.ADMIN,
  USER_ROLES.MANAGER,
  USER_ROLES.EMPLOYEE,
);

/**
 * Permission-based guard (new RBAC system).
 *
 * Checks the user's resolved permissions from the RBAC system.
 * Users with `crm:admin` always pass regardless of what perm is checked.
 *
 * Usage:
 *   router.post('/leads', requirePermission('leads:create'), handler)
 *   router.delete('/leads/:id', requirePermission('leads:delete'), handler)
 */
export function requirePermission(perm: string) {
  return (
    req: AuthenticatedRequest,
    _res: Response,
    next: NextFunction,
  ): void => {
    if (!req.user) {
      throw new ApiError(ERROR_CODES.AUTH_TOKEN_MISSING);
    }

    const { permissions } = req.user;

    // crm:admin is a global superuser — always passes
    if (permissions.includes("crm:admin")) {
      return next();
    }

    if (!permissions.includes(perm)) {
      console.warn(
        `[RBAC] Permission denied — user ${req.user.id} is missing '${perm}'`,
      );
      throw new ApiError(
        ERROR_CODES.FORBIDDEN,
        `Missing permission: ${perm}`,
      );
    }

    next();
  };
}

/**
 * Require ALL of the listed permissions (AND gate).
 */
export function requirePermissions(perms: string[]) {
  return (
    req: AuthenticatedRequest,
    _res: Response,
    next: NextFunction,
  ): void => {
    if (!req.user) {
      throw new ApiError(ERROR_CODES.AUTH_TOKEN_MISSING);
    }

    const { permissions } = req.user;

    if (permissions.includes("crm:admin")) {
      return next();
    }

    const missing = perms.filter((p) => !permissions.includes(p));
    if (missing.length > 0) {
      throw new ApiError(
        ERROR_CODES.FORBIDDEN,
        `Missing permissions: ${missing.join(", ")}`,
      );
    }

    next();
  };
}

/**
 * Require ANY of the listed permissions (OR gate).
 */
export function requireAnyPermission(perms: string[]) {
  return (
    req: AuthenticatedRequest,
    _res: Response,
    next: NextFunction,
  ): void => {
    if (!req.user) {
      throw new ApiError(ERROR_CODES.AUTH_TOKEN_MISSING);
    }

    const { permissions } = req.user;

    if (permissions.includes("crm:admin")) {
      return next();
    }

    const hasAny = perms.some((p) => permissions.includes(p));
    if (!hasAny) {
      throw new ApiError(
        ERROR_CODES.FORBIDDEN,
        `Requires at least one of: ${perms.join(", ")}`,
      );
    }

    next();
  };
}

/**
 * Check if user can access a specific resource
 * - Admin: can access everything
 * - Manager: can access own team's resources
 * - Employee: can access only own resources
 */
export function checkResourceAccess(
  resourceType: "lead" | "task" | "user" | "attendance",
) {
  return async (
    req: AuthenticatedRequest,
    _res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      if (!req.user) {
        throw new ApiError(ERROR_CODES.AUTH_TOKEN_MISSING);
      }

      // Admin has full access
      if (req.user.role === USER_ROLES.ADMIN) {
        return next();
      }

      const resourceId = req.params["id"];
      if (!resourceId) {
        return next();
      }

      // Get resource and check ownership/team
      let hasAccess = false;

      switch (resourceType) {
        case "lead": {
          const { data: lead } = await supabaseAdmin
            .from("leads")
            .select("assigned_to, created_by")
            .eq("id", resourceId)
            .single();

          if (lead) {
            if (req.user.role === USER_ROLES.MANAGER) {
              // Manager has access to ALL leads
              hasAccess = true;
            } else {
              // Employee can only access assigned or created leads
              hasAccess =
                lead.assigned_to === req.user.id ||
                lead.created_by === req.user.id;
            }
          }
          break;
        }

        case "task": {
          const { data: task } = await supabaseAdmin
            .from("tasks")
            .select("assigned_to, assigned_by")
            .eq("id", resourceId)
            .single();

          if (task) {
            if (req.user.role === USER_ROLES.MANAGER) {
              const { data: teamMembers } = await supabaseAdmin
                .from("users")
                .select("id")
                .eq("team_id", req.user.teamId);

              const teamMemberIds = teamMembers?.map((m) => m.id) || [];
              hasAccess =
                task.assigned_to === req.user.id ||
                task.assigned_by === req.user.id ||
                teamMemberIds.includes(task.assigned_to);
            } else {
              hasAccess =
                task.assigned_to === req.user.id ||
                task.assigned_by === req.user.id;
            }
          }
          break;
        }

        case "user": {
          if (req.user.role === USER_ROLES.MANAGER) {
            const { data: targetUser } = await supabaseAdmin
              .from("users")
              .select("team_id")
              .eq("id", resourceId)
              .single();

            hasAccess =
              resourceId === req.user.id ||
              targetUser?.team_id === req.user.teamId;
          } else {
            hasAccess = resourceId === req.user.id;
          }
          break;
        }

        case "attendance": {
          const { data: attendance } = await supabaseAdmin
            .from("attendance")
            .select("user_id")
            .eq("id", resourceId)
            .single();

          if (attendance) {
            if (req.user.role === USER_ROLES.MANAGER) {
              const { data: targetUser } = await supabaseAdmin
                .from("users")
                .select("team_id")
                .eq("id", attendance.user_id)
                .single();

              hasAccess =
                attendance.user_id === req.user.id ||
                targetUser?.team_id === req.user.teamId;
            } else {
              hasAccess = attendance.user_id === req.user.id;
            }
          }
          break;
        }
      }

      if (!hasAccess) {
        throw new ApiError(ERROR_CODES.RESOURCE_ACCESS_DENIED);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Check if user can edit lead info
 */
export function checkLeadEditAccess() {
  return async (
    req: AuthenticatedRequest,
    _res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      if (!req.user) {
        throw new ApiError(ERROR_CODES.AUTH_TOKEN_MISSING);
      }

      // All authenticated users may call PUT /leads/:id
      // (full-form access is enforced on the frontend for non-admins)
      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Check if user can perform action on their own team
 */
export async function isTeamMember(
  userId: string,
  teamId: string | null,
): Promise<boolean> {
  if (!teamId) return false;

  const { data: user } = await supabaseAdmin
    .from("users")
    .select("team_id")
    .eq("id", userId)
    .single();

  return user?.team_id === teamId;
}

/**
 * Get team member IDs for a manager
 */
export async function getTeamMemberIds(
  teamId: string | null,
): Promise<string[]> {
  if (!teamId) return [];

  const { data: members } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("team_id", teamId);

  return members?.map((m) => m.id) || [];
}

/**
 * Exclude users from specific departments from accessing a route
 */
export function excludeDepartment(...departmentSlugs: string[]) {
  return async (
    req: AuthenticatedRequest,
    _res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      if (!req.user) {
        throw new ApiError(ERROR_CODES.AUTH_TOKEN_MISSING);
      }

      // Admins always have access
      if (req.user.role === USER_ROLES.ADMIN) {
        return next();
      }

      // Get user's department slug
      const { data: userData } = await supabaseAdmin
        .from("users")
        .select("team_id")
        .eq("id", req.user.id)
        .single();

      if (userData?.team_id) {
        const { data: teamData } = await supabaseAdmin
          .from("teams")
          .select("department_id")
          .eq("id", userData.team_id)
          .single();

        if (teamData?.department_id) {
          const { data: deptData } = await supabaseAdmin
            .from("departments")
            .select("slug")
            .eq("id", teamData.department_id)
            .single();

          if (deptData && departmentSlugs.includes(deptData.slug)) {
            throw new ApiError(
              ERROR_CODES.FORBIDDEN,
              "Access to this resource is not available for your department",
            );
          }
        }
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Require HR department access
 */
export function requireHRAccess() {
  return async (
    req: AuthenticatedRequest,
    _res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      if (!req.user) {
        throw new ApiError(ERROR_CODES.AUTH_TOKEN_MISSING);
      }

      // Admins always have access to HR
      if (req.user.role === USER_ROLES.ADMIN) {
        return next();
      }

      // Check via RBAC permission
      if (req.user.permissions.includes("hr:manage") || req.user.permissions.includes("hr:view")) {
        return next();
      }

      // Check if user belongs to HR department (legacy fallback)
      const { data: userData } = await supabaseAdmin
        .from("users")
        .select("team_id")
        .eq("id", req.user.id)
        .single();

      if (userData?.team_id) {
        const { data: teamData } = await supabaseAdmin
          .from("teams")
          .select("department_id")
          .eq("id", userData.team_id)
          .single();

        if (teamData?.department_id) {
          const { data: deptData } = await supabaseAdmin
            .from("departments")
            .select("slug")
            .eq("id", teamData.department_id)
            .single();

          if (deptData?.slug === "hr") {
            return next();
          }
        }
      }

      throw new ApiError(
        ERROR_CODES.FORBIDDEN,
        "Access restricted to HR department and administrators only",
      );
    } catch (error) {
      next(error);
    }
  };
}
