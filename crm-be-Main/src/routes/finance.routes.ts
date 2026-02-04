import { Router, type Router as RouterType } from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import {
  requireManager,
  requireAdmin,
} from "../middleware/authorization.middleware.js";
import { validateBody } from "../middleware/validation.middleware.js";
import { asyncHandler } from "../middleware/error.middleware.js";
import {
  sendSuccess,
  sendCreated,
  sendNoContent,
  ApiError,
} from "../utils/responses.js";
import { ERROR_CODES } from "../utils/error-codes.js";
import type { Request, Response } from "express";
import type { AuthenticatedRequest } from "../types/api.types.js";

// Services
import * as invoiceService from "../services/finance/invoice.service.js";
import * as paymentService from "../services/finance/payment.service.js";
import * as expenseService from "../services/finance/expense.service.js";
import * as emailRequestService from "../services/finance/email-request.service.js";
import * as approvalService from "../services/finance/approval.service.js";
import * as recurringService from "../services/finance/recurring.service.js";
import * as dashboardService from "../services/finance/finance-dashboard.service.js";
import * as scheduledEmailService from "../services/finance/scheduled-email.service.js";

// Validators
import {
  createInvoiceSchema,
  updateInvoiceSchema,
  createPaymentSchema,
  updatePaymentSchema,
  createExpenseSchema,
  updateExpenseSchema,
  createEmailRequestSchema,
  updateEmailRequestSchema,
  scheduleEmailSchema,
  createRecurringScheduleSchema,
  updateRecurringScheduleSchema,
  createExpenseCategorySchema,
  updateExpenseCategorySchema,
  rejectSchema,
  bulkApproveSchema,
} from "../validators/finance.validator.js";

const router: RouterType = Router();

// All routes require authentication
router.use(authenticate as any);

// ============================================
// INVOICE ROUTES
// ============================================

/**
 * GET /finance/invoices
 * List invoices (role-filtered)
 */
router.get(
  "/invoices",
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as unknown as AuthenticatedRequest;
    const filters = {
      status: req.query["status"] as string,
      lead_id: req.query["lead_id"] as string,
      created_by: req.query["created_by"] as string,
      department_id: req.query["department_id"] as string,
      from_date: req.query["from_date"] as string,
      to_date: req.query["to_date"] as string,
      search: req.query["search"] as string,
    };
    const limit = parseInt(req.query["limit"] as string) || 50;
    const offset = parseInt(req.query["offset"] as string) || 0;

    const result = await invoiceService.getInvoices(
      authReq.user.id,
      authReq.user.role,
      authReq.user.departmentId,
      filters,
      { limit, offset },
    );

    sendSuccess(res, result);
  }),
);

/**
 * GET /finance/invoices/:id
 * Get invoice detail
 */
router.get(
  "/invoices/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const invoice = await invoiceService.getInvoiceById(
      req.params["id"] as string,
    );
    sendSuccess(res, invoice);
  }),
);

/**
 * POST /finance/invoices
 * Create invoice
 */
router.post(
  "/invoices",
  validateBody(createInvoiceSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as unknown as AuthenticatedRequest;
    const invoice = await invoiceService.createInvoice(
      req.body,
      authReq.user.id,
    );
    sendCreated(res, invoice);
  }),
);

/**
 * PUT /finance/invoices/:id
 * Update draft invoice
 */
router.put(
  "/invoices/:id",
  validateBody(updateInvoiceSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as unknown as AuthenticatedRequest;
    const invoice = await invoiceService.updateInvoice(
      req.params["id"] as string,
      req.body,
      authReq.user.id,
    );
    sendSuccess(res, invoice);
  }),
);

/**
 * POST /finance/invoices/:id/submit
 * Submit invoice for approval
 */
router.post(
  "/invoices/:id/submit",
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as unknown as AuthenticatedRequest;
    const invoice = await invoiceService.submitInvoiceForApproval(
      req.params["id"] as string,
      authReq.user.id,
    );
    sendSuccess(res, invoice);
  }),
);

/**
 * POST /finance/invoices/:id/approve
 * Approve invoice (Manager/Admin)
 */
router.post(
  "/invoices/:id/approve",
  requireManager as any,
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as unknown as AuthenticatedRequest;
    const invoice = await invoiceService.approveInvoice(
      req.params["id"] as string,
      authReq.user.id,
    );
    sendSuccess(res, invoice);
  }),
);

