import { Router, type RequestHandler, type Router as RouterType } from "express";
import { authenticate } from "../../../middleware/auth.middleware.js";
import { requireAdmin } from "../../../middleware/authorization.middleware.js";
import {
  validateBody,
  validateParams,
} from "../../../middleware/validation.middleware.js";
import { asyncHandler } from "../../../middleware/error.middleware.js";
import { uuidParamSchema } from "../users/users.validator.js";
import {
  createDepartmentSchema,
  updateDepartmentSchema,
  departmentSlugParamSchema,
} from "./departments.validator.js";
import * as departmentsController from "./departments.controller.js";

const router: RouterType = Router();

router.use(authenticate as any);

router.get("/", asyncHandler(departmentsController.getDepartments) as RequestHandler);

router.get(
  "/slug/:slug",
  validateParams(departmentSlugParamSchema),
  asyncHandler(departmentsController.getDepartmentBySlug) as RequestHandler,
);

router.get(
  "/:id",
  validateParams(uuidParamSchema),
  asyncHandler(departmentsController.getDepartmentById) as RequestHandler,
);

router.post(
  "/",
  requireAdmin as any,
  validateBody(createDepartmentSchema),
  asyncHandler(departmentsController.createDepartment) as RequestHandler,
);

router.put(
  "/:id",
  requireAdmin as any,
  validateParams(uuidParamSchema),
  validateBody(updateDepartmentSchema),
  asyncHandler(departmentsController.updateDepartment) as RequestHandler,
);

export default router;
