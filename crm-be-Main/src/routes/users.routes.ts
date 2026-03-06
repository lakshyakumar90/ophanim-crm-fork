import { Router, type Router as RouterType } from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import {
  requireAdmin,
  requireManager,
  checkResourceAccess,
} from "../middleware/authorization.middleware.js";
import {
  validateBody,
  validateQuery,
  validateParams,
} from "../middleware/validation.middleware.js";
import { asyncHandler } from "../middleware/error.middleware.js";
import {
  createUserSchema,
  updateUserSchema,
  updateProfileSchema,
  userListQuerySchema,
  uuidParamSchema,
  EMPLOYEE_JOB_TITLES,
  MANAGER_JOB_TITLES,
  JOB_TITLES,
} from "../validators/users.validator.js";
import { adminResetPasswordSchema } from "../validators/auth.validator.js";
import * as usersService from "../services/users.service.js";
import {
  ApiError,
  sendSuccess,
  sendPaginated,
  sendNoContent,
} from "../utils/responses.js";
import { ERROR_CODES } from "../utils/error-codes.js";
import type { Request, Response } from "express";
import type { AuthenticatedRequest } from "../types/api.types.js";
import multer from "multer";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

const router: RouterType = Router();

// All routes require authentication
router.use(authenticate as any);

/**
 * GET /users
 * Get paginated list of users
 */
router.get(
  "/",
  requireManager as any,
  validateQuery(userListQuerySchema),
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as unknown as AuthenticatedRequest;
    const result = await usersService.getUsers(req.query as any, authReq.user);
    sendPaginated(res, result.data, result.meta);
  }),
);

/**
 * GET /users/me
 * Get current user's profile
 */
router.get(
  "/me",
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as unknown as AuthenticatedRequest;
    const user = await usersService.getUserById(authReq.user.id);
    sendSuccess(res, user);
  }),
);

/**
 * PUT /users/me
 * Update current user's profile
 */
router.put(
  "/me",
  validateBody(updateProfileSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as unknown as AuthenticatedRequest;
    const user = await usersService.updateProfile(authReq.user.id, req.body);
    sendSuccess(res, user);
  }),
);

/**
 * PATCH /users/me/preferences
 * Update current user's preferences
 */
router.patch(
  "/me/preferences",
  validateBody(updateProfileSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as unknown as AuthenticatedRequest;
    const user = await usersService.updateProfile(authReq.user.id, req.body);
    sendSuccess(res, user);
  }),
);

/**
 * POST /users/me/avatar
 * Upload avatar
 */