/**
 * POST /finance/invoices/:id/reject
 * Reject invoice (Manager/Admin)
 */
router.post(
  "/invoices/:id/reject",
  requireManager as any,
  validateBody(rejectSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as unknown as AuthenticatedRequest;
    const invoice = await invoiceService.rejectInvoice(
      req.params["id"] as string,
      authReq.user.id,
      req.body.reason,
    );
    sendSuccess(res, invoice);
  }),
);

/**
 * POST /finance/invoices/:id/cancel
 * Cancel invoice (Manager/Admin)
 */
router.post(
  "/invoices/:id/cancel",
  requireManager as any,
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as unknown as AuthenticatedRequest;
    const invoice = await invoiceService.cancelInvoice(
      req.params["id"] as string,
      authReq.user.id,
    );
    sendSuccess(res, invoice);
  }),
);

/**
 * POST /finance/invoices/:id/mark-sent
 * Mark invoice as sent
 */
router.post(
  "/invoices/:id/mark-sent",
  requireManager as any,
  asyncHandler(async (req: Request, res: Response) => {
    const invoice = await invoiceService.markInvoiceSent(
      req.params["id"] as string,
    );
    sendSuccess(res, invoice);
  }),
);

// ============================================
// PAYMENT ROUTES
// ============================================

/**
 * GET /finance/payments
 * List all payments (Manager/Admin)
 */
router.get(
  "/payments",
  requireManager as any,
  asyncHandler(async (req: Request, res: Response) => {
    const filters = {
      invoice_id: req.query["invoice_id"] as string,
      status: req.query["status"] as string,
      payment_mode: req.query["payment_mode"] as string,
      from_date: req.query["from_date"] as string,
      to_date: req.query["to_date"] as string,
    };
    const limit = parseInt(req.query["limit"] as string) || 50;
    const offset = parseInt(req.query["offset"] as string) || 0;

    const result = await paymentService.getPayments(filters, { limit, offset });
    sendSuccess(res, result);
  }),
);

/**
 * GET /finance/invoices/:id/payments
 * Get payments for specific invoice
 */
router.get(
  "/invoices/:id/payments",
  asyncHandler(async (req: Request, res: Response) => {
    const payments = await paymentService.getPaymentsForInvoice(
      req.params["id"] as string,
    );
    sendSuccess(res, payments);
  }),
);

/**
 * POST /finance/invoices/:id/payments
 * Record payment for invoice (Manager/Admin)
 */
router.post(
  "/invoices/:id/payments",
  requireManager as any,
  validateBody(createPaymentSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as unknown as AuthenticatedRequest;
    const payment = await paymentService.recordPayment(
      { ...req.body, invoice_id: req.params["id"] },
      authReq.user.id,
    );
    sendCreated(res, payment);
  }),
);

/**
 * PUT /finance/payments/:id
 * Update payment (Manager/Admin)
 */
router.put(
  "/payments/:id",
  requireManager as any,
  validateBody(updatePaymentSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as unknown as AuthenticatedRequest;
    const payment = await paymentService.updatePayment(
      req.params["id"] as string,
      req.body,
      authReq.user.id,
    );
    sendSuccess(res, payment);
  }),
);

// ============================================
// EXPENSE ROUTES
// ============================================

/**
 * GET /finance/expenses
 * List expenses (role-filtered)
 */
router.get(
  "/expenses",
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as unknown as AuthenticatedRequest;
    const filters = {
      status: req.query["status"] as string,
      category_id: req.query["category_id"] as string,
      department_id: req.query["department_id"] as string,
      submitted_by: req.query["submitted_by"] as string,
      from_date: req.query["from_date"] as string,
      to_date: req.query["to_date"] as string,
      search: req.query["search"] as string,
    };
    const limit = parseInt(req.query["limit"] as string) || 50;
    const offset = parseInt(req.query["offset"] as string) || 0;

    const result = await expenseService.getExpenses(
      authReq.user.id,
      authReq.user.role,
      authReq.user.departmentId,
      filters,
      { limit, offset },
    );

    sendSuccess(res, result);
  }),
);

/**
 * GET /finance/expenses/:id
 * Get expense detail
 */
router.get(
  "/expenses/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const expense = await expenseService.getExpenseById(
      req.params["id"] as string,
    );
    sendSuccess(res, expense);
  }),
);

/**
 * POST /finance/expenses
 * Submit expense
 */
