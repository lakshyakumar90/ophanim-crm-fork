import { Router, type Request, type Response } from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import { requirePermission, requireAnyPermission } from "../middleware/authorization.middleware.js";
import { validateBody, validateParams, validateQuery } from "../middleware/validation.middleware.js";
import { asyncHandler } from "../middleware/error.middleware.js";
import { sendSuccess, ApiError } from "../utils/responses.js";
import { ERROR_CODES } from "../utils/error-codes.js";
import * as onboardingService from "../services/onboarding.service.js";
import {
  createTemplateSchema,
  updateTemplateSchema,
  createChecklistSchema,
  updateChecklistTaskSchema,
  initiateOffboardingSchema,
  exitInterviewSchema,
  onboardingIdParamSchema,
  onboardingEmployeeIdParamSchema,
  onboardingTaskParamsSchema,
  onboardingTemplatesQuerySchema,
  onboardingChecklistsQuerySchema,
} from "../validators/onboarding.validator.js";
import type { AuthenticatedRequest } from "../types/api.types.js";

function canViewOnboardingChecklist(authReq: AuthenticatedRequest): boolean {
  const p = authReq.user.permissions;
  return (
    p.includes("crm:admin") ||
    p.includes("onboarding:view") ||
    p.includes("onboarding:manage") ||
    p.includes("hr:view") ||
    p.includes("hr:manage")
  );
}

function canManageOnboardingTasks(authReq: AuthenticatedRequest): boolean {
  const p = authReq.user.permissions;
  return (
    p.includes("crm:admin") ||
    p.includes("onboarding:manage") ||
    p.includes("hr:manage")
  );
}

const router: Router = Router();

// All onboarding routes require authentication
router.use(authenticate as any);

// ============================================================
// TEMPLATES
// ============================================================

router.get(
  "/templates",
  requireAnyPermission(["onboarding:view", "onboarding:manage"]) as any,
  validateQuery(onboardingTemplatesQuerySchema),
  asyncHandler(async (req: Request, res: Response) => {
    const templates = await onboardingService.getOnboardingTemplates(
      req.query.type as string,
      req.query.department as string,
    );
    sendSuccess(res, templates);
  }),
);

router.get(
  "/templates/:id",
  requireAnyPermission(["onboarding:view", "onboarding:manage"]) as any,
  validateParams(onboardingIdParamSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const template = await onboardingService.getTemplateById(req.params.id as string);
    sendSuccess(res, template);
  }),
);

router.post(
  "/templates",
  requirePermission("onboarding:manage") as any,
  validateBody(createTemplateSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as unknown as AuthenticatedRequest;
    const template = await onboardingService.createTemplate(req.body as any, authReq.user.id);
    sendSuccess(res, template, 201);
  }),
);

router.put(
  "/templates/:id",
  requirePermission("onboarding:manage") as any,
  validateParams(onboardingIdParamSchema),
  validateBody(updateTemplateSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const template = await onboardingService.updateTemplate(req.params.id as string, req.body as any);
    sendSuccess(res, template);
  }),
);

// ============================================================
// CHECKLISTS
// ============================================================

router.get(
  "/checklists",
  requireAnyPermission(["onboarding:view", "onboarding:manage"]) as any,
  validateQuery(onboardingChecklistsQuerySchema),
  asyncHandler(async (req: Request, res: Response) => {
    const checklists = await onboardingService.getActiveChecklists(req.query.type as string);
    sendSuccess(res, checklists);
  }),
);

// GET my checklists
router.get(
  "/checklists/me",
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as unknown as AuthenticatedRequest;
    const checklists = await onboardingService.getChecklistByEmployee(authReq.user.id);
    sendSuccess(res, checklists);
  }),
);

// GET checklist by employee ID
router.get(
  "/checklists/employee/:employeeId",
  requireAnyPermission(["onboarding:view", "onboarding:manage"]) as any,
  validateParams(onboardingEmployeeIdParamSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const checklists = await onboardingService.getChecklistByEmployee(req.params.employeeId as string);
    sendSuccess(res, checklists);
  }),
);

