import { Router, type Router as RouterType, type RequestHandler } from "express";
import multer from "multer";
import { authenticate } from "../../../middleware/auth.middleware.js";
import { requireAnyPermission } from "../../../middleware/authorization.middleware.js";
import { validateBody, validateParams, validateQuery } from "../../../middleware/validation.middleware.js";
import { asyncHandler } from "../../../middleware/error.middleware.js";
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
  verifyDocumentSchema,
} from "../documents/documents.validator.js";
import * as hrController from "./hr.controller.js";

const hrDocumentUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
});

const router: RouterType = Router();

router.use(authenticate as any);

router.get(
  "/employees",
  asyncHandler(hrController.get_employees) as RequestHandler,
);

router.get(
  "/employees/probation",
  requireAnyPermission(["hr:employees_view", "hr:view", "hr:manage"]) as any,
  asyncHandler(hrController.get_employees_probation) as RequestHandler,
);

router.get(
  "/employees/:id",
  asyncHandler(hrController.get_employees_id) as RequestHandler,
);

router.get(
  "/employees/:id/compensation-history",
  requireAnyPermission(["hr:employees_view", "hr:view", "hr:manage"]) as any,
  asyncHandler(hrController.get_employees_id_compensation_history) as RequestHandler,
);

router.put(
  "/employees/:id",
  asyncHandler(hrController.put_employees_id) as RequestHandler,
);

router.get(
  "/analytics/comprehensive",
  requireAnyPermission(["hr:employees_view", "hr:view", "hr:manage"]) as any,
  validateParams(hrEmployeeIdParamSchema),
  asyncHandler(hrController.get_analytics_comprehensive) as RequestHandler,
);

router.get(
  "/analytics",
  asyncHandler(hrController.get_analytics) as RequestHandler,
);

router.get(
  "/on-leave-today",
  requireAnyPermission(["hr:compensation_view", "hr:view", "hr:manage"]) as any,
  validateParams(hrEmployeeIdParamSchema),
  asyncHandler(hrController.get_on_leave_today) as RequestHandler,
);

router.get(
  "/leave-types",
  asyncHandler(hrController.get_leave_types) as RequestHandler,
);

router.get(
  "/leave-types/admin",
  requireAnyPermission(["hr:employees_edit", "hr:manage"]) as any,
  validateParams(hrEmployeeIdParamSchema),
  validateBody(hrEmployeeUpdateSchema),
  asyncHandler(hrController.get_leave_types_admin) as RequestHandler,
);

router.post(
  "/leave-types",
  asyncHandler(hrController.post_leave_types) as RequestHandler,
);

router.patch(
  "/leave-types/:id",
  requireAnyPermission(["hr:analytics_view", "hr:view", "hr:manage"]) as any,
  asyncHandler(hrController.patch_leave_types_id) as RequestHandler,
);

router.get(
  "/leave-stats",
  asyncHandler(hrController.get_leave_stats) as RequestHandler,
);

router.get(
  "/leaves",
  requireAnyPermission(["hr:analytics_view", "hr:view", "hr:manage"]) as any,
  asyncHandler(hrController.get_leaves) as RequestHandler,
);

router.get(
  "/leaves/pending",
  asyncHandler(hrController.get_leaves_pending) as RequestHandler,
);

router.get(
  "/leaves/balances/:userId",
  requireAnyPermission(["hr:dashboard_view", "hr:view", "hr:manage"]) as any,
  asyncHandler(hrController.get_leaves_balances_userId) as RequestHandler,
);

router.post(
  "/leaves",
  asyncHandler(hrController.post_leaves) as RequestHandler,
);

router.post(
  "/leaves/:id/approve",
  requireAnyPermission(["hr:leave_view", "hr:view", "hr:manage"]) as any,
  asyncHandler(hrController.post_leaves_id_approve) as RequestHandler,
);

router.post(
  "/leaves/:id/reject",
  asyncHandler(hrController.post_leaves_id_reject) as RequestHandler,
);

router.get(
  "/document-types/active",
  requireAnyPermission(["hr:leave_manage", "hr:manage"]) as any,
  asyncHandler(hrController.get_document_types_active) as RequestHandler,
);

router.get(
  "/document-types",
  asyncHandler(hrController.get_document_types) as RequestHandler,
);

router.post(
  "/document-types",
  requireAnyPermission(["hr:leave_manage", "hr:manage"]) as any,
  validateBody(hrCreateLeaveTypeSchema),
  asyncHandler(hrController.post_document_types) as RequestHandler,
);

