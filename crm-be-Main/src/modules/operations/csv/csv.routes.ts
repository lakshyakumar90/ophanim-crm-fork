import { Router, type RequestHandler, type Router as RouterType } from "express";
import { authenticate } from "../../../middleware/auth.middleware.js";
import { requirePermission } from "../../../middleware/authorization.middleware.js";
import {
  exportRateLimiter,
  bulkOperationRateLimiter,
} from "../../../middleware/rate-limiter.middleware.js";
import { asyncHandler } from "../../../middleware/error.middleware.js";
import * as csvController from "./csv.controller.js";

const router: RouterType = Router();

router.use(authenticate as any);

router.get("/leads/template", asyncHandler(csvController.getLeadsCsvTemplate) as RequestHandler);

router.post(
  "/leads/import",
  requirePermission("leads:import") as any,
  bulkOperationRateLimiter,
  asyncHandler(csvController.importLeads) as RequestHandler,
);

router.post(
  "/leads/preview-check",
  requirePermission("leads:import") as any,
  bulkOperationRateLimiter,
  asyncHandler(csvController.previewLeadsImport) as RequestHandler,
);

router.get("/leads/duplicates", asyncHandler(csvController.getDuplicateLeads) as RequestHandler);

router.get(
  "/leads/export",
  requirePermission("leads:export") as any,
  exportRateLimiter,
  asyncHandler(csvController.exportLeads) as RequestHandler,
);

export default router;
