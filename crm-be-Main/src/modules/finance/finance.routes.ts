import { Router, type Router as RouterType, type RequestHandler, type NextFunction, type Request, type Response } from "express";
import multer from "multer";
import { config } from "../../config/env.js";
import { authenticate } from "../../middleware/auth.middleware.js";
import { requireManager, requireAdmin } from "../../middleware/authorization.middleware.js";
import { validateBody } from "../../middleware/validation.middleware.js";
import { asyncHandler } from "../../middleware/error.middleware.js";
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
} from "./finance.validator.js";
import * as invoiceController from "./controllers/invoice.controller.js";
import * as paymentController from "./controllers/payment.controller.js";
import * as expenseController from "./controllers/expense.controller.js";
import * as approvalController from "./controllers/approval.controller.js";
import * as emailRequestController from "./controllers/email-request.controller.js";
import * as recurringController from "./controllers/recurring.controller.js";
import * as financeDashboardController from "./controllers/finance-dashboard.controller.js";
import * as scheduledEmailController from "./controllers/scheduled-email.controller.js";

const paymentProofUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

function requireHttpCronEnabled(_req: Request, res: Response, next: NextFunction): void {
  if (!config.cron.enableHttpCron) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  next();
}

const router: RouterType = Router();

router.use(authenticate as any);

router.get(
  "/invoices",
  asyncHandler(invoiceController.get_invoices) as RequestHandler,
);

router.get(
  "/invoices/:id",
  asyncHandler(invoiceController.get_invoices_id) as RequestHandler,
);

router.get(
  "/invoices/:id/preview",
  asyncHandler(invoiceController.get_invoices_id_preview) as RequestHandler,
);

router.get(
  "/invoices/:id/pdf",
  asyncHandler(invoiceController.get_invoices_id_pdf) as RequestHandler,
);

router.post(
  "/invoices",
  asyncHandler(invoiceController.post_invoices) as RequestHandler,
);

router.put(
  "/invoices/:id",
  asyncHandler(invoiceController.put_invoices_id) as RequestHandler,
);

router.delete(
  "/invoices/:id",
  asyncHandler(invoiceController.delete_invoices_id) as RequestHandler,
);

router.post(
  "/invoices/:id/submit",
  asyncHandler(invoiceController.post_invoices_id_submit) as RequestHandler,
);

router.post(
  "/invoices/:id/approve",
  asyncHandler(invoiceController.post_invoices_id_approve) as RequestHandler,
);

router.post(
  "/invoices/:id/reject",
  requireManager as any,
  validateBody(createInvoiceSchema),
  asyncHandler(invoiceController.post_invoices_id_reject) as RequestHandler,
);

router.post(
  "/invoices/:id/cancel",
  asyncHandler(invoiceController.post_invoices_id_cancel) as RequestHandler,
);

router.post(
  "/invoices/:id/mark-sent",
  validateBody(updateInvoiceSchema),
  asyncHandler(invoiceController.post_invoices_id_mark_sent) as RequestHandler,
);

router.get(
  "/payments",
  asyncHandler(paymentController.get_payments) as RequestHandler,
);

router.get(
  "/invoices/:id/payments",
  requireAdmin as any,
  asyncHandler(paymentController.get_invoices_id_payments) as RequestHandler,
);

router.post(
  "/payments/upload-proof",
  asyncHandler(paymentController.post_payments_upload_proof) as RequestHandler,
);

router.post(
  "/invoices/:id/payments",
  asyncHandler(paymentController.post_invoices_id_payments) as RequestHandler,
);

router.put(
  "/payments/:id",
  asyncHandler(paymentController.put_payments_id) as RequestHandler,
);

router.get(
  "/expenses",
  requireManager as any,
  asyncHandler(expenseController.get_expenses) as RequestHandler,
);

router.get(
  "/expenses/:id",
  asyncHandler(expenseController.get_expenses_id) as RequestHandler,
);

router.post(
  "/expenses",
  requireManager as any,
  validateBody(rejectSchema),
  asyncHandler(expenseController.post_expenses) as RequestHandler,
);

router.put(
  "/expenses/:id",
  asyncHandler(expenseController.put_expenses_id) as RequestHandler,
);

router.post(
  "/expenses/:id/approve",
  requireManager as any,
  asyncHandler(expenseController.post_expenses_id_approve) as RequestHandler,
);

router.post(
  "/expenses/:id/reject",
  asyncHandler(expenseController.post_expenses_id_reject) as RequestHandler,
);

router.get(
  "/expense-categories",
  requireManager as any,
  asyncHandler(expenseController.get_expense_categories) as RequestHandler,
);

router.post(
  "/expense-categories",
  asyncHandler(expenseController.post_expense_categories) as RequestHandler,
);

router.put(
  "/expense-categories/:id",
  requireManager as any,
  asyncHandler(expenseController.put_expense_categories_id) as RequestHandler,
);

