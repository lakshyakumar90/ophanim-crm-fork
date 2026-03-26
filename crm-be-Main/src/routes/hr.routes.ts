import {
  Router,
  type RequestHandler,
  type Router as RouterType,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import {
  requirePermission,
  requireAnyPermission,
} from "../middleware/authorization.middleware.js";
import {
  validateBody,
  validateParams,
  validateQuery,
} from "../middleware/validation.middleware.js";
import { asyncHandler } from "../middleware/error.middleware.js";
import { sendSuccess, ApiError } from "../utils/responses.js";
import { ERROR_CODES } from "../utils/error-codes.js";
import * as hrService from "../services/hr.service.js";
import * as hrAnalyticsService from "../services/hr-analytics.service.js";
import * as leaveService from "../services/leave.service.js";
import type { AuthenticatedRequest } from "../types/api.types.js";
import {
  hrEmployeeIdParamSchema,
  hrEmployeeUpdateSchema,
  hrLeaveListQuerySchema,
  hrLeaveBalanceQuerySchema,
  hrCreateLeaveRequestSchema,
  hrCreateLeaveTypeSchema,
  hrUpdateLeaveTypeSchema,
  hrLeaveDecisionSchema,
  leaveRequestIdParamSchema,
  leaveTypeIdParamSchema,
  userLeaveBalanceParamSchema,
} from "../validators/hr.validator.js";

const router: RouterType = Router();

// All HR routes require authentication.
// Permission checks are enforced at endpoint level for least-privilege access.
router.use(authenticate as any);

// ====================
// EMPLOYEE ENDPOINTS
// ====================

/**
 * GET /hr/employees
 * Get all employees for HR directory
 */
router.get(
  "/employees",
  requireAnyPermission(["hr:employees_view", "hr:view", "hr:manage"]) as any,
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as unknown as AuthenticatedRequest;
    const employees = await hrService.getEmployeeDirectory(authReq.user);
    sendSuccess(res, employees);
  }),
);

/**
 * GET /hr/employees/probation
 * Get employees ending probation soon
 */
router.get(
  "/employees/probation",
  requireAnyPermission(["hr:employees_view", "hr:view", "hr:manage"]) as any,
  asyncHandler(async (req: Request, res: Response) => {
    const employees = await hrService.getEmployeesOnProbation();
    sendSuccess(res, employees);
  }),
);

/**
 * GET /hr/employees/:id
 * Get employee by ID
 */
router.get(
  "/employees/:id",
  requireAnyPermission(["hr:employees_view", "hr:view", "hr:manage"]) as any,
  validateParams(hrEmployeeIdParamSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const employee = await hrService.getEmployeeById(req.params.id as string);
    sendSuccess(res, employee);
  }),
);

/**
 * GET /hr/employees/:id/compensation-history
 * Get employee compensation history
 */
router.get(
  "/employees/:id/compensation-history",
  requireAnyPermission(["hr:compensation_view", "hr:view", "hr:manage"]) as any,
  validateParams(hrEmployeeIdParamSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const history = await hrService.getEmployeeCompensationHistory(req.params.id as string);
    sendSuccess(res, history);
  }),
);

/**
 * PUT /hr/employees/:id
 * Update employee profile (HR Manager+ only)
 */
router.put(
  "/employees/:id",
  requireAnyPermission(["hr:employees_edit", "hr:manage"]) as any,
  validateParams(hrEmployeeIdParamSchema),
  validateBody(hrEmployeeUpdateSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as unknown as AuthenticatedRequest;
    const employee = await hrService.updateEmployeeProfile(
      req.params.id as string,
      req.body,
      authReq.user,
    );
    sendSuccess(res, employee);
  }),
);

// ====================
// ANALYTICS ENDPOINTS
// ====================

/**
 * GET /hr/analytics/comprehensive
 * Get deep cross-module HR analytics
 * @deprecated Prefer granular /hr/analytics/* card endpoints for new clients.
 */
