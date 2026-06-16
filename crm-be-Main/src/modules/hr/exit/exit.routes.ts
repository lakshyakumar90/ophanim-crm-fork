import { Router, type Router as RouterType, type RequestHandler } from "express";
import { authenticate } from "../../../middleware/auth.middleware.js";
import { requirePermission } from "../../../middleware/authorization.middleware.js";
import {
  validateBody,
  validateParams,
  validateQuery,
} from "../../../middleware/validation.middleware.js";
import { asyncHandler } from "../../../middleware/error.middleware.js";
import {
  exitChecklistIdParamSchema,
  exitChecklistUserParamSchema,
  listExitChecklistsQuerySchema,
  createExitChecklistSchema,
  updateExitChecklistSchema,
  completeExitItemSchema,
} from "./exit.validator.js";
import * as exitController from "./exit.controller.js";

const router: RouterType = Router();

router.use(authenticate as any);

router.get(
  "/",
  requirePermission("hr:manage") as any,
  validateQuery(listExitChecklistsQuerySchema),
  asyncHandler(exitController.listExitChecklists) as RequestHandler,
);

router.get(
  "/user/:userId",
  requirePermission("hr:manage") as any,
  validateParams(exitChecklistUserParamSchema),
  asyncHandler(exitController.getExitChecklistByUserId) as RequestHandler,
);

router.get(
  "/:id",
  requirePermission("hr:manage") as any,
  validateParams(exitChecklistIdParamSchema),
  asyncHandler(exitController.getExitChecklistById) as RequestHandler,
);

router.post(
  "/",
  requirePermission("hr:manage") as any,
  validateBody(createExitChecklistSchema),
  asyncHandler(exitController.createExitChecklist) as RequestHandler,
);

router.put(
  "/:id",
  requirePermission("hr:manage") as any,
  validateParams(exitChecklistIdParamSchema),
  validateBody(updateExitChecklistSchema),
  asyncHandler(exitController.updateExitChecklist) as RequestHandler,
);

router.post(
  "/:id/complete-item",
  requirePermission("hr:manage") as any,
  validateParams(exitChecklistIdParamSchema),
  validateBody(completeExitItemSchema),
  asyncHandler(exitController.completeExitItem) as RequestHandler,
);

export default router;