router.get(
  "/approvals",
  asyncHandler(approvalController.get_approvals) as RequestHandler,
);

router.get(
  "/approvals/count",
  asyncHandler(approvalController.get_approvals_count) as RequestHandler,
);

router.post(
  "/approvals/bulk-approve",
  asyncHandler(approvalController.post_approvals_bulk_approve) as RequestHandler,
);

router.get(
  "/email-requests",
  requireManager as any,
  paymentProofUpload.single("file"),
  asyncHandler(emailRequestController.get_email_requests) as RequestHandler,
);

router.get(
  "/email-requests/:id",
  asyncHandler(emailRequestController.get_email_requests_id) as RequestHandler,
);

router.post(
  "/email-requests",
  requireManager as any,
  validateBody(createPaymentSchema),
  asyncHandler(emailRequestController.post_email_requests) as RequestHandler,
);

router.put(
  "/email-requests/:id",
  asyncHandler(emailRequestController.put_email_requests_id) as RequestHandler,
);

router.post(
  "/email-requests/:id/submit",
  requireManager as any,
  validateBody(updatePaymentSchema),
  asyncHandler(emailRequestController.post_email_requests_id_submit) as RequestHandler,
);

router.post(
  "/email-requests/:id/approve",
  asyncHandler(emailRequestController.post_email_requests_id_approve) as RequestHandler,
);

router.post(
  "/email-requests/:id/reject",
  asyncHandler(emailRequestController.post_email_requests_id_reject) as RequestHandler,
);

router.post(
  "/email-requests/:id/send",
  asyncHandler(emailRequestController.post_email_requests_id_send) as RequestHandler,
);

router.post(
  "/email-requests/:id/schedule",
  asyncHandler(emailRequestController.post_email_requests_id_schedule) as RequestHandler,
);

router.get(
  "/recurring",
  asyncHandler(recurringController.get_recurring) as RequestHandler,
);

router.get(
  "/recurring/:id",
  validateBody(createExpenseSchema),
  asyncHandler(recurringController.get_recurring_id) as RequestHandler,
);

router.post(
  "/recurring",
  asyncHandler(recurringController.post_recurring) as RequestHandler,
);

router.put(
  "/recurring/:id",
  validateBody(updateExpenseSchema),
  asyncHandler(recurringController.put_recurring_id) as RequestHandler,
);

router.post(
  "/recurring/:id/pause",
  asyncHandler(recurringController.post_recurring_id_pause) as RequestHandler,
);

router.post(
  "/recurring/:id/resume",
  requireManager as any,
  asyncHandler(recurringController.post_recurring_id_resume) as RequestHandler,
);

router.delete(
  "/recurring/:id",
  asyncHandler(recurringController.delete_recurring_id) as RequestHandler,
);

router.get(
  "/dashboard",
  requireManager as any,
  validateBody(rejectSchema),
  asyncHandler(financeDashboardController.get_dashboard) as RequestHandler,
);

router.get(
  "/dashboard/revenue-trend",
  asyncHandler(financeDashboardController.get_dashboard_revenue_trend) as RequestHandler,
);

router.get(
  "/dashboard/invoice-status",
  asyncHandler(financeDashboardController.get_dashboard_invoice_status) as RequestHandler,
);

router.get(
  "/dashboard/outstanding-clients",
  asyncHandler(financeDashboardController.get_dashboard_outstanding_clients) as RequestHandler,
);

router.get(
  "/dashboard/activity",
  requireAdmin as any,
  validateBody(createExpenseCategorySchema),
  asyncHandler(financeDashboardController.get_dashboard_activity) as RequestHandler,
);

router.get(
  "/analytics",
  asyncHandler(financeDashboardController.get_analytics) as RequestHandler,
);

router.get(
  "/scheduled-emails",
  requireAdmin as any,
  validateBody(updateExpenseCategorySchema),
  asyncHandler(scheduledEmailController.get_scheduled_emails) as RequestHandler,
);

router.post(
  "/scheduled-emails/:id/cancel",
  asyncHandler(scheduledEmailController.post_scheduled_emails_id_cancel) as RequestHandler,
);

router.post(
  "/scheduled-emails/:id/reschedule",
  requireManager as any,
  asyncHandler(scheduledEmailController.post_scheduled_emails_id_reschedule) as RequestHandler,
);

router.post(
  "/cron/process-scheduled-emails",
  asyncHandler(scheduledEmailController.post_cron_process_scheduled_emails) as RequestHandler,
);

router.post(
  "/cron/process-recurring-invoices",
  requireManager as any,
  asyncHandler(scheduledEmailController.post_cron_process_recurring_invoices) as RequestHandler,
);

router.post(
  "/cron/update-overdue",
  asyncHandler(scheduledEmailController.post_cron_update_overdue) as RequestHandler,
);

export default router;