router.get(
  "/analytics/comprehensive",
  requireAnyPermission(["hr:analytics_view", "hr:view", "hr:manage"]) as any,
  asyncHandler(async (req: Request, res: Response) => {
    const analytics = await hrAnalyticsService.getComprehensiveAnalytics();
    sendSuccess(res, analytics);
  }),
);

/**
 * GET /hr/analytics
 * Get HR analytics data
 * @deprecated Prefer granular /hr/analytics/* card endpoints for new clients.
 */
router.get(
  "/analytics",
  requireAnyPermission(["hr:analytics_view", "hr:view", "hr:manage"]) as any,
  asyncHandler(async (req: Request, res: Response) => {
    const analytics = await hrService.getHRAnalytics();
    sendSuccess(res, analytics);
  }),
);

/**
 * GET /hr/on-leave-today
 * Get employees on leave today
 */
router.get(
  "/on-leave-today",
  requireAnyPermission(["hr:dashboard_view", "hr:view", "hr:manage"]) as any,
  asyncHandler(async (req: Request, res: Response) => {
    const employees = await hrService.getEmployeesOnLeaveToday();
    sendSuccess(res, employees);
  }),
);

// ====================
// LEAVE MANAGEMENT ENDPOINTS
// ====================

/**
 * GET /hr/leave-types
 * Get all active leave types
 */
router.get(
  "/leave-types",
  requireAnyPermission(["hr:leave_view", "hr:view", "hr:manage"]) as any,
  asyncHandler(async (req: Request, res: Response) => {
    const leaveTypes = await leaveService.getLeaveTypes();
    sendSuccess(res, leaveTypes);
  }),
);

/**
 * GET /hr/leave-types/admin
 * All leave types (including inactive) for HR settings
 */
router.get(
  "/leave-types/admin",
  requireAnyPermission(["hr:leave_manage", "hr:manage"]) as any,
  asyncHandler(async (_req: Request, res: Response) => {
    const leaveTypes = await leaveService.getLeaveTypesAdmin();
    sendSuccess(res, leaveTypes);
  }),
);

/**
 * POST /hr/leave-types
 * Create leave type (HR)
 */
router.post(
  "/leave-types",
  requireAnyPermission(["hr:leave_manage", "hr:manage"]) as any,
  validateBody(hrCreateLeaveTypeSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { name, description, daysAllowed, isPaid, carryForward } = req.body;
    const created = await leaveService.createLeaveType({
      name,
      description,
      daysAllowed,
      isPaid,
      carryForward,
    });
    sendSuccess(res, created);
  }),
);

/**
 * PATCH /hr/leave-types/:id
 * Update leave type (HR)
 */
router.patch(
  "/leave-types/:id",
  requireAnyPermission(["hr:leave_manage", "hr:manage"]) as any,
  validateParams(leaveTypeIdParamSchema),
  validateBody(hrUpdateLeaveTypeSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const updated = await leaveService.updateLeaveType(
      req.params.id as string,
      req.body,
    );
    sendSuccess(res, updated);
  }),
);

/**
 * GET /hr/leave-stats
 * Get leave statistics for dashboard
 */
router.get(
  "/leave-stats",
  requireAnyPermission(["hr:leave_view", "hr:view", "hr:manage"]) as any,
  asyncHandler(async (req: Request, res: Response) => {
    const stats = await leaveService.getLeaveStats();
    sendSuccess(res, stats);
  }),
);

/**
 * GET /hr/leaves
 * Get leave requests with filters
 */
router.get(
  "/leaves",
  requireAnyPermission(["hr:leave_view", "hr:view", "hr:manage"]) as any,
  validateQuery(hrLeaveListQuerySchema),
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as unknown as AuthenticatedRequest;
    const { userId, status, startDate, endDate } = req.query;
    const leaves = await leaveService.getLeaveRequests(
      {
        userId: userId as string,
        status: status as string,
        startDate: startDate as string,
        endDate: endDate as string,
      },
      authReq.user,
    );
    sendSuccess(res, leaves);
  }),
);

/**
 * GET /hr/leaves/pending
 * Get pending leave requests for HR approval
 */