router.post(
  "/expenses",
  validateBody(createExpenseSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as unknown as AuthenticatedRequest;
    const expense = await expenseService.submitExpense(
      req.body,
      authReq.user.id,
    );
    sendCreated(res, expense);
  }),
);

/**
 * PUT /finance/expenses/:id
 * Update pending expense
 */
router.put(
  "/expenses/:id",
  validateBody(updateExpenseSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as unknown as AuthenticatedRequest;
    const expense = await expenseService.updateExpense(
      req.params["id"] as string,
      req.body,
      authReq.user.id,
    );
    sendSuccess(res, expense);
  }),
);

/**
 * POST /finance/expenses/:id/approve
 * Approve expense (Manager/Admin)
 */
router.post(
  "/expenses/:id/approve",
  requireManager as any,
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as unknown as AuthenticatedRequest;
    const expense = await expenseService.approveExpense(
      req.params["id"] as string,
      authReq.user.id,
    );
    sendSuccess(res, expense);
  }),
);

/**
 * POST /finance/expenses/:id/reject
 * Reject expense (Manager/Admin)
 */
router.post(
  "/expenses/:id/reject",
  requireManager as any,
  validateBody(rejectSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as unknown as AuthenticatedRequest;
    const expense = await expenseService.rejectExpense(
      req.params["id"] as string,
      authReq.user.id,
      req.body.reason,
    );
    sendSuccess(res, expense);
  }),
);

// ============================================
// EXPENSE CATEGORY ROUTES
// ============================================

/**
 * GET /finance/expense-categories
 * List categories
 */
router.get(
  "/expense-categories",
  asyncHandler(async (req: Request, res: Response) => {
    const activeOnly = req.query["active_only"] !== "false";
    const categories = await expenseService.getExpenseCategories(activeOnly);
    sendSuccess(res, categories);
  }),
);

/**
 * POST /finance/expense-categories
 * Create category (Admin)
 */
router.post(
  "/expense-categories",
  requireAdmin as any,
  validateBody(createExpenseCategorySchema),
  asyncHandler(async (req: Request, res: Response) => {
    const category = await expenseService.createExpenseCategory(req.body);
    sendCreated(res, category);
  }),
);

/**
 * PUT /finance/expense-categories/:id
 * Update category (Admin)
 */
router.put(
  "/expense-categories/:id",
  requireAdmin as any,
  validateBody(updateExpenseCategorySchema),
  asyncHandler(async (req: Request, res: Response) => {
    const category = await expenseService.updateExpenseCategory(
      req.params["id"] as string,
      req.body,
    );
    sendSuccess(res, category);
  }),
);

// ============================================
// APPROVAL ROUTES
// ============================================

/**
 * GET /finance/approvals
 * Get pending approvals (Manager/Admin)
 */
router.get(
  "/approvals",
  requireManager as any,
  asyncHandler(async (req: Request, res: Response) => {
    const filters = {
      approval_type: req.query["type"] as string,
    };
    const limit = parseInt(req.query["limit"] as string) || 50;
    const offset = parseInt(req.query["offset"] as string) || 0;

    const result = await approvalService.getPendingApprovals(filters, {
      limit,
      offset,
    });
    sendSuccess(res, result);
  }),
);

/**
 * GET /finance/approvals/count
 * Get pending approval count
 */
router.get(
  "/approvals/count",
  requireManager as any,
  asyncHandler(async (req: Request, res: Response) => {
    const type = req.query["type"] as string;
    const count = await approvalService.getPendingApprovalCount(type);
    sendSuccess(res, { count });
  }),
);

/**
 * POST /finance/approvals/bulk-approve
 * Bulk approve (Admin - can approve own items too)
 */
router.post(
  "/approvals/bulk-approve",
  requireAdmin as any,
  validateBody(bulkApproveSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as unknown as AuthenticatedRequest;
    const result = await approvalService.bulkApprove(
      req.body.approval_ids,
      authReq.user.id,
    );
    sendSuccess(res, result);
  }),
);

// ============================================
// EMAIL REQUEST ROUTES
// ============================================

/**
 * GET /finance/email-requests
 * List email requests
 */
router.get(
  "/email-requests",
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as unknown as AuthenticatedRequest;
    const filters = {
      status: req.query["status"] as string,
      email_type: req.query["email_type"] as string,
      sender_id: req.query["sender_id"] as string,
      invoice_id: req.query["invoice_id"] as string,
    };
    const limit = parseInt(req.query["limit"] as string) || 50;
    const offset = parseInt(req.query["offset"] as string) || 0;

    const result = await emailRequestService.getEmailRequests(
      authReq.user.id,
      authReq.user.role,
      filters,
      { limit, offset },
    );

    sendSuccess(res, result);
  }),
);

