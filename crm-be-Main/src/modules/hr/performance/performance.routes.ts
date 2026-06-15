import { Router, type Router as RouterType, type RequestHandler } from "express";
import { authenticate } from "../../../middleware/auth.middleware.js";
import {
  requirePermission,
  requireAnyPermission,
} from "../../../middleware/authorization.middleware.js";
import {
  validateBody,
  validateParams,
  validateQuery,
} from "../../../middleware/validation.middleware.js";
import { asyncHandler } from "../../../middleware/error.middleware.js";
import {
  createReviewCycleSchema,
  updateReviewCycleSchema,
  setGoalsSchema,
  selfAssessmentSchema,
  managerReviewSchema,
  peerFeedbackSchema,
  calibrationSchema,
  directorApprovalSchema,
  reviewAcknowledgementSchema,
  performanceCycleIdParamSchema,
  performanceReviewIdParamSchema,
  performanceCycleReviewsParamSchema,
  performanceCyclesQuerySchema,
  performanceAnalyticsQuerySchema,
} from "./performance.validator.js";
import * as performanceController from "./performance.controller.js";

const router: RouterType = Router();

router.use(authenticate as any);

router.get(
  "/cycles",
  requireAnyPermission([
    "performance:view",
    "performance:manage",
    "performance:review",
  ]) as any,
  validateQuery(performanceCyclesQuerySchema),
  asyncHandler(performanceController.getReviewCycles) as RequestHandler,
);

router.get(
  "/cycles/:id",
  requireAnyPermission([
    "performance:view",
    "performance:manage",
    "performance:review",
  ]) as any,
  validateParams(performanceCycleIdParamSchema),
  asyncHandler(performanceController.getReviewCycleById) as RequestHandler,
);

router.post(
  "/cycles",
  requirePermission("performance:manage") as any,
  validateBody(createReviewCycleSchema),
  asyncHandler(performanceController.createReviewCycle) as RequestHandler,
);

router.put(
  "/cycles/:id",
  requirePermission("performance:manage") as any,
  validateParams(performanceCycleIdParamSchema),
  validateBody(updateReviewCycleSchema),
  asyncHandler(performanceController.updateReviewCycle) as RequestHandler,
);

router.delete(
  "/cycles/:id",
  requirePermission("performance:manage") as any,
  validateParams(performanceCycleIdParamSchema),
  asyncHandler(performanceController.deleteReviewCycle) as RequestHandler,
);

router.get(
  "/cycles/:cycleId/reviews",
  requireAnyPermission([
    "performance:manage",
    "performance:view",
    "performance:review",
  ]) as any,
  validateParams(performanceCycleReviewsParamSchema),
  asyncHandler(performanceController.getCycleReviews) as RequestHandler,
);

router.get(
  "/reviews/me",
  asyncHandler(performanceController.getMyReviews) as RequestHandler,
);

router.get(
  "/peer-feedback/targets",
  asyncHandler(performanceController.getPeerFeedbackTargets) as RequestHandler,
);

router.get(
  "/reminder-counts",
  asyncHandler(performanceController.getReminderCounts) as RequestHandler,
);

router.get(
  "/reviews/:id",
  requireAnyPermission([
    "performance:view",
    "performance:manage",
    "performance:review",
  ]) as any,
  validateParams(performanceReviewIdParamSchema),
  asyncHandler(performanceController.getReviewById) as RequestHandler,
);

router.get(
  "/reviews/:id/peer-feedback-submissions",
  requireAnyPermission([
    "performance:view",
    "performance:manage",
    "hr:view",
    "hr:manage",
  ]) as any,
  validateParams(performanceReviewIdParamSchema),
  asyncHandler(performanceController.getPeerFeedbackSubmissions) as RequestHandler,
);

router.post(
  "/reviews/:id/goals",
  validateParams(performanceReviewIdParamSchema),
  validateBody(setGoalsSchema),
  asyncHandler(performanceController.setGoals) as RequestHandler,
);

router.post(
  "/reviews/:id/self-assessment",
  validateParams(performanceReviewIdParamSchema),
  validateBody(selfAssessmentSchema),
  asyncHandler(performanceController.submitSelfAssessment) as RequestHandler,
);

router.post(
  "/reviews/:id/manager-review",
  validateParams(performanceReviewIdParamSchema),
  validateBody(managerReviewSchema),
  asyncHandler(performanceController.submitManagerReview) as RequestHandler,
);

router.post(
  "/reviews/:id/peer-feedback",
  validateParams(performanceReviewIdParamSchema),
  validateBody(peerFeedbackSchema),
  asyncHandler(performanceController.submitPeerFeedback) as RequestHandler,
);

router.post(
  "/cycles/:id/calibrate",
  requirePermission("performance:manage") as any,
  validateParams(performanceCycleIdParamSchema),
  validateBody(calibrationSchema),
  asyncHandler(performanceController.runCalibration) as RequestHandler,
);

router.post(
  "/cycles/:id/approve",
  requirePermission("performance:manage") as any,
  validateParams(performanceCycleIdParamSchema),
  validateBody(directorApprovalSchema),
  asyncHandler(performanceController.approveCycleResults) as RequestHandler,
);

router.post(
  "/cycles/:id/release",
  requirePermission("performance:manage") as any,
  validateParams(performanceCycleIdParamSchema),
  asyncHandler(performanceController.releaseResults) as RequestHandler,
);

router.post(
  "/reviews/:id/acknowledge",
  validateParams(performanceReviewIdParamSchema),
  validateBody(reviewAcknowledgementSchema),
  asyncHandler(performanceController.acknowledgeReview) as RequestHandler,
);

router.get(
  "/analytics",
  requireAnyPermission(["performance:view", "performance:manage"]) as any,
  validateQuery(performanceAnalyticsQuerySchema),
  asyncHandler(performanceController.getPerformanceAnalytics) as RequestHandler,
);

export default router;