router.post(
  "/me/avatar",
  upload.single("file"),
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as unknown as AuthenticatedRequest;
    const file = (req as any).file;
    if (!file) {
      throw new ApiError(ERROR_CODES.MISSING_REQUIRED_FIELD, "No file uploaded");
    }

    // Upload to Supabase Storage
    const fileExt = file.originalname.split(".").pop();
    const fileName = `${authReq.user.id}-${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { data: uploadData, error: uploadError } =
      await usersService.supabaseAdmin.storage
        .from("avatars")
        .upload(filePath, file.buffer, {
          contentType: file.mimetype,
          upsert: true,
        });

    if (uploadError) {
      throw new ApiError(
        ERROR_CODES.EXTERNAL_SERVICE_ERROR,
        `Failed to upload avatar: ${uploadError.message}`,
      );
    }

    // Get Public URL
    const {
      data: { publicUrl },
    } = usersService.supabaseAdmin.storage
      .from("avatars")
      .getPublicUrl(filePath);

    // Update user profile
    const user = await usersService.updateProfile(authReq.user.id, {
      avatarUrl: publicUrl,
    });

    sendSuccess(res, user);
  }),
);

/**
 * GET /users/team
 * Get current user's team members (for managers)
 */
router.get(
  "/team",
  requireManager as any,
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as unknown as AuthenticatedRequest;
    if (!authReq.user.teamId) {
      sendSuccess(res, []);
      return;
    }
    const members = await usersService.getTeamMembers(authReq.user.teamId);
    sendSuccess(res, members);
  }),
);

/**
 * GET /users/job-titles
 * Get available job titles categorized by role type
 * Supports filtering by department and roleType
 */
router.get(
  "/job-titles",
  asyncHandler(async (req: Request, res: Response) => {
    const roleType = req.query["roleType"] as string | undefined;
    const departmentSlug = req.query["department"] as string | undefined;

    // Department-based job titles mapping
    const DEPARTMENT_JOB_TITLES: Record<
      string,
      { employee: string[]; manager: string[] }
    > = {
      sales: {
        employee: ["sales_employee"],
        manager: ["sales_manager"],
      },
      hr: {
        employee: ["hr_employee"],
        manager: ["hr_manager"],
      },
      finance: {
        employee: ["finance_employee"],
        manager: ["finance_manager"],
      },
      "project-management": {
        employee: ["developer", "designer", "content_writer", "seo_specialist"],
        manager: ["project_manager"],
      },
    };

    const formatTitle = (title: string) => ({
      value: title,
      label: title.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    });

    // If department is specified, return department-specific titles
    if (departmentSlug) {
      const deptConfig = DEPARTMENT_JOB_TITLES[departmentSlug];
      if (!deptConfig) {
        sendSuccess(res, { employee: [], manager: [], all: [] });
        return;
      }

      const employeeTitles = deptConfig.employee.map(formatTitle);
      const managerTitles = deptConfig.manager.map(formatTitle);

      if (roleType === "employee") {
        sendSuccess(res, {
          employee: employeeTitles,
          manager: [],
          all: employeeTitles,
        });
      } else if (roleType === "manager") {
        sendSuccess(res, {
          employee: [],
          manager: managerTitles,
          all: managerTitles,
        });
      } else {
        sendSuccess(res, {
          employee: employeeTitles,
          manager: managerTitles,
          all: [...employeeTitles, ...managerTitles],
        });
      }
      return;
    }

    // Default: return all job titles by role type
    let titles: readonly string[];
    if (roleType === "employee") {
      titles = EMPLOYEE_JOB_TITLES;
    } else if (roleType === "manager") {
      titles = MANAGER_JOB_TITLES;
    } else {
      titles = JOB_TITLES;
    }

    const formattedTitles = titles.map(formatTitle);

    sendSuccess(res, {
      employee: EMPLOYEE_JOB_TITLES.map(formatTitle),
      manager: MANAGER_JOB_TITLES.map(formatTitle),
      all: formattedTitles,
      // Include department mapping for frontend
      byDepartment: DEPARTMENT_JOB_TITLES,
    });
  }),
);

/**
 * GET /users/project-managers
 * Get users who can be project managers (admin, manager, or project_manager job title)
 */
router.get(
  "/project-managers",
  asyncHandler(async (req: Request, res: Response) => {
    const managers = await usersService.getProjectManagers();
    sendSuccess(res, managers);
  }),
);

/**
 * GET /users/by-job-title
 * Get users by job title(s) for project team assignment
 * Query param: titles (comma-separated list of job titles)
 */
router.get(
  "/by-job-title",
  asyncHandler(async (req: Request, res: Response) => {
    const titlesParam = req.query["titles"] as string;
    if (!titlesParam) {
      sendSuccess(res, []);
      return;
    }
    const titles = titlesParam.split(",").map((t) => t.trim());
    const users = await usersService.getUsersByJobTitles(titles);
    sendSuccess(res, users);
  }),
);

/**
 * GET /users/:id
 * Get user by ID
 */
router.get(
  "/:id",
  requireManager as any,
  validateParams(uuidParamSchema),
  checkResourceAccess("user") as any,
  asyncHandler(async (req: Request, res: Response) => {
    const user = await usersService.getUserById(req.params["id"] as string);
    sendSuccess(res, user);
  }),
);

/**
 * PUT /users/:id
 * Update user by ID (admin only)
 */
router.put(
  "/:id",
  requireAdmin as any,
  validateParams(uuidParamSchema),
  validateBody(updateUserSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const user = await usersService.updateUser(
      req.params["id"] as string,
      req.body,
    );
    sendSuccess(res, user);
  }),
);

/**
 * PATCH /users/:id/activate
 * Activate user (admin only)
 */
router.patch(
  "/:id/activate",
  requireAdmin as any,
  validateParams(uuidParamSchema),
  asyncHandler(async (req: Request, res: Response) => {
    await usersService.activateUser(req.params["id"] as string);
    sendSuccess(res, { message: "User activated successfully" });
  }),
);

/**
 * PATCH /users/:id/deactivate
 * Deactivate user (admin only)
 */
router.patch(
  "/:id/deactivate",
  requireAdmin as any,
  validateParams(uuidParamSchema),
  asyncHandler(async (req: Request, res: Response) => {
    await usersService.deactivateUser(req.params["id"] as string);
    sendSuccess(res, { message: "User deactivated successfully" });
  }),
);

/**
 * PATCH /users/:id/password
 * Reset user password (admin only)
 */
router.patch(
  "/:id/password",
  requireAdmin as any,
  validateParams(uuidParamSchema),
  validateBody(adminResetPasswordSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { newPassword } = req.body;
    // Import auth service dynamically to avoid circular deps
    const authService = await import("../services/auth.service.js");
    await authService.adminResetPassword(
      req.params["id"] as string,
      newPassword,
    );
    sendSuccess(res, { message: "Password reset successfully" });
  }),
);

/**
 * GET /users/teams/:teamId
 * Get users by team ID
 */
router.get(
  "/teams/:teamId",
  requireManager as any,
  asyncHandler(async (req: Request, res: Response) => {
    const members = await usersService.getTeamMembers(
      req.params["teamId"] as string,
    );
    sendSuccess(res, members);
  }),
);

export default router;