router.get(
  "/leaves/pending",
  requireAnyPermission(["hr:leave_view", "hr:view", "hr:manage"]) as any,
  asyncHandler(async (req: Request, res: Response) => {
    const leaves = await leaveService.getPendingLeaveRequests();
    sendSuccess(res, leaves);
  }),
);

/**
 * GET /hr/leaves/balances/:userId
 * Get leave balances for a user
 */
router.get(
  "/leaves/balances/:userId",
  requireAnyPermission(["hr:leave_view", "hr:view", "hr:manage"]) as any,
  validateParams(userLeaveBalanceParamSchema),
  validateQuery(hrLeaveBalanceQuerySchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { year } = req.query;
    const balances = await leaveService.getUserLeaveBalances(
      req.params.userId as string,
      typeof year === "number" ? year : undefined,
    );
    sendSuccess(res, balances);
  }),
);

/**
 * POST /hr/leaves
 * Create a leave request on behalf of an employee (HR/Admin only)
 * Body: { leaveTypeId, startDate, endDate, reason?, targetUserId }
 */
router.post(
  "/leaves",
  requireAnyPermission(["hr:leave_manage", "hr:manage"]) as any,
  validateBody(hrCreateLeaveRequestSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { leaveTypeId, startDate, endDate, reason, targetUserId } = req.body;

    const leave = await leaveService.createLeaveRequest(
      { leaveTypeId, startDate, endDate, reason },
      targetUserId,
      { skipBalanceCheck: true },
    );
    sendSuccess(res, leave);
  }),
);

/**
 * POST /hr/leaves/:id/approve
 * Approve a leave request
 */
router.post(
  "/leaves/:id/approve",
  requireAnyPermission(["hr:leave_approve", "hr:manage"]) as any,
  validateParams(leaveRequestIdParamSchema),
  validateBody(hrLeaveDecisionSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as unknown as AuthenticatedRequest;
    const { notes } = req.body;
    const leave = await leaveService.approveLeaveRequest(
      req.params.id as string,
      authReq.user.id,
      notes,
    );
    sendSuccess(res, leave);
  }),
);

/**
 * POST /hr/leaves/:id/reject
 * Reject a leave request
 */
router.post(
  "/leaves/:id/reject",
  requireAnyPermission(["hr:leave_approve", "hr:manage"]) as any,
  validateParams(leaveRequestIdParamSchema),
  validateBody(hrLeaveDecisionSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as unknown as AuthenticatedRequest;
    const { notes } = req.body;
    const leave = await leaveService.rejectLeaveRequest(
      req.params.id as string,
      authReq.user.id,
      notes,
    );
    sendSuccess(res, leave);
  }),
);

// ====================
// DOCUMENT MANAGEMENT ENDPOINTS
// ====================

import * as documentsService from "../services/documents.service.js";
import * as documentTypesService from "../services/document-types.service.js";
import {
  createDocumentSchema,
  createHrDocumentTypeSchema,
  documentIdParamSchema,
  documentQuerySchema,
  documentUserIdParamSchema,
  hrDocumentTypeIdParamSchema,
  rejectDocumentSchema,
  updateDocumentSchema,
  updateHrDocumentTypeSchema,
  uploadHrDocumentFormSchema,
  uploadMyDocumentFormSchema,
  verifyDocumentSchema,
} from "../validators/documents.validator.js";
import multer from "multer";

const hrDocumentUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15 MB
});

/**
 * GET /hr/document-types/active
 * List active document types for authenticated self-service uploads
 */
router.get(
  "/document-types/active",
  asyncHandler(async (_req: Request, res: Response) => {
    const rows = await documentTypesService.listDocumentTypes({ activeOnly: true });
    sendSuccess(res, rows);
  }),
);

/**
 * GET /hr/document-types
 * List document type definitions (?activeOnly=true for pickers)
 */
router.get(
  "/document-types",
  requireAnyPermission(["hr:documents_view", "hr:view", "hr:manage"]) as any,
  asyncHandler(async (req: Request, res: Response) => {
    const activeOnly = req.query.activeOnly === "true";
    const rows = await documentTypesService.listDocumentTypes({ activeOnly });
    sendSuccess(res, rows);
  }),
);