router.patch(
  "/document-types/:id",
  asyncHandler(hrController.patch_document_types_id) as RequestHandler,
);

router.post(
  "/documents/upload",
  requireAnyPermission(["hr:leave_manage", "hr:manage"]) as any,
  validateParams(leaveTypeIdParamSchema),
  validateBody(hrUpdateLeaveTypeSchema),
  asyncHandler(hrController.post_documents_upload) as RequestHandler,
);

router.post(
  "/documents/my/upload",
  asyncHandler(hrController.post_documents_my_upload) as RequestHandler,
);

router.get(
  "/documents",
  requireAnyPermission(["hr:documents_view", "hr:view", "hr:manage"]) as any,
  validateQuery(documentQuerySchema),
  asyncHandler(hrController.get_documents) as RequestHandler,
);

router.get(
  "/documents/stats",
  requireAnyPermission(["hr:documents_view", "hr:view", "hr:manage"]) as any,
  asyncHandler(hrController.get_documents_stats) as RequestHandler,
);

router.get(
  "/documents/user/:userId",
  validateParams(documentUserIdParamSchema),
  asyncHandler(hrController.get_documents_user_userId) as RequestHandler,
);

router.get(
  "/documents/:id",
  validateParams(documentIdParamSchema),
  asyncHandler(hrController.get_documents_id) as RequestHandler,
);

router.post(
  "/documents",
  requireAnyPermission(["hr:documents_manage", "hr:manage"]) as any,
  validateBody(createDocumentSchema),
  asyncHandler(hrController.post_documents) as RequestHandler,
);

router.put(
  "/documents/:id",
  requireAnyPermission(["hr:documents_manage", "hr:manage"]) as any,
  validateParams(documentIdParamSchema),
  validateBody(updateDocumentSchema),
  asyncHandler(hrController.put_documents_id) as RequestHandler,
);

router.delete(
  "/documents/:id",
  requireAnyPermission(["hr:documents_delete", "hr:manage"]) as any,
  validateParams(documentIdParamSchema),
  asyncHandler(hrController.delete_documents_id) as RequestHandler,
);

router.post(
  "/documents/:id/verify",
  requireAnyPermission(["hr:documents_manage", "hr:manage"]) as any,
  validateParams(documentIdParamSchema),
  validateBody(verifyDocumentSchema),
  asyncHandler(hrController.post_documents_id_verify) as RequestHandler,
);

router.post(
  "/documents/:id/reject",
  requireAnyPermission(["hr:documents_manage", "hr:manage"]) as any,
  validateParams(documentIdParamSchema),
  validateBody(rejectDocumentSchema),
  asyncHandler(hrController.post_documents_id_reject) as RequestHandler,
);

router.post(
  "/documents/:id/unverify",
  requireAnyPermission(["hr:documents_manage", "hr:manage"]) as any,
  validateParams(documentIdParamSchema),
  asyncHandler(hrController.post_documents_id_unverify) as RequestHandler,
);

router.get(
  "/analytics/headcount",
  requireAnyPermission(["hr:leave_approve", "hr:manage"]) as any,
  validateParams(leaveRequestIdParamSchema),
  validateBody(hrLeaveDecisionSchema),
  asyncHandler(hrController.get_analytics_headcount) as RequestHandler,
);

router.get(
  "/analytics/leaves",
  asyncHandler(hrController.get_analytics_leaves) as RequestHandler,
);

router.get(
  "/analytics/recruitment",
  requireAnyPermission(["hr:leave_approve", "hr:manage"]) as any,
  validateParams(leaveRequestIdParamSchema),
  validateBody(hrLeaveDecisionSchema),
  asyncHandler(hrController.get_analytics_recruitment) as RequestHandler,
);

router.get(
  "/analytics/payroll",
  asyncHandler(hrController.get_analytics_payroll) as RequestHandler,
);

router.get(
  "/analytics/performance",
  asyncHandler(hrController.get_analytics_performance) as RequestHandler,
);

router.get(
  "/analytics/compliance",
  asyncHandler(hrController.get_analytics_compliance) as RequestHandler,
);

router.get(
  "/analytics/alerts",
  requireAnyPermission(["hr:documents_view", "hr:view", "hr:manage"]) as any,
  asyncHandler(hrController.get_analytics_alerts) as RequestHandler,
);

router.get(
  "/analytics/activity-feed",
  asyncHandler(hrController.get_analytics_activity_feed) as RequestHandler,
);

export default router;
