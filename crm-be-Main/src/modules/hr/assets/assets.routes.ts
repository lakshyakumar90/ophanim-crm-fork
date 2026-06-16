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
  assetIdParamSchema,
  listAssetsQuerySchema,
  createAssetSchema,
  updateAssetSchema,
  assignAssetSchema,
  listAssignmentsQuerySchema,
} from "./assets.validator.js";
import * as assetsController from "./assets.controller.js";

const router: RouterType = Router();

router.use(authenticate as any);

router.get(
  "/",
  requireAnyPermission(["assets:view", "assets:manage", "hr:manage"]) as any,
  validateQuery(listAssetsQuerySchema),
  asyncHandler(assetsController.listAssets) as RequestHandler,
);

router.get(
  "/assignments",
  requireAnyPermission(["assets:view", "assets:manage", "hr:manage"]) as any,
  validateQuery(listAssignmentsQuerySchema),
  asyncHandler(assetsController.listAssignments) as RequestHandler,
);

router.get(
  "/:id",
  requireAnyPermission(["assets:view", "assets:manage", "hr:manage"]) as any,
  validateParams(assetIdParamSchema),
  asyncHandler(assetsController.getAssetById) as RequestHandler,
);

router.post(
  "/",
  requirePermission("assets:manage") as any,
  validateBody(createAssetSchema),
  asyncHandler(assetsController.createAsset) as RequestHandler,
);

router.put(
  "/:id",
  requirePermission("assets:manage") as any,
  validateParams(assetIdParamSchema),
  validateBody(updateAssetSchema),
  asyncHandler(assetsController.updateAsset) as RequestHandler,
);

router.delete(
  "/:id",
  requirePermission("assets:manage") as any,
  validateParams(assetIdParamSchema),
  asyncHandler(assetsController.deleteAsset) as RequestHandler,
);

router.post(
  "/:id/assign",
  requirePermission("assets:manage") as any,
  validateParams(assetIdParamSchema),
  validateBody(assignAssetSchema),
  asyncHandler(assetsController.assignAsset) as RequestHandler,
);

router.post(
  "/:id/return",
  requirePermission("assets:manage") as any,
  validateParams(assetIdParamSchema),
  asyncHandler(assetsController.returnAsset) as RequestHandler,
);

export default router;
