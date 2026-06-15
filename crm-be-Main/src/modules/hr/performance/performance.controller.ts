import { Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "../../../types/api.types.js";
import { sendSuccess, ApiError } from "../../../utils/responses.js";
import { ERROR_CODES } from "../../../utils/error-codes.js";
import * as performanceService from "./performance.service.js";
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

export const getReviewCycles = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {

    const cycles = await performanceService.getReviewCyclesForRequester(
      req.user.id,
      req.user.permissions || [],
      req.query.status as string | undefined,
    );
    sendSuccess(res, cycles);
  } catch (error) {
    next(error);
  }
};

export const getReviewCycleById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {

    const id = req.params.id as string;
    const cycle = await performanceService.getReviewCycleById(id);
    const perms = req.user.permissions || [];
    const fullAccess =
      perms.includes("crm:admin") ||
      perms.includes("performance:manage") ||
      perms.includes("performance:view");
    if (!fullAccess) {
      const rows = await performanceService.getReviewsByCycleIdForRequester(
        id,
        req.user.id,
        perms,
      );
      if (!rows.length) {
        throw new ApiError(ERROR_CODES.FORBIDDEN, "No access to this review cycle");
      }
    }
    sendSuccess(res, cycle);
  } catch (error) {
    next(error);
  }
};

export const createReviewCycle = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {

    const cycle = await performanceService.createReviewCycle(req.body as any, req.user.id);
    sendSuccess(res, cycle, 201);
  } catch (error) {
    next(error);
  }
};

export const updateReviewCycle = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {

    const cycle = await performanceService.updateReviewCycle(req.params.id as string, req.body as any, req.user.id);
    sendSuccess(res, cycle);
  } catch (error) {
    next(error);
  }
};

export const deleteReviewCycle = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {

    await performanceService.deleteReviewCycle(req.params.id as string);
    sendSuccess(res, { message: "Review cycle deleted successfully" });
  } catch (error) {
    next(error);
  }
};

export const getCycleReviews = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {

    const reviews = await performanceService.getReviewsByCycleIdForRequester(
      req.params.cycleId as string,
      req.user.id,
      req.user.permissions || [],
    );
    sendSuccess(res, reviews);
  } catch (error) {
    next(error);
  }
};

export const getMyReviews = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {

    const reviews = await performanceService.getReviewsForEmployee(req.user.id);
    sendSuccess(res, reviews);
  } catch (error) {
    next(error);
  }
};

export const getPeerFeedbackTargets = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {

    const targets = await performanceService.getPeerFeedbackTargetsForUser(req.user.id);
    sendSuccess(res, targets);
  } catch (error) {
    next(error);
  }
};

export const getReminderCounts = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {

    const counts = await performanceService.getPerformanceReminderCountsForUser(req.user.id);
    sendSuccess(res, counts);
  } catch (error) {
    next(error);
  }
};

export const getReviewById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {

    const hrOverride =
      req.user.permissions.includes("crm:admin") ||
      req.user.permissions.includes("performance:view") ||
      req.user.permissions.includes("performance:manage");
    const review = await performanceService.getReviewById(
      req.params.id as string,
      req.user.id,
      { hrOverride, permissions: req.user.permissions || [] },
    );
    sendSuccess(res, review);
  } catch (error) {
    next(error);
  }
};

export const getPeerFeedbackSubmissions = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {

    const rows = await performanceService.getPeerFeedbackSubmissionsForReview(
      req.params.id as string,
      req.user.permissions || [],
    );
    sendSuccess(res, rows);
  } catch (error) {
    next(error);
  }
};

export const setGoals = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {

    const overrideAccess =
      req.user.permissions.includes("crm:admin") ||
      req.user.permissions.includes("performance:manage");
    const review = await performanceService.setGoals(
      req.params.id as string,
      (req.body as { goals: any[] }).goals,
      req.user.id,
      { overrideAccess },
    );
    sendSuccess(res, review);
  } catch (error) {
    next(error);
  }
};

export const submitSelfAssessment = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {

    // Only the employee can submit (enforced in service)
    const review = await performanceService.submitSelfAssessment(req.params.id as string, req.body as any, req.user.id);
    sendSuccess(res, review);
  } catch (error) {
    next(error);
  }
};

export const submitManagerReview = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {

    const overrideAccess =
      req.user.permissions.includes("crm:admin") ||
      req.user.permissions.includes("performance:manage");
    const review = await performanceService.submitManagerReview(
      req.params.id as string,
      req.body as any,
      req.user.id,
      { overrideAccess },
    );
    sendSuccess(res, review);
  } catch (error) {
    next(error);
  }
};

export const submitPeerFeedback = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {

    // Any employee can submit feedback, anonymity enforced in service (Fix #4)
    const result = await performanceService.submitPeerFeedback(req.params.id as string, req.body as any, req.user.id);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
};

export const runCalibration = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {

    const updates = await performanceService.runCalibration(req.params.id as string, (req.body as { adjustments: any[] }).adjustments);
    sendSuccess(res, updates);
  } catch (error) {
    next(error);
  }
};

export const approveCycleResults = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {

    const result = await performanceService.approveCycleResults(
      req.params.id as string,
      req.user.id,
      (req.body as { note?: string }).note,
    );
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
};

export const releaseResults = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {

    const result = await performanceService.releaseResults(req.params.id as string);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
};

export const acknowledgeReview = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {

    const result = await performanceService.acknowledgeReview(
      req.params.id as string,
      req.user.id,
      (req.body as { note?: string }).note,
    );
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
};

export const getPerformanceAnalytics = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {

    const analytics = await performanceService.getPerformanceAnalytics(req.query.cycle_id as string | undefined);
    sendSuccess(res, analytics);
  } catch (error) {
    next(error);
  }
};

