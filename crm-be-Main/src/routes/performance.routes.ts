import { Router, type Request, type Response } from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import { requirePermission, requireAnyPermission } from "../middleware/authorization.middleware.js";
import { validateBody, validateParams, validateQuery } from "../middleware/validation.middleware.js";
import { asyncHandler } from "../middleware/error.middleware.js";
import { sendSuccess, ApiError } from "../utils/responses.js";
import { ERROR_CODES } from "../utils/error-codes.js";
import * as performanceService from "../services/performance.service.js";
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
} from "../validators/performance.validator.js";
import type { AuthenticatedRequest } from "../types/api.types.js";

const router: Router = Router();

// All performance routes require authentication
router.use(authenticate as any);

// ============================================================
// REVIEW CYCLES
// ============================================================

router.get(
  "/cycles",
  requireAnyPermission(["performance:view", "performance:manage", "performance:review"]) as any,
  validateQuery(performanceCyclesQuerySchema),
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as unknown as AuthenticatedRequest;
    const cycles = await performanceService.getReviewCyclesForRequester(
      authReq.user.id,
      authReq.user.permissions || [],
      req.query.status as string | undefined,
    );
    sendSuccess(res, cycles);
  }),
);

router.get(
  "/cycles/:id",
  requireAnyPermission(["performance:view", "performance:manage", "performance:review"]) as any,
  validateParams(performanceCycleIdParamSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as unknown as AuthenticatedRequest;
    const id = req.params.id as string;
    const cycle = await performanceService.getReviewCycleById(id);
    const perms = authReq.user.permissions || [];
    const fullAccess =
      perms.includes("crm:admin") ||
      perms.includes("performance:manage") ||
      perms.includes("performance:view");
    if (!fullAccess) {
      const rows = await performanceService.getReviewsByCycleIdForRequester(
        id,
        authReq.user.id,
        perms,
      );
      if (!rows.length) {
        throw new ApiError(ERROR_CODES.FORBIDDEN, "No access to this review cycle");
      }
    }
    sendSuccess(res, cycle);
  }),
);

router.post(
  "/cycles",
  requirePermission("performance:manage") as any,
  validateBody(createReviewCycleSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as unknown as AuthenticatedRequest;
    const cycle = await performanceService.createReviewCycle(req.body as any, authReq.user.id);
    sendSuccess(res, cycle, 201);
  }),
);

router.put(
  "/cycles/:id",
  requirePermission("performance:manage") as any,
  validateParams(performanceCycleIdParamSchema),
  validateBody(updateReviewCycleSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as unknown as AuthenticatedRequest;
    const cycle = await performanceService.updateReviewCycle(req.params.id as string, req.body as any, authReq.user.id);
    sendSuccess(res, cycle);
  }),
);

router.delete(
  "/cycles/:id",
  requirePermission("performance:manage") as any,
  validateParams(performanceCycleIdParamSchema),
  asyncHandler(async (req: Request, res: Response) => {
    await performanceService.deleteReviewCycle(req.params.id as string);
    sendSuccess(res, { message: "Review cycle deleted successfully" });
  }),
);

// ============================================================
// REVIEWS
// ============================================================

router.get(
  "/cycles/:cycleId/reviews",
  requireAnyPermission(["performance:manage", "performance:view", "performance:review"]) as any,
  validateParams(performanceCycleReviewsParamSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as unknown as AuthenticatedRequest;
    const reviews = await performanceService.getReviewsByCycleIdForRequester(
      req.params.cycleId as string,
      authReq.user.id,
      authReq.user.permissions || [],
    );
    sendSuccess(res, reviews);
  }),
);

/** Employee: all performance review rows where I am the review subject */
router.get(
  "/reviews/me",
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as unknown as AuthenticatedRequest;
    const reviews = await performanceService.getReviewsForEmployee(authReq.user.id);
    sendSuccess(res, reviews);
  }),
);

/** Authenticated: colleagues in shared active cycles (peer feedback targets) */
router.get(
  "/peer-feedback/targets",
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as unknown as AuthenticatedRequest;
    const targets = await performanceService.getPeerFeedbackTargetsForUser(authReq.user.id);
    sendSuccess(res, targets);
  }),
);

router.get(
  "/reminder-counts",
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as unknown as AuthenticatedRequest;
    const counts = await performanceService.getPerformanceReminderCountsForUser(authReq.user.id);
    sendSuccess(res, counts);
  }),
);

router.get(
  "/reviews/:id",
  requireAnyPermission(["performance:view", "performance:manage", "performance:review"]) as any,
  validateParams(performanceReviewIdParamSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as unknown as AuthenticatedRequest;
    const hrOverride =
      authReq.user.permissions.includes("crm:admin") ||
      authReq.user.permissions.includes("performance:view") ||
      authReq.user.permissions.includes("performance:manage");
    const review = await performanceService.getReviewById(
      req.params.id as string,
      authReq.user.id,
      { hrOverride, permissions: authReq.user.permissions || [] },
    );
    sendSuccess(res, review);
  }),
);

