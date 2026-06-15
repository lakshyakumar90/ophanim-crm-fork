import { Router, type Router as RouterType, type RequestHandler } from "express";
import { authenticate } from "../../../middleware/auth.middleware.js";
import {
  requireAdmin,
  requireManager,
} from "../../../middleware/authorization.middleware.js";
import { asyncHandler } from "../../../middleware/error.middleware.js";
import * as dashboardController from "./dashboard.controller.js";

const router: RouterType = Router();

router.use(authenticate as any);

router.get("/", asyncHandler(dashboardController.getDashboard) as RequestHandler);

router.get(
  "/admin",
  requireAdmin as any,
  asyncHandler(dashboardController.getAdminDashboard) as RequestHandler,
);

router.get(
  "/lead-analytics",
  asyncHandler(dashboardController.getLeadAnalytics) as RequestHandler,
);

router.get(
  "/user-performance/:userId",
  requireManager as any,
  asyncHandler(dashboardController.getUserPerformance) as RequestHandler,
);

router.get(
  "/my-performance",
  asyncHandler(dashboardController.getMyPerformance) as RequestHandler,
);

router.get(
  "/user-wise-analytics",
  asyncHandler(dashboardController.getUserWiseAnalytics) as RequestHandler,
);

router.get(
  "/enhanced",
  requireAdmin as any,
  asyncHandler(dashboardController.getEnhancedDashboard) as RequestHandler,
);

export default router;
