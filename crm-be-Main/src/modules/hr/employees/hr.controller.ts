import { Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "../../../types/api.types.js";
import { sendSuccess, ApiError } from "../../../utils/responses.js";
import { ERROR_CODES } from "../../../utils/error-codes.js";
import * as hrService from "./hr.service.js";
import * as hrAnalyticsService from "../analytics/hr-analytics.service.js";
import * as leaveService from "../leave/leave.service.js";
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
} from "./hr.validator.js";
import * as documentsService from "../documents/documents.service.js";
import * as documentTypesService from "../documents/document-types.service.js";
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
} from "../documents/documents.validator.js";
import multer from "multer";

export const get_employees = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {

    const employees = await hrService.getEmployeeDirectory(req.user);
    sendSuccess(res, employees);
  } catch (error) {
    next(error);
  }
};

export const get_employees_probation = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {

    const employees = await hrService.getEmployeesOnProbation();
    sendSuccess(res, employees);
  } catch (error) {
    next(error);
  }
};

export const get_employees_id = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {

    const employee = await hrService.getEmployeeById(req.params.id as string);
    sendSuccess(res, employee);
  } catch (error) {
    next(error);
  }
};

export const get_employees_id_compensation_history = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {

    const history = await hrService.getEmployeeCompensationHistory(req.params.id as string);
    sendSuccess(res, history);
  } catch (error) {
    next(error);
  }
};

export const put_employees_id = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {

    const employee = await hrService.updateEmployeeProfile(
      req.params.id as string,
      req.body,
      req.user,
    );
    sendSuccess(res, employee);
  } catch (error) {
    next(error);
  }
};

export const get_analytics_comprehensive = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {

    const analytics = await hrAnalyticsService.getComprehensiveAnalytics();
    sendSuccess(res, analytics);
  } catch (error) {
    next(error);
  }
};

export const get_analytics = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {

    const analytics = await hrService.getHRAnalytics();
    sendSuccess(res, analytics);
  } catch (error) {
    next(error);
  }
};

export const get_on_leave_today = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {

    const employees = await hrService.getEmployeesOnLeaveToday();
    sendSuccess(res, employees);
  } catch (error) {
    next(error);
  }
};

export const get_leave_types = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {

    const leaveTypes = await leaveService.getLeaveTypes();
    sendSuccess(res, leaveTypes);
  } catch (error) {
    next(error);
  }
};

export const get_leave_types_admin = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {

    const leaveTypes = await leaveService.getLeaveTypesAdmin();
    sendSuccess(res, leaveTypes);
  } catch (error) {
    next(error);
  }
};

export const post_leave_types = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {

    const { name, description, daysAllowed, isPaid, carryForward } = req.body;
    const created = await leaveService.createLeaveType({
      name,
      description,
      daysAllowed,
      isPaid,
      carryForward,
    });
    sendSuccess(res, created);
  } catch (error) {
    next(error);
  }
};

export const patch_leave_types_id = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {

    const updated = await leaveService.updateLeaveType(
      req.params.id as string,
      req.body,
    );
    sendSuccess(res, updated);
  } catch (error) {
    next(error);
  }
};

export const get_leave_stats = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {

    const stats = await leaveService.getLeaveStats();
    sendSuccess(res, stats);
  } catch (error) {
    next(error);
  }
};

export const get_leaves = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {

    const { userId, status, startDate, endDate } = req.query;
    const leaves = await leaveService.getLeaveRequests(
      {
        userId: userId as string,
        status: status as string,
        startDate: startDate as string,
        endDate: endDate as string,
      },
      req.user,
    );
    sendSuccess(res, leaves);
  } catch (error) {
    next(error);
  }
};

export const get_leaves_pending = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {

    const leaves = await leaveService.getPendingLeaveRequests();
    sendSuccess(res, leaves);
  } catch (error) {
    next(error);
  }
};