/**
 * GET /finance/email-requests/:id
 * Get email request detail
 */
router.get(
  "/email-requests/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const emailRequest = await emailRequestService.getEmailRequestById(
      req.params["id"] as string,
    );
    sendSuccess(res, emailRequest);
  }),
);

/**
 * POST /finance/email-requests
 * Create email request
 */
router.post(
  "/email-requests",
  validateBody(createEmailRequestSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as unknown as AuthenticatedRequest;
    const emailRequest = await emailRequestService.createEmailRequest(
      req.body,
      authReq.user.id,
    );
    sendCreated(res, emailRequest);
  }),
);

/**
 * PUT /finance/email-requests/:id
 * Update draft email request
 */
router.put(
  "/email-requests/:id",
  validateBody(updateEmailRequestSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as unknown as AuthenticatedRequest;
    const emailRequest = await emailRequestService.updateEmailRequest(
      req.params["id"] as string,
      req.body,
      authReq.user.id,
    );
    sendSuccess(res, emailRequest);
  }),
);

/**
 * POST /finance/email-requests/:id/submit
 * Submit for approval
 */
router.post(
  "/email-requests/:id/submit",
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as unknown as AuthenticatedRequest;
    const emailRequest =
      await emailRequestService.submitEmailRequestForApproval(
        req.params["id"] as string,
        authReq.user.id,
      );
    sendSuccess(res, emailRequest);
  }),
);

/**
 * POST /finance/email-requests/:id/approve
 * Approve email request (Manager/Admin)
 */
router.post(
  "/email-requests/:id/approve",
  requireManager as any,
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as unknown as AuthenticatedRequest;
    const emailRequest = await emailRequestService.approveEmailRequest(
      req.params["id"] as string,
      authReq.user.id,
    );
    sendSuccess(res, emailRequest);
  }),
);

/**
 * POST /finance/email-requests/:id/reject
 * Reject email request (Manager/Admin)
 */
router.post(
  "/email-requests/:id/reject",
  requireManager as any,
  validateBody(rejectSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as unknown as AuthenticatedRequest;
    const emailRequest = await emailRequestService.rejectEmailRequest(
      req.params["id"] as string,
      authReq.user.id,
      req.body.reason,
    );
    sendSuccess(res, emailRequest);
  }),
);

/**
 * POST /finance/email-requests/:id/send
 * Send approved email immediately
 */
router.post(
  "/email-requests/:id/send",
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as unknown as AuthenticatedRequest;

    // Get email request
    const emailRequest = await emailRequestService.getEmailRequestById(
      req.params["id"] as string,
    );

    if (!emailRequest) {
      throw new ApiError(ERROR_CODES.NOT_FOUND);
    }

    if (emailRequest.status !== "approved") {
      throw new ApiError(
        ERROR_CODES.VALIDATION_ERROR,
        "Email must be approved before sending",
      );
    }

    if (
      emailRequest.sender_id !== authReq.user.id &&
      authReq.user.role === "employee"
    ) {
      throw new ApiError(
        ERROR_CODES.FORBIDDEN,
        "You can only send your own emails",
      );
    }

    // Import user email service dynamically to avoid circular dependency
    const { sendUserEmail } = await import("../services/user-email.service.js");

    const result = await sendUserEmail(emailRequest.sender_id, {
      to: emailRequest.recipient_email,
      toName: emailRequest.recipient_name,
      subject: emailRequest.subject,
      html: emailRequest.body,
      leadId: emailRequest.lead_id,
    });

    if (result.success) {
      await emailRequestService.markEmailSent(req.params["id"] as string);
      sendSuccess(res, { message: "Email sent successfully" });
    } else {
      await emailRequestService.markEmailFailed(
        req.params["id"] as string,
        result.error || "Unknown error",
      );
      throw new ApiError(
        ERROR_CODES.INTERNAL_ERROR,
        result.error || "Failed to send email",
      );
    }
  }),
);

/**
 * POST /finance/email-requests/:id/schedule
 * Schedule approved email
 */
router.post(
  "/email-requests/:id/schedule",
  validateBody(scheduleEmailSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as unknown as AuthenticatedRequest;
    const scheduled = await emailRequestService.scheduleEmail(
      req.params["id"] as string,
      req.body.scheduled_for,
      authReq.user.id,
    );
    sendSuccess(res, scheduled);
  }),
);

