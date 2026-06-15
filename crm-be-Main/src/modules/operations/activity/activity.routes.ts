import {
  Router,
  type RequestHandler,
  type Router as RouterType,
} from "express";
import { authenticate } from "../../../middleware/auth.middleware.js";
import { asyncHandler } from "../../../middleware/error.middleware.js";
import * as activityController from "./activity.controller.js";

const router: RouterType = Router();

router.get(
  "/",
  authenticate as RequestHandler,
  asyncHandler(activityController.getActivityLogs) as RequestHandler,
);

router.get(
  "/leads",
  authenticate as RequestHandler,
  asyncHandler(activityController.getLeadActivities) as RequestHandler,
);

router.get(
  "/stats",
  authenticate as RequestHandler,
  asyncHandler(activityController.getActivityStats) as RequestHandler,
);

router.get(
  "/analytics",
  authenticate as RequestHandler,
  asyncHandler(activityController.getActivityAnalytics) as RequestHandler,
);

export default router;