export const get_leaves_balances_userId = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {

    const { year } = req.query;
    const balances = await leaveService.getUserLeaveBalances(
      req.params.userId as string,
      typeof year === "number" ? year : undefined,
    );
    sendSuccess(res, balances);
  } catch (error) {
    next(error);
  }
};

export const post_leaves = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {

    const { leaveTypeId, startDate, endDate, reason, targetUserId } = req.body;

    const leave = await leaveService.createLeaveRequest(
      { leaveTypeId, startDate, endDate, reason },
      targetUserId,
      { skipBalanceCheck: true },
    );
    sendSuccess(res, leave);
  } catch (error) {
    next(error);
  }
};

export const post_leaves_id_approve = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {

    const { notes } = req.body;
    const leave = await leaveService.approveLeaveRequest(
      req.params.id as string,
      req.user.id,
      notes,
    );
    sendSuccess(res, leave);
  } catch (error) {
    next(error);
  }
};

export const post_leaves_id_reject = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {

    const { notes } = req.body;
    const leave = await leaveService.rejectLeaveRequest(
      req.params.id as string,
      req.user.id,
      notes,
    );
    sendSuccess(res, leave);
  } catch (error) {
    next(error);
  }
};

export const get_document_types_active = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {

    const rows = await documentTypesService.listDocumentTypes({ activeOnly: true });
    sendSuccess(res, rows);
  } catch (error) {
    next(error);
  }
};

export const get_document_types = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {

    const activeOnly = req.query.activeOnly === "true";
    const rows = await documentTypesService.listDocumentTypes({ activeOnly });
    sendSuccess(res, rows);
  } catch (error) {
    next(error);
  }
};

export const post_document_types = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {

    const row = await documentTypesService.createDocumentType(req.body);
    sendSuccess(res, row, 201);
  } catch (error) {
    next(error);
  }
};

export const patch_document_types_id = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {

    const row = await documentTypesService.updateDocumentType(
      req.params.id as string,
      req.body,
    );
    sendSuccess(res, row);
  } catch (error) {
    next(error);
  }
};

export const post_documents_upload = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {

    if (!req.file) {
      throw ApiError.badRequest("File is required");
    }
    const parsed = uploadHrDocumentFormSchema.safeParse(req.body);
    if (!parsed.success) {
      const msg = parsed.error.issues.map((i) => i.message).join("; ");
      throw ApiError.badRequest(msg || "Invalid form data");
    }
    const document = await documentsService.createDocumentWithUploadedFile(
      {
        userId: parsed.data.userId,
        documentType: parsed.data.documentType,
        documentName: parsed.data.documentName,
        fileName: req.file.originalname,
        fileBuffer: req.file.buffer,
        mimeType: req.file.mimetype || "application/octet-stream",
        fileSize: req.file.size,
        notes: parsed.data.notes,
      },
      req.user.id,
    );
    sendSuccess(res, document, 201);
  } catch (error) {
    next(error);
  }
};

export const post_documents_my_upload = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {

    if (!req.file) {
      throw ApiError.badRequest("File is required");
    }

    const parsed = uploadMyDocumentFormSchema.safeParse(req.body);
    if (!parsed.success) {
      const msg = parsed.error.issues.map((i) => i.message).join("; ");
      throw ApiError.badRequest(msg || "Invalid form data");
    }

    const document = await documentsService.createDocumentWithUploadedFile(
      {
        userId: req.user.id,
        documentType: parsed.data.documentType,
        documentName: parsed.data.documentName,
        fileName: req.file.originalname,
        fileBuffer: req.file.buffer,
        mimeType: req.file.mimetype || "application/octet-stream",
        fileSize: req.file.size,
        notes: parsed.data.notes,
      },
      req.user.id,
    );

    await documentsService.notifyHrOnDocumentSubmission({
      documentId: document.id,
      submittedByUserId: req.user.id,
      documentName: document.documentName,
      documentType: document.documentType,
    });

    sendSuccess(res, document, 201);
  } catch (error) {
    next(error);
  }
};

