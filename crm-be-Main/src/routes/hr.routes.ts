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
  requireHRAccess,
  requireManager,
} from "../middleware/authorization.middleware.js";
import { asyncHandler } from "../middleware/error.middleware.js";
import { sendSuccess, ApiError } from "../utils/responses.js";
import { ERROR_CODES } from "../utils/error-codes.js";
import * as hrService from "../services/hr.service.js";
import * as leaveService from "../services/leave.service.js";
import type { AuthenticatedRequest } from "../types/api.types.js";
import { USER_ROLES } from "../config/constants.js";

const router: RouterType = Router();

// All HR routes require authentication and HR access
router.use(authenticate as any);
router.use(requireHRAccess() as any);

// ====================
// EMPLOYEE ENDPOINTS
// ====================

/**
 * GET /hr/employees
 * Get all employees for HR directory
 */
router.get(
  "/employees",
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as unknown as AuthenticatedRequest;
    const employees = await hrService.getEmployeeDirectory(authReq.user);
    sendSuccess(res, employees);
  }),
);

/**
 * GET /hr/employees/:id
 * Get employee by ID
 */
router.get(
  "/employees/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const employee = await hrService.getEmployeeById(req.params.id as string);
    sendSuccess(res, employee);
  }),
);

/**
 * PUT /hr/employees/:id
 * Update employee profile (HR Manager+ only)
 */
router.put(
  "/employees/:id",
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
 * GET /hr/analytics
 * Get HR analytics data
 */
router.get(
  "/analytics",
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
  asyncHandler(async (req: Request, res: Response) => {
    const leaveTypes = await leaveService.getLeaveTypes();
    sendSuccess(res, leaveTypes);
  }),
);

/**
 * GET /hr/leave-stats
 * Get leave statistics for dashboard
 */
router.get(
  "/leave-stats",
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
  asyncHandler(async (req: Request, res: Response) => {
    const { year } = req.query;
    const balances = await leaveService.getUserLeaveBalances(
      req.params.userId as string,
      year ? parseInt(year as string) : undefined,
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
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as unknown as AuthenticatedRequest;
    const { leaveTypeId, startDate, endDate, reason, targetUserId } = req.body;

    if (!leaveTypeId || !startDate || !endDate) {
      throw new ApiError(ERROR_CODES.VALIDATION_ERROR, "leaveTypeId, startDate, and endDate are required");
    }
    if (!targetUserId) {
      throw new ApiError(ERROR_CODES.VALIDATION_ERROR, "targetUserId is required");
    }

    const leave = await leaveService.createLeaveRequest(
      { leaveTypeId, startDate, endDate, reason },
      targetUserId,
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
import {
  createDocumentSchema,
  updateDocumentSchema,
  verifyDocumentSchema,
} from "../validators/documents.validator.js";

/**
 * GET /hr/documents
 * Get all documents with optional filters
 */
router.get(
  "/documents",
  asyncHandler(async (req: Request, res: Response) => {
    const { userId, documentType, isVerified } = req.query;
    const documents = await documentsService.getDocuments({
      userId: userId as string,
      documentType: documentType as any,
      isVerified:
        isVerified === "true"
          ? true
          : isVerified === "false"
            ? false
            : undefined,
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
  asyncHandler(async (req: Request, res: Response) => {
    const documents = await documentsService.getUserDocuments(
      req.params.userId as string,
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
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as unknown as AuthenticatedRequest;
    const input = createDocumentSchema.parse(req.body);
    const document = await documentsService.createDocument(
      input,
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
  asyncHandler(async (req: Request, res: Response) => {
    const input = updateDocumentSchema.parse(req.body);
    const document = await documentsService.updateDocument(
      req.params.id as string,
      input,
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
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as unknown as AuthenticatedRequest;
    if (authReq.user.role === USER_ROLES.EMPLOYEE) {
      throw new ApiError(
        ERROR_CODES.FORBIDDEN,
        "Only HR Managers and Admins can verify documents",
      );
    }
    const input = verifyDocumentSchema.parse(req.body);
    const document = await documentsService.verifyDocument(
      req.params.id as string,
      authReq.user.id,
      input.notes,
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
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as unknown as AuthenticatedRequest;
    if (authReq.user.role === USER_ROLES.EMPLOYEE) {
      throw new ApiError(
        ERROR_CODES.FORBIDDEN,
        "Only HR Managers and Admins can unverify documents",
      );
    }
    const document = await documentsService.unverifyDocument(
      req.params.id as string,
    );
    sendSuccess(res, document);
  }),
);

export default router;