router.get(
  "/reviews/:id/peer-feedback-submissions",
  requireAnyPermission(["performance:view", "performance:manage", "hr:view", "hr:manage"]) as any,
  validateParams(performanceReviewIdParamSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as unknown as AuthenticatedRequest;
    const rows = await performanceService.getPeerFeedbackSubmissionsForReview(
      req.params.id as string,
      authReq.user.permissions || [],
    );
    sendSuccess(res, rows);
  }),
);

// ============================================================
// GOAL SETTING
// ============================================================

router.post(
  "/reviews/:id/goals",
  validateParams(performanceReviewIdParamSchema),
  validateBody(setGoalsSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as unknown as AuthenticatedRequest;
    const overrideAccess =
      authReq.user.permissions.includes("crm:admin") ||
      authReq.user.permissions.includes("performance:manage");
    const review = await performanceService.setGoals(
      req.params.id as string,
      (req.body as { goals: any[] }).goals,
      authReq.user.id,
      { overrideAccess },
    );
    sendSuccess(res, review);
  }),
);

// ============================================================
// SELF ASSESSMENT
// ============================================================

router.post(
  "/reviews/:id/self-assessment",
  validateParams(performanceReviewIdParamSchema),
  validateBody(selfAssessmentSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as unknown as AuthenticatedRequest;
    // Only the employee can submit (enforced in service)
    const review = await performanceService.submitSelfAssessment(req.params.id as string, req.body as any, authReq.user.id);
    sendSuccess(res, review);
  }),
);

// ============================================================
// MANAGER REVIEW
// ============================================================

router.post(
  "/reviews/:id/manager-review",
  validateParams(performanceReviewIdParamSchema),
  validateBody(managerReviewSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as unknown as AuthenticatedRequest;
    const overrideAccess =
      authReq.user.permissions.includes("crm:admin") ||
      authReq.user.permissions.includes("performance:manage");
    const review = await performanceService.submitManagerReview(
      req.params.id as string,
      req.body as any,
      authReq.user.id,
      { overrideAccess },
    );
    sendSuccess(res, review);
  }),
);

// ============================================================
// PEER FEEDBACK
// ============================================================

router.post(
  "/reviews/:id/peer-feedback",
  validateParams(performanceReviewIdParamSchema),
  validateBody(peerFeedbackSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as unknown as AuthenticatedRequest;
    // Any employee can submit feedback, anonymity enforced in service (Fix #4)
    const result = await performanceService.submitPeerFeedback(req.params.id as string, req.body as any, authReq.user.id);
    sendSuccess(res, result);
  }),
);

// ============================================================
// CALIBRATION & RELEASE
// ============================================================

router.post(
  "/cycles/:id/calibrate",
  requirePermission("performance:manage") as any,
  validateParams(performanceCycleIdParamSchema),
  validateBody(calibrationSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const updates = await performanceService.runCalibration(req.params.id as string, (req.body as { adjustments: any[] }).adjustments);
    sendSuccess(res, updates);
  }),
);

router.post(
  "/cycles/:id/approve",
  requirePermission("performance:manage") as any,
  validateParams(performanceCycleIdParamSchema),
  validateBody(directorApprovalSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as unknown as AuthenticatedRequest;
    const result = await performanceService.approveCycleResults(
      req.params.id as string,
      authReq.user.id,
      (req.body as { note?: string }).note,
    );
    sendSuccess(res, result);
  }),
);

router.post(
  "/cycles/:id/release",
  requirePermission("performance:manage") as any,
  validateParams(performanceCycleIdParamSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const result = await performanceService.releaseResults(req.params.id as string);
    sendSuccess(res, result);
  }),
);

router.post(
  "/reviews/:id/acknowledge",
  validateParams(performanceReviewIdParamSchema),
  validateBody(reviewAcknowledgementSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as unknown as AuthenticatedRequest;
    const result = await performanceService.acknowledgeReview(
      req.params.id as string,
      authReq.user.id,
      (req.body as { note?: string }).note,
    );
    sendSuccess(res, result);
  }),
);

// ============================================================
// ANALYTICS
// ============================================================

router.get(
  "/analytics",
  requireAnyPermission(["performance:view", "performance:manage"]) as any,
  validateQuery(performanceAnalyticsQuerySchema),
  asyncHandler(async (req: Request, res: Response) => {
    const analytics = await performanceService.getPerformanceAnalytics(req.query.cycle_id as string | undefined);
    sendSuccess(res, analytics);
  }),
);

export default router;
