import { Router, type Router as RouterType } from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import { requireAdmin } from "../middleware/authorization.middleware.js";
import { asyncHandler } from "../middleware/error.middleware.js";
import { sendSuccess, sendCreated } from "../utils/responses.js";
import * as departmentsService from "../services/departments.service.js";
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
  asyncHandler(async (req: Request, res: Response) => {
    const { slug } = req.params;
    const department = await departmentsService.getDepartmentBySlug(
      slug as string,
    );

    if (!department) {
      res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "Department not found" },
      });
      return;
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
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const department = await departmentsService.getDepartmentById(id as string);

    if (!department) {
      res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "Department not found" },
      });
      return;
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
  asyncHandler(async (req: Request, res: Response) => {
    const { name, slug, description, icon, color } = req.body;

    if (!name || !slug) {
      res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Name and slug are required",
        },
      });
      return;
    }

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