/**
 * POST /hr/document-types
 * Add a new document type (slug)
 */
router.post(
  "/document-types",
  requireAnyPermission(["hr:documents_manage", "hr:manage"]) as any,
  validateBody(createHrDocumentTypeSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const row = await documentTypesService.createDocumentType(req.body);
    sendSuccess(res, row, 201);
  }),
);

/**
 * PATCH /hr/document-types/:id
 * Update label / order / active (soft-remove)
 */
router.patch(
  "/document-types/:id",
  requireAnyPermission(["hr:documents_manage", "hr:manage"]) as any,
  validateParams(hrDocumentTypeIdParamSchema),
  validateBody(updateHrDocumentTypeSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const row = await documentTypesService.updateDocumentType(
      req.params.id as string,
      req.body,
    );
    sendSuccess(res, row);
  }),
);

/**
 * POST /hr/documents/upload
 * Multipart: field "file" + userId, documentType, documentName, optional expiryDate, notes
 */
router.post(
  "/documents/upload",
  requireAnyPermission(["hr:documents_manage", "hr:manage"]) as any,
  hrDocumentUpload.single("file") as RequestHandler,
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.file) {
      throw ApiError.badRequest("File is required");
    }
    const parsed = uploadHrDocumentFormSchema.safeParse(req.body);
    if (!parsed.success) {
      const msg = parsed.error.issues.map((i) => i.message).join("; ");
      throw ApiError.badRequest(msg || "Invalid form data");
    }
    const authReq = req as unknown as AuthenticatedRequest;
    const document = await documentsService.createDocumentWithUploadedFile(
      {
        userId: parsed.data.userId,
        documentType: parsed.data.documentType,
        documentName: parsed.data.documentName,
        fileName: req.file.originalname,
        fileBuffer: req.file.buffer,
        mimeType: req.file.mimetype || "application/octet-stream",
        fileSize: req.file.size,
        expiryDate: parsed.data.expiryDate,
        notes: parsed.data.notes,
      },
      authReq.user.id,
    );
    sendSuccess(res, document, 201);
  }),
);

/**
 * POST /hr/documents/my/upload
 * Employee self-upload for My Documents. Routes to HR verification queue.
 */
router.post(
  "/documents/my/upload",
  hrDocumentUpload.single("file") as RequestHandler,
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.file) {
      throw ApiError.badRequest("File is required");
    }

    const parsed = uploadMyDocumentFormSchema.safeParse(req.body);
    if (!parsed.success) {
      const msg = parsed.error.issues.map((i) => i.message).join("; ");
      throw ApiError.badRequest(msg || "Invalid form data");
    }

    const authReq = req as unknown as AuthenticatedRequest;
    const document = await documentsService.createDocumentWithUploadedFile(
      {
        userId: authReq.user.id,
        documentType: parsed.data.documentType,
        documentName: parsed.data.documentName,
        fileName: req.file.originalname,
        fileBuffer: req.file.buffer,
        mimeType: req.file.mimetype || "application/octet-stream",
        fileSize: req.file.size,
        expiryDate: parsed.data.expiryDate,
        notes: parsed.data.notes,
      },
      authReq.user.id,
    );

    await documentsService.notifyHrOnDocumentSubmission({
      documentId: document.id,
      submittedByUserId: authReq.user.id,
      documentName: document.documentName,
      documentType: document.documentType,
    });

    sendSuccess(res, document, 201);
  }),
);

/**
 * GET /hr/documents
 * Get all documents with optional filters
 */
router.get(
  "/documents",
  requireAnyPermission(["hr:documents_view", "hr:view", "hr:manage"]) as any,
  validateQuery(documentQuerySchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { userId, documentType, isVerified } = req.query;
    const documents = await documentsService.getDocuments({
      userId: userId as string,
      documentType: documentType as any,
      isVerified: isVerified as boolean | undefined,
    });
    sendSuccess(res, documents);
  }),
);

/**
 * GET /hr/documents/stats
 * Get document statistics
 */
