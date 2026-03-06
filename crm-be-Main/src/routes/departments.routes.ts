import { Router, type Router as RouterType } from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import { requireAdmin } from "../middleware/authorization.middleware.js";
import {
  validateBody,
  validateParams,
} from "../middleware/validation.middleware.js";
import { asyncHandler } from "../middleware/error.middleware.js";
import { sendSuccess, sendCreated, ApiError } from "../utils/responses.js";
import * as departmentsService from "../services/departments.service.js";
import { ERROR_CODES } from "../utils/error-codes.js";
import { uuidParamSchema } from "../validators/users.validator.js";
import {
  createDepartmentSchema,
  updateDepartmentSchema,
  departmentSlugParamSchema,
} from "../validators/departments.validator.js";
import type { Request, Response } from "express";
import type { AuthenticatedRequest } from "../types/api.types.js";

const router: RouterType = Router();

// All routes require authentication
router.use(authenticate as any);

/**
 * GET /departments
 * Get all departments
 */
router.get(
  "/",
  asyncHandler(async (_req: Request, res: Response) => {
    const departments = await departmentsService.getDepartments();
    sendSuccess(res, departments);
  }),
);

/**
 * GET /departments/slug/:slug
 * Get department by slug
 */
router.get(
  "/slug/:slug",
  validateParams(departmentSlugParamSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { slug } = req.params;
    const department = await departmentsService.getDepartmentBySlug(
      slug as string,
    );

    if (!department) {
      throw new ApiError(ERROR_CODES.NOT_FOUND, "Department not found");
    }

    sendSuccess(res, department);
  }),
);

/**
 * GET /departments/:id
 * Get department by ID
 */
router.get(
  "/:id",
  validateParams(uuidParamSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const department = await departmentsService.getDepartmentById(id as string);

    if (!department) {
      throw new ApiError(ERROR_CODES.NOT_FOUND, "Department not found");
    }

    sendSuccess(res, department);
  }),
);

/**
 * POST /departments
 * Create department (Admin only)
 */
router.post(
  "/",
  requireAdmin as any,
  validateBody(createDepartmentSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { name, slug, description, icon, color } = req.body;

    const department = await departmentsService.createDepartment({
      name,
      slug,
      description,
      icon,
      color,
    });

    sendCreated(res, department);
  }),
);

/**
 * PUT /departments/:id
 * Update department (Admin only)
 */
router.put(
  "/:id",
  requireAdmin as any,
  validateParams(uuidParamSchema),
  validateBody(updateDepartmentSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { name, description, icon, color, isActive } = req.body;

    const department = await departmentsService.updateDepartment(id as string, {
      name,
      description,
      icon,
      color,
      isActive,
    });

    sendSuccess(res, department);
  }),
);

export default router;