// ============================================
// RECURRING SCHEDULE ROUTES
// ============================================

/**
 * GET /finance/recurring
 * List recurring schedules (Manager/Admin)
 */
router.get(
  "/recurring",
  requireManager as any,
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as unknown as AuthenticatedRequest;
    const filters = {
      is_active:
        req.query["is_active"] === "true"
          ? true
          : req.query["is_active"] === "false"
            ? false
            : undefined,
      lead_id: req.query["lead_id"] as string,
    };
    const limit = parseInt(req.query["limit"] as string) || 50;
    const offset = parseInt(req.query["offset"] as string) || 0;

    const result = await recurringService.getRecurringSchedules(
      authReq.user.id,
      authReq.user.role,
      filters,
      { limit, offset },
    );

    sendSuccess(res, result);
  }),
);

/**
 * GET /finance/recurring/:id
 * Get schedule detail
 */
router.get(
  "/recurring/:id",
  requireManager as any,
  asyncHandler(async (req: Request, res: Response) => {
    const schedule = await recurringService.getRecurringScheduleById(
      req.params["id"] as string,
    );
    sendSuccess(res, schedule);
  }),
);

/**
 * POST /finance/recurring
 * Create recurring schedule (Manager/Admin)
 */
router.post(
  "/recurring",
  requireManager as any,
  validateBody(createRecurringScheduleSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as unknown as AuthenticatedRequest;
    const schedule = await recurringService.createRecurringSchedule(
      req.body,
      authReq.user.id,
    );
    sendCreated(res, schedule);
  }),
);

/**
 * PUT /finance/recurring/:id
 * Update schedule (Manager/Admin)
 */
router.put(
  "/recurring/:id",
  requireManager as any,
  validateBody(updateRecurringScheduleSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as unknown as AuthenticatedRequest;
    const schedule = await recurringService.updateRecurringSchedule(
      req.params["id"] as string,
      req.body,
      authReq.user.id,
    );
    sendSuccess(res, schedule);
  }),
);

/**
 * POST /finance/recurring/:id/pause
 * Pause schedule
 */
router.post(
  "/recurring/:id/pause",
  requireManager as any,
  asyncHandler(async (req: Request, res: Response) => {
    const schedule = await recurringService.pauseRecurringSchedule(
      req.params["id"] as string,
    );
    sendSuccess(res, schedule);
  }),
);

/**
 * POST /finance/recurring/:id/resume
 * Resume schedule
 */
router.post(
  "/recurring/:id/resume",
  requireManager as any,
  asyncHandler(async (req: Request, res: Response) => {
    const schedule = await recurringService.resumeRecurringSchedule(
      req.params["id"] as string,
    );
    sendSuccess(res, schedule);
  }),
);

/**
 * DELETE /finance/recurring/:id
 * Delete schedule (Admin only)
 */
router.delete(
  "/recurring/:id",
  requireAdmin as any,
  asyncHandler(async (req: Request, res: Response) => {
    await recurringService.deleteRecurringSchedule(req.params["id"] as string);
    sendNoContent(res);
  }),
);

// ============================================
// DASHBOARD ROUTES
// ============================================

/**
 * GET /finance/dashboard
 * Get finance dashboard data (Manager/Admin)
 */
router.get(
  "/dashboard",
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as unknown as AuthenticatedRequest;
    const departmentId = req.query["department_id"] as string;

    // If employee, only show their own data
    const userId =
      authReq.user.role === "employee" ? authReq.user.id : undefined;

    const data = await dashboardService.getFinanceDashboard(
      departmentId,
      userId,
    );
    sendSuccess(res, data);
  }),
);

/**
 * GET /finance/dashboard/revenue-trend
 * Get monthly revenue trend
 */
router.get(
  "/dashboard/revenue-trend",
  requireManager as any,
  asyncHandler(async (req: Request, res: Response) => {
    const departmentId = req.query["department_id"] as string;
    const data = await dashboardService.getMonthlyRevenueTrend(departmentId);
    sendSuccess(res, data);
  }),
);

/**
 * GET /finance/dashboard/invoice-status
 * Get invoice status distribution
 */
router.get(
  "/dashboard/invoice-status",
  requireManager as any,
  asyncHandler(async (req: Request, res: Response) => {
    const departmentId = req.query["department_id"] as string;
    const data =
      await dashboardService.getInvoiceStatusDistribution(departmentId);
    sendSuccess(res, data);
  }),
);

