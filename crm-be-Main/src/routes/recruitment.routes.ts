import { Router, type Request, type Response } from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import { requirePermission, requireAnyPermission } from "../middleware/authorization.middleware.js";
import { validateBody, validateParams, validateQuery } from "../middleware/validation.middleware.js";
import { asyncHandler } from "../middleware/error.middleware.js";
import { sendSuccess } from "../utils/responses.js";
import * as recruitmentService from "../services/recruitment.service.js";
import {
  createJobPostingSchema,
  updateJobPostingSchema,
  createCandidateSchema,
  updateCandidateSchema,
  moveCandidateStageSchema,
  createInterviewSchema,
  updateInterviewSchema,
  sendOfferSchema,
  recordOfferResponseSchema,
  listCandidatesQuerySchema,
  listJobPostingsQuerySchema,
  recruitmentIdParamSchema,
  recruitmentCandidateIdParamSchema,
  recruitmentInterviewIdParamSchema,
} from "../validators/recruitment.validator.js";
import type { AuthenticatedRequest } from "../types/api.types.js";

const router: Router = Router();

// All recruitment routes require authentication
router.use(authenticate as any);

// ============================================================
// JOB POSTINGS
// ============================================================

// GET /recruitment/job-postings
router.get(
  "/job-postings",
  requireAnyPermission(["recruitment:view", "recruitment:manage"]) as any,
  validateQuery(listJobPostingsQuerySchema),
  asyncHandler(async (req: Request, res: Response) => {
    const postings = await recruitmentService.getJobPostings(req.query as any);
    sendSuccess(res, postings);
  }),
);

// GET /recruitment/job-postings/:id
router.get(
  "/job-postings/:id",
  requireAnyPermission(["recruitment:view", "recruitment:manage"]) as any,
  validateParams(recruitmentIdParamSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const posting = await recruitmentService.getJobPostingById(req.params.id as string);
    sendSuccess(res, posting);
  }),
);

// POST /recruitment/job-postings
router.post(
  "/job-postings",
  requirePermission("recruitment:manage") as any,
  validateBody(createJobPostingSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as unknown as AuthenticatedRequest;
    const posting = await recruitmentService.createJobPosting(req.body as any, authReq.user.id);
    sendSuccess(res, posting, 201);
  }),
);

// PUT /recruitment/job-postings/:id
router.put(
  "/job-postings/:id",
  requirePermission("recruitment:manage") as any,
  validateParams(recruitmentIdParamSchema),
  validateBody(updateJobPostingSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const posting = await recruitmentService.updateJobPosting(req.params.id as string, req.body as any);
    sendSuccess(res, posting);
  }),
);

// ============================================================
// CANDIDATES
// ============================================================

// GET /recruitment/candidates
router.get(
  "/candidates",
  requireAnyPermission(["recruitment:view", "recruitment:manage"]) as any,
  validateQuery(listCandidatesQuerySchema),
  asyncHandler(async (req: Request, res: Response) => {
    const candidates = await recruitmentService.getCandidates(req.query as any);
    sendSuccess(res, candidates);
  }),
);

// GET /recruitment/candidates/:id
router.get(
  "/candidates/:id",
  requireAnyPermission(["recruitment:view", "recruitment:manage"]) as any,
  validateParams(recruitmentCandidateIdParamSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const candidate = await recruitmentService.getCandidateById(req.params.id as string);
    sendSuccess(res, candidate);
  }),
);

// POST /recruitment/candidates
router.post(
  "/candidates",
  requirePermission("recruitment:manage") as any,
  validateBody(createCandidateSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const candidate = await recruitmentService.createCandidate(req.body as any);
    sendSuccess(res, candidate, 201);
  }),
);

// PUT /recruitment/candidates/:id
router.put(
  "/candidates/:id",
  requirePermission("recruitment:manage") as any,
  validateParams(recruitmentCandidateIdParamSchema),
  validateBody(updateCandidateSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const candidate = await recruitmentService.updateCandidate(req.params.id as string, req.body as any);
    sendSuccess(res, candidate);
  }),
);

// POST /recruitment/candidates/:id/move-stage
router.post(
  "/candidates/:id/move-stage",
  requirePermission("recruitment:manage") as any,
  validateParams(recruitmentCandidateIdParamSchema),
  validateBody(moveCandidateStageSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as unknown as AuthenticatedRequest;
    const candidate = await recruitmentService.moveCandidateStage(
      req.params.id as string,
      (req.body as { stage: string; notes?: string }).stage,
      authReq.user.id,
      (req.body as { stage: string; notes?: string }).notes,
    );
    sendSuccess(res, candidate);
  }),
);

// ============================================================
// INTERVIEWS
// ============================================================

// GET /recruitment/candidates/:id/interviews
router.get(
  "/candidates/:id/interviews",
  requireAnyPermission(["recruitment:view", "recruitment:manage"]) as any,
  validateParams(recruitmentCandidateIdParamSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const interviews = await recruitmentService.getInterviewsForCandidate(req.params.id as string);
    sendSuccess(res, interviews);
  }),
);

// POST /recruitment/candidates/:id/interviews
router.post(
  "/candidates/:id/interviews",
  requirePermission("recruitment:manage") as any,
  validateParams(recruitmentCandidateIdParamSchema),
  validateBody(createInterviewSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const interview = await recruitmentService.scheduleInterview(req.params.id as string, req.body as any);
    sendSuccess(res, interview, 201);
  }),
);

// PUT /recruitment/interviews/:id
router.put(
  "/interviews/:id",
  requirePermission("recruitment:manage") as any,
  validateParams(recruitmentInterviewIdParamSchema),
  validateBody(updateInterviewSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const interview = await recruitmentService.updateInterview(req.params.id as string, req.body as any);
    sendSuccess(res, interview);
  }),
);

// ============================================================
// OFFER LETTER
// ============================================================

// POST /recruitment/candidates/:id/offer
router.post(
  "/candidates/:id/offer",
  requirePermission("recruitment:manage") as any,
  validateParams(recruitmentCandidateIdParamSchema),
  validateBody(sendOfferSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const candidate = await recruitmentService.sendOffer(req.params.id as string, req.body as any);
    sendSuccess(res, candidate);
  }),
);

// POST /recruitment/candidates/:id/offer/respond
router.post(
  "/candidates/:id/offer/respond",
  requirePermission("recruitment:manage") as any,
  validateParams(recruitmentCandidateIdParamSchema),
  validateBody(recordOfferResponseSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as unknown as AuthenticatedRequest;
    const candidate = await recruitmentService.recordOfferResponse(
      req.params.id as string,
      (req.body as { response: "accepted" | "declined" }).response,
      authReq.user.id,
    );
    sendSuccess(res, candidate);
  }),
);

// ============================================================
// METRICS
// ============================================================

// GET /recruitment/metrics
router.get(
  "/metrics",
  requireAnyPermission(["recruitment:view", "recruitment:manage"]) as any,
  asyncHandler(async (_req: Request, res: Response) => {
    const metrics = await recruitmentService.getRecruitmentMetrics();
    sendSuccess(res, metrics);
  }),
);

export default router;