router.get(
  "/checklists/:id",
  validateParams(onboardingIdParamSchema),
  asyncHandler(async (req: Request, res: Response) => {
    // Both HR and the employee owning the checklist can view it
    const checklist = await onboardingService.getChecklistById(req.params.id as string);
    const authReq = req as unknown as AuthenticatedRequest;
    const isOwner = (checklist as any).employee_id === authReq.user.id;
    const hasHRView = authReq.user.permissions.includes("onboarding:view");
    const hasHRManage = authReq.user.permissions.includes("onboarding:manage");

    if (!isOwner && !hasHRView && !hasHRManage) {
      throw new ApiError(ERROR_CODES.FORBIDDEN, "Access denied");
    }

    sendSuccess(res, checklist);
  }),
);

router.get(
  "/checklists/:id/offboarding-pdf",
  validateParams(onboardingIdParamSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as unknown as AuthenticatedRequest;
    const checklist = await onboardingService.getOffboardingChecklistForPdf(req.params.id as string, authReq.user);
    const pdfBuffer = await onboardingService.generateOffboardingPdfBuffer(
      checklist,
      "Ophanim Technologies",
    );

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=\"offboarding-${checklist.employee_id}-${String(checklist.id).slice(0, 8)}.pdf\"`,
    );
    res.send(pdfBuffer);
  }),
);

router.post(
  "/checklists",
  requirePermission("onboarding:manage") as any,
  validateBody(createChecklistSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const checklist = await onboardingService.createChecklist(req.body as any);
    sendSuccess(res, checklist, 201);
  }),
);

router.put(
  "/checklists/:id/tasks/:taskIndex",
  validateParams(onboardingTaskParamsSchema),
  validateBody(updateChecklistTaskSchema),
  asyncHandler(async (req: Request, res: Response) => {
    // Only allow if it's assigned to the user role... complex auth so let's allow 
    // employee to update their own, or HR to update
    const authReq = req as unknown as AuthenticatedRequest;
    const checklist = await onboardingService.getChecklistById(req.params.id as string);
    
    // Check ownership
    const isOwner = (checklist as any).employee_id === authReq.user.id;

    if (!isOwner && !canManageOnboardingTasks(authReq)) {
      throw new ApiError(ERROR_CODES.FORBIDDEN, "Access denied");
    }

    const taskIndex = req.params.taskIndex as unknown as number;
    const updated = await onboardingService.updateChecklistTask(req.params.id as string, taskIndex, req.body as any);
    sendSuccess(res, updated);
  }),
);

// ============================================================
// OFFBOARDING & OFFBOARDING TASKS
// ============================================================

router.post(
  "/offboarding/:employeeId/initiate",
  requirePermission("onboarding:manage") as any,
  validateParams(onboardingEmployeeIdParamSchema),
  validateBody(initiateOffboardingSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const checklist = await onboardingService.initiateOffboarding(req.params.employeeId as string, req.body as any);
    sendSuccess(res, checklist, 201);
  }),
);

router.post(
  "/checklists/:id/exit-interview",
  validateParams(onboardingIdParamSchema),
  validateBody(exitInterviewSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as unknown as AuthenticatedRequest;
    // Only the offboarding employee can do exit interview
    const checklist = await onboardingService.getChecklistById(req.params.id as string);
    
    if ((checklist as any).employee_id !== authReq.user.id) {
      throw new ApiError(
        ERROR_CODES.FORBIDDEN,
        "Access denied: You can only complete your own exit interview",
      );
    }

    const updated = await onboardingService.completeExitInterview(req.params.id as string, req.body as any);
    sendSuccess(res, updated);
  }),
);

router.post(
  "/offboarding/:employeeId/archive",
  requirePermission("onboarding:manage") as any,
  validateParams(onboardingEmployeeIdParamSchema),
  asyncHandler(async (req: Request, res: Response) => {
    // Final step
    const archived = await onboardingService.archiveEmployee(req.params.employeeId as string);
    sendSuccess(res, archived);
  }),
);

export default router;