/**
 * GET /finance/dashboard/outstanding-clients
 * Get top outstanding clients
 */
router.get(
  "/dashboard/outstanding-clients",
  requireManager as any,
  asyncHandler(async (req: Request, res: Response) => {
    const departmentId = req.query["department_id"] as string;
    const limit = parseInt(req.query["limit"] as string) || 5;
    const data = await dashboardService.getTopOutstandingClients(
      departmentId,
      limit,
    );
    sendSuccess(res, data);
  }),
);

/**
 * GET /finance/dashboard/activity
 * Get recent finance activity
 */
router.get(
  "/dashboard/activity",
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as unknown as AuthenticatedRequest;
    const departmentId = req.query["department_id"] as string;
    const limit = parseInt(req.query["limit"] as string) || 10;

    // If employee, only show their own activity
    const userId =
      authReq.user.role === "employee" ? authReq.user.id : undefined;

    const data = await dashboardService.getRecentFinanceActivity(
      departmentId,
      limit,
      userId,
    );
    sendSuccess(res, data);
  }),
);

/**
 * GET /finance/analytics
 * Combined analytics data for admins/managers
 */
router.get(
  "/analytics",
  requireManager as any,
  asyncHandler(async (req: Request, res: Response) => {
    const departmentId = req.query["department_id"] as string;

    const [revenueTrend, invoiceStatus, outstandingClients] = await Promise.all(
      [
        dashboardService.getMonthlyRevenueTrend(departmentId),
        dashboardService.getInvoiceStatusDistribution(departmentId),
        dashboardService.getTopOutstandingClients(departmentId, 10),
      ],
    );

    sendSuccess(res, {
      revenueTrend,
      invoiceStatus,
      outstandingClients,
    });
  }),
);

// ============================================
// SCHEDULED EMAIL ROUTES
// ============================================

/**
 * GET /finance/scheduled-emails
 * Get upcoming scheduled emails (Manager/Admin)
 */
router.get(
  "/scheduled-emails",
  requireManager as any,
  asyncHandler(async (req: Request, res: Response) => {
    const limit = parseInt(req.query["limit"] as string) || 50;
    const offset = parseInt(req.query["offset"] as string) || 0;
    const data = await scheduledEmailService.getUpcomingScheduledEmails({
      limit,
      offset,
    });
    sendSuccess(res, data);
  }),
);

/**
 * POST /finance/scheduled-emails/:id/cancel
 * Cancel scheduled email
 */
router.post(
  "/scheduled-emails/:id/cancel",
  asyncHandler(async (req: Request, res: Response) => {
    const data = await scheduledEmailService.cancelScheduledEmail(
      req.params["id"] as string,
    );
    sendSuccess(res, data);
  }),
);

/**
 * POST /finance/scheduled-emails/:id/reschedule
 * Reschedule email
 */
router.post(
  "/scheduled-emails/:id/reschedule",
  validateBody(scheduleEmailSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const data = await scheduledEmailService.rescheduleEmail(
      req.params["id"] as string,
      req.body.scheduled_for,
    );
    sendSuccess(res, data);
  }),
);

// ============================================
// CRON TRIGGER ROUTES (Internal use / Admin)
// ============================================

/**
 * POST /finance/cron/process-scheduled-emails
 * Trigger scheduled email processing (Admin only - for manual trigger)
 */
router.post(
  "/cron/process-scheduled-emails",
  requireAdmin as any,
  asyncHandler(async (req: Request, res: Response) => {
    const result = await scheduledEmailService.processScheduledEmails();
    sendSuccess(res, result);
  }),
);

/**
 * POST /finance/cron/process-recurring-invoices
 * Trigger recurring invoice processing (Admin only - for manual trigger)
 */
router.post(
  "/cron/process-recurring-invoices",
  requireAdmin as any,
  asyncHandler(async (req: Request, res: Response) => {
    const result = await recurringService.processRecurringInvoices();
    sendSuccess(res, result);
  }),
);

/**
 * POST /finance/cron/update-overdue
 * Update overdue invoices (Admin only - for manual trigger)
 */
router.post(
  "/cron/update-overdue",
  requireAdmin as any,
  asyncHandler(async (req: Request, res: Response) => {
    const result = await invoiceService.updateOverdueInvoices();
    sendSuccess(res, { updated: result.length });
  }),
);

export default router;
