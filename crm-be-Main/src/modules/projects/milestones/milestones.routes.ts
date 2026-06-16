import { Router, type RequestHandler, type Router as RouterType } from "express";
import { authenticate } from "../../../middleware/auth.middleware.js";
import {
  requirePermission,
  excludeDepartment,
} from "../../../middleware/authorization.middleware.js";
import { asyncHandler } from "../../../middleware/error.middleware.js";
import * as milestonesController from "./milestones.controller.js";

const router: RouterType = Router({ mergeParams: true });

const viewMilestones = requirePermission("milestones:view") as RequestHandler;
const manageMilestones = requirePermission("milestones:manage") as RequestHandler;

router.use(authenticate as any);
router.use(excludeDepartment("sales", "finance") as any);

router.get("/", viewMilestones, asyncHandler(milestonesController.list) as RequestHandler);
router.post("/", manageMilestones, asyncHandler(milestonesController.create) as RequestHandler);
router.get(
  "/:milestoneId",
  viewMilestones,
  asyncHandler(milestonesController.getById) as RequestHandler,
);
router.put(
  "/:milestoneId",
  manageMilestones,
  asyncHandler(milestonesController.update) as RequestHandler,
);
router.delete(
  "/:milestoneId",
  manageMilestones,
  asyncHandler(milestonesController.remove) as RequestHandler,
);

router.get(
  "/:milestoneId/deliverables",
  viewMilestones,
  asyncHandler(milestonesController.listDeliverables) as RequestHandler,
);
router.post(
  "/:milestoneId/deliverables",
  manageMilestones,
  asyncHandler(milestonesController.createDeliverable) as RequestHandler,
);
router.put(
  "/:milestoneId/deliverables/:deliverableId",
  manageMilestones,
  asyncHandler(milestonesController.updateDeliverable) as RequestHandler,
);
router.delete(
  "/:milestoneId/deliverables/:deliverableId",
  manageMilestones,
  asyncHandler(milestonesController.deleteDeliverable) as RequestHandler,
);

export default router;
