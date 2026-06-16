import { Router, type RequestHandler, type Router as RouterType } from "express";
import { authenticate } from "../../../middleware/auth.middleware.js";
import {
  requireAnyPermission,
  excludeDepartment,
} from "../../../middleware/authorization.middleware.js";
import { asyncHandler } from "../../../middleware/error.middleware.js";
import * as timelineController from "./timeline.controller.js";

const router: RouterType = Router({ mergeParams: true });

const viewTimeline = requireAnyPermission([
  "milestones:view",
  "projects:view",
]) as RequestHandler;

router.use(authenticate as any);
router.use(excludeDepartment("sales", "finance") as any);

router.get("/", viewTimeline, asyncHandler(timelineController.getTimeline) as RequestHandler);

export default router;
