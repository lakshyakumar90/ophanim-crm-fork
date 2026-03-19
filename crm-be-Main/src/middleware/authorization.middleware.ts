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
              .select("team_id, department_id")
              .eq("id", resourceId)
              .single();

            let targetDepartmentId = targetUser?.department_id;
            if (targetUser?.team_id && !targetDepartmentId) {
              const { data: teamData } = await supabaseAdmin
                .from("teams")
                .select("department_id")
                .eq("id", targetUser.team_id)
                .single();
              targetDepartmentId = teamData?.department_id;
            }

            hasAccess =
              resourceId === req.user.id ||
              (targetDepartmentId && targetDepartmentId === req.user.departmentId);

            // If not in the same department, check if they manage a project the user is assigned to
            if (!hasAccess) {
              const { data: projectMember } = await supabaseAdmin
                .from("project_members")
                .select(`project_id, projects!inner(manager_id)`)
                .eq("user_id", resourceId)
                .eq("projects.manager_id", req.user.id)
                .limit(1);

              if (projectMember && projectMember.length > 0) {
                hasAccess = true;
              }
            }
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
 * Exclude users from specific departments from accessing a route.
 *
 * Cross-department bypass rules (applied before department check):
 * 1. Users with `crm:admin` permission always pass.
 * 2. Users with any explicit `projects:*` permission pass (RBAC-assigned PMs).
 * 3. Users who are the `manager_id` on at least one project pass —
 *    this covers the case of a Sales Manager who is also a Project Manager.
 * 4. Users with a `project_manager` role in `project_members` pass.
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
      if (req.user.role === USER_ROLES.ADMIN || req.user.permissions.includes("crm:admin")) {
        return next();
      }

      // RBAC: If the user has any explicit projects:* permission, allow through
      if (req.user.permissions.some(p => p.startsWith("projects:"))) {
        return next();
      }

      // Cross-department project participant check:
      // Allow if user is the manager_id on any project OR is a member (any role)
      // of any project — regardless of their primary department.
      // This covers Sales Managers assigned as developers, designers, etc. on a project.
      const [managerRes, memberRes] = await Promise.all([
        supabaseAdmin
          .from("projects")
          .select("id")
          .eq("manager_id", req.user.id)
          .limit(1),
        supabaseAdmin
          .from("project_members")
          .select("id")
          .eq("user_id", req.user.id)
          .limit(1),
      ]);

      const isProjectParticipant =
        (managerRes.data && managerRes.data.length > 0) ||
        (memberRes.data && memberRes.data.length > 0);

      if (isProjectParticipant) {
        return next();
      }

      // Resolve user's primary department slug
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