export const get_documents = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {

    const { userId, documentType, isVerified } = req.query;
    const documents = await documentsService.getDocuments({
      userId: userId as string,
      documentType: documentType as any,
      isVerified: isVerified as boolean | undefined,
    });
    sendSuccess(res, documents);
  } catch (error) {
    next(error);
  }
};

export const get_documents_stats = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {

    const stats = await documentsService.getDocumentStats();
    sendSuccess(res, stats);
  } catch (error) {
    next(error);
  }
};

export const get_documents_user_userId = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {

    const targetUserId = req.params.userId as string;

    // Self-service: employees/managers can view their own HR documents
    // without needing hr:documents_view / hr:view / hr:manage.
    const isSelf = req.user.id === targetUserId;
    if (!isSelf) {
      const perms = req.user.permissions || [];
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
  } catch (error) {
    next(error);
  }
};

export const get_documents_id = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {

    const document = await documentsService.getDocumentById(
      req.params.id as string,
    );
    sendSuccess(res, document);
  } catch (error) {
    next(error);
  }
};

export const post_documents = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {

    const document = await documentsService.createDocument(
      req.body,
      req.user.id,
    );
    sendSuccess(res, document, 201);
  } catch (error) {
    next(error);
  }
};

export const put_documents_id = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {

    const document = await documentsService.updateDocument(
      req.params.id as string,
      req.body,
    );
    sendSuccess(res, document);
  } catch (error) {
    next(error);
  }
};

export const delete_documents_id = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {

    await documentsService.deleteDocument(req.params.id as string);
    sendSuccess(res, { message: "Document deleted successfully" });
  } catch (error) {
    next(error);
  }
};

export const post_documents_id_verify = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {

    const document = await documentsService.verifyDocument(
      req.params.id as string,
      req.user.id,
      (req.body as { notes?: string }).notes,
    );
    sendSuccess(res, document);
  } catch (error) {
    next(error);
  }
};

export const post_documents_id_reject = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {

    const body = req.body as { reason: string };
    const document = await documentsService.rejectDocument(
      req.params.id as string,
      req.user.id,
      body.reason,
    );
    sendSuccess(res, document);
  } catch (error) {
    next(error);
  }
};

export const post_documents_id_unverify = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {

    const document = await documentsService.unverifyDocument(
      req.params.id as string,
    );
    sendSuccess(res, document);
  } catch (error) {
    next(error);
  }
};

export const get_analytics_headcount = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {

    const analytics = await hrAnalyticsService.getHeadcountAnalytics();
    sendSuccess(res, analytics);
  } catch (error) {
    next(error);
  }
};

export const get_analytics_leaves = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {

    const analytics = await hrAnalyticsService.getLeaveAnalytics();
    sendSuccess(res, analytics);
  } catch (error) {
    next(error);
  }
};

export const get_analytics_recruitment = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {

    const analytics = await hrAnalyticsService.getRecruitmentAnalytics();
    sendSuccess(res, analytics);
  } catch (error) {
    next(error);
  }
};

export const get_analytics_payroll = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {

    const analytics = await hrAnalyticsService.getPayrollAnalytics();
    sendSuccess(res, analytics);
  } catch (error) {
    next(error);
  }
};

export const get_analytics_performance = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {

    const analytics = await hrAnalyticsService.getPerformanceAnalytics();
    sendSuccess(res, analytics);
  } catch (error) {
    next(error);
  }
};

export const get_analytics_compliance = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {

    const analytics = await hrAnalyticsService.getComplianceAnalytics();
    sendSuccess(res, analytics);
  } catch (error) {
    next(error);
  }
};

export const get_analytics_alerts = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {

    const alerts = await hrAnalyticsService.getSystemAlerts();
    sendSuccess(res, alerts);
  } catch (error) {
    next(error);
  }
};

export const get_analytics_activity_feed = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {

    const limit = parseInt(req.query.limit as string) || 15;
    const feed = await hrAnalyticsService.getActivityFeed(limit);
    sendSuccess(res, feed);
  } catch (error) {
    next(error);
  }
};

