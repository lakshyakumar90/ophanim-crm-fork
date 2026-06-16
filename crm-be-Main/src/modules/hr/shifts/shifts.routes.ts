import { Router, type Router as RouterType, type RequestHandler } from "express";
import { authenticate } from "../../../middleware/auth.middleware.js";
import { requireAnyPermission, requirePermission } from "../../../middleware/authorization.middleware.js";
import {
  validateBody,
  validateParams,
  validateQuery,
} from "../../../middleware/validation.middleware.js";
import { asyncHandler } from "../../../middleware/error.middleware.js";
import {
  shiftIdParamSchema,
  listShiftsQuerySchema,
  createShiftSchema,
  updateShiftSchema,
  bulkCreateShiftsSchema,
} from "./shifts.validator.js";
import * as shiftsController from "./shifts.controller.js";

const router: RouterType = Router();

router.use(authenticate as any);

router.get(
  "/me",
  asyncHandler(shiftsController.getMyShifts) as RequestHandler,
);

router.get(
  "/",
  requireAnyPermission(["hr:attendance_view", "hr:attendance_manage", "hr:manage"]) as any,
  validateQuery(listShiftsQuerySchema),
  asyncHandler(shiftsController.listShifts) as RequestHandler,
);

router.get(
  "/:id",
  requireAnyPermission(["hr:attendance_view", "hr:attendance_manage", "hr:manage"]) as any,
  validateParams(shiftIdParamSchema),
  asyncHandler(shiftsController.getShiftById) as RequestHandler,
);

router.post(
  "/bulk",
  requirePermission("hr:attendance_manage") as any,
  validateBody(bulkCreateShiftsSchema),
  asyncHandler(shiftsController.bulkCreateShifts) as RequestHandler,
);

router.post(
  "/",
  requirePermission("hr:attendance_manage") as any,
  validateBody(createShiftSchema),
  asyncHandler(shiftsController.createShift) as RequestHandler,
);

router.put(
  "/:id",
  requirePermission("hr:attendance_manage") as any,
  validateParams(shiftIdParamSchema),
  validateBody(updateShiftSchema),
  asyncHandler(shiftsController.updateShift) as RequestHandler,
);

router.delete(
  "/:id",
  requirePermission("hr:attendance_manage") as any,
  validateParams(shiftIdParamSchema),
  asyncHandler(shiftsController.deleteShift) as RequestHandler,
);

export default router;