router.get(
  "/documents/stats",
  requireAnyPermission(["hr:documents_view", "hr:view", "hr:manage"]) as any,
  asyncHandler(async (req: Request, res: Response) => {
    const stats = await documentsService.getDocumentStats();
    sendSuccess(res, stats);
  }),
);

/**
 * GET /hr/documents/user/:userId
 * Get documents for a specific user
 */
router.get(
  "/documents/user/:userId",
  validateParams(documentUserIdParamSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as unknown as AuthenticatedRequest;
    const targetUserId = req.params.userId as string;

    // Self-service: employees/managers can view their own HR documents
    // without needing hr:documents_view / hr:view / hr:manage.
    const isSelf = authReq.user.id === targetUserId;
    if (!isSelf) {
      const perms = authReq.user.permissions || [];
      const allowed =
        perms.includes("crm:admin") ||
        perms.includes("hr:documents_view") ||
        perms.includes("hr:view") ||
        perms.includes("hr:manage");

      if (!allowed) {
        throw new ApiError(ERROR_CODES.FORBIDDEN, "Access denied");
      }
    }

    const documents = await documentsService.getUserDocuments(
      targetUserId,
    );
    sendSuccess(res, documents);
  }),
);

/**
 * GET /hr/documents/:id
 * Get single document by ID
 */
router.get(
  "/documents/:id",
  requireAnyPermission(["hr:documents_view", "hr:view", "hr:manage"]) as any,
  validateParams(documentIdParamSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const document = await documentsService.getDocumentById(
      req.params.id as string,
    );
    sendSuccess(res, document);
  }),
);

/**
 * POST /hr/documents
 * Create/upload a document record
 */
router.post(
  "/documents",
  requireAnyPermission(["hr:documents_manage", "hr:manage"]) as any,
  validateBody(createDocumentSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as unknown as AuthenticatedRequest;
    const document = await documentsService.createDocument(
      req.body,
      authReq.user.id,
    );
    sendSuccess(res, document, 201);
  }),
);

/**
 * PUT /hr/documents/:id
 * Update a document
 */
router.put(
  "/documents/:id",
  requireAnyPermission(["hr:documents_manage", "hr:manage"]) as any,
  validateParams(documentIdParamSchema),
  validateBody(updateDocumentSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const document = await documentsService.updateDocument(
      req.params.id as string,
      req.body,
    );
    sendSuccess(res, document);
  }),
);

/**
 * DELETE /hr/documents/:id
 * Delete a document
 */
router.delete(
  "/documents/:id",
  requireAnyPermission(["hr:documents_delete", "hr:manage"]) as any,
  validateParams(documentIdParamSchema),
  asyncHandler(async (req: Request, res: Response) => {
    await documentsService.deleteDocument(req.params.id as string);
    sendSuccess(res, { message: "Document deleted successfully" });
  }),
);

/**
 * POST /hr/documents/:id/verify
 * Verify a document (HR Manager+ only)
 */
router.post(
  "/documents/:id/verify",
  requireAnyPermission(["hr:documents_manage", "hr:manage"]) as any,
  validateParams(documentIdParamSchema),
  validateBody(verifyDocumentSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as unknown as AuthenticatedRequest;
    const document = await documentsService.verifyDocument(
      req.params.id as string,
      authReq.user.id,
      (req.body as { notes?: string }).notes,
    );
    sendSuccess(res, document);
  }),
);

/**
 * POST /hr/documents/:id/reject
 * Reject a document and ask employee to re-upload with reason
 */
router.post(
  "/documents/:id/reject",
  requireAnyPermission(["hr:documents_manage", "hr:manage"]) as any,
  validateParams(documentIdParamSchema),
  validateBody(rejectDocumentSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as unknown as AuthenticatedRequest;
    const body = req.body as { reason: string };
    const document = await documentsService.rejectDocument(
      req.params.id as string,
      authReq.user.id,
      body.reason,
    );
    sendSuccess(res, document);
  }),
);

/**
 * POST /hr/documents/:id/unverify
 * Unverify a document (HR Manager+ only)
 */
router.post(
  "/documents/:id/unverify",
  requireAnyPermission(["hr:documents_manage", "hr:manage"]) as any,
  validateParams(documentIdParamSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const document = await documentsService.unverifyDocument(
      req.params.id as string,
    );
    sendSuccess(res, document);
  }),
);

// ====================
// PHASE 1 DASHBOARD ANALYTICS (Independent Card Endpoints)
// ====================

/**
 * GET /hr/analytics/headcount
 * Headcount stats: total, active, by department, by role
 */
router.get(
  "/analytics/headcount",
  requireAnyPermission(["hr:dashboard_view", "hr:analytics_view", "hr:view", "hr:manage"]) as any,
  asyncHandler(async (req: Request, res: Response) => {
    const analytics = await hrAnalyticsService.getHeadcountAnalytics();
    sendSuccess(res, analytics);
  }),
);

/**
 * GET /hr/analytics/leaves
 * Leave analytics: on-leave today, breakdown, pending approvals
 */
router.get(
  "/analytics/leaves",
  requireAnyPermission(["hr:dashboard_view", "hr:leave_view", "hr:view", "hr:manage"]) as any,
  asyncHandler(async (req: Request, res: Response) => {
    const analytics = await hrAnalyticsService.getLeaveAnalytics();
    sendSuccess(res, analytics);
  }),
);

/**
 * GET /hr/analytics/recruitment
 * Recruitment analytics: open positions, pipeline, candidates
 */
router.get(
  "/analytics/recruitment",
  requireAnyPermission(["hr:dashboard_view", "hr:analytics_view", "hr:view", "hr:manage"]) as any,
  asyncHandler(async (req: Request, res: Response) => {
    const analytics = await hrAnalyticsService.getRecruitmentAnalytics();
    sendSuccess(res, analytics);
  }),
);

/**
 * GET /hr/analytics/payroll
 * Payroll analytics: current month status, trend, pending approvals
 */
router.get(
  "/analytics/payroll",
  requireAnyPermission(["hr:dashboard_view", "hr:analytics_view", "hr:view", "hr:manage"]) as any,
  asyncHandler(async (req: Request, res: Response) => {
    const analytics = await hrAnalyticsService.getPayrollAnalytics();
    sendSuccess(res, analytics);
  }),
);

/**
 * GET /hr/analytics/performance
 * Performance analytics: active cycles, reviews, deadlines
 */
router.get(
  "/analytics/performance",
  requireAnyPermission(["hr:dashboard_view", "hr:analytics_view", "hr:view", "hr:manage"]) as any,
  asyncHandler(async (req: Request, res: Response) => {
    const analytics = await hrAnalyticsService.getPerformanceAnalytics();
    sendSuccess(res, analytics);
  }),
);

/**
 * GET /hr/analytics/compliance
 * Compliance analytics: expiring docs, probation ending, certifications
 */
router.get(
  "/analytics/compliance",
  requireAnyPermission(["hr:dashboard_view", "hr:analytics_view", "hr:view", "hr:manage"]) as any,
  asyncHandler(async (req: Request, res: Response) => {
    const analytics = await hrAnalyticsService.getComplianceAnalytics();
    sendSuccess(res, analytics);
  }),
);

/**
 * GET /hr/analytics/alerts
 * System alerts: high-priority items requiring action
 */
router.get(
  "/analytics/alerts",
  requireAnyPermission(["hr:dashboard_view", "hr:analytics_view", "hr:view", "hr:manage"]) as any,
  asyncHandler(async (req: Request, res: Response) => {
    const alerts = await hrAnalyticsService.getSystemAlerts();
    sendSuccess(res, alerts);
  }),
);

/**
 * GET /hr/analytics/activity-feed
 * Activity feed: recent HR activities across all modules
 */
router.get(
  "/analytics/activity-feed",
  requireAnyPermission(["hr:dashboard_view", "hr:analytics_view", "hr:view", "hr:manage"]) as any,
  asyncHandler(async (req: Request, res: Response) => {
    const limit = parseInt(req.query.limit as string) || 15;
    const feed = await hrAnalyticsService.getActivityFeed(limit);
    sendSuccess(res, feed);
  }),
);

export default router;
