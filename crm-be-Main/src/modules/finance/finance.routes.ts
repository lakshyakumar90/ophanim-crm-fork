import { Router, type Router as RouterType, type RequestHandler } from "express";
import multer from "multer";
import { authenticate } from "../../middleware/auth.middleware.js";
import {
  requireAnyPermission,
  requirePermission,
} from "../../middleware/authorization.middleware.js";
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
  createRecurringScheduleSchema,
  updateRecurringScheduleSchema,
  createExpenseCategorySchema,
  updateExpenseCategorySchema,
  rejectSchema,
  createBudgetSchema,
  updateBudgetSchema,
  scheduleEmailSchema,
  bulkApproveSchema,
} from "./finance.validator.js";
import {
  FINANCE_VIEW_ANY,
  INVOICE_VIEW_ANY,
  INVOICE_MANAGE_ANY,
  INVOICE_APPROVE_ANY,
  PAYMENT_VIEW_ANY,
  PAYMENT_MANAGE_ANY,
  EXPENSE_VIEW_ANY,
  EXPENSE_MANAGE_ANY,
  EXPENSE_APPROVE_ANY,
  BUDGET_VIEW_ANY,
  BUDGET_MANAGE_ANY,
} from "../../lib/finance-permissions.js";
import * as invoiceController from "./controllers/invoice.controller.js";
import * as paymentController from "./controllers/payment.controller.js";
import * as expenseController from "./controllers/expense.controller.js";
import * as approvalController from "./controllers/approval.controller.js";
import * as emailRequestController from "./controllers/email-request.controller.js";
import * as recurringController from "./controllers/recurring.controller.js";
import * as financeDashboardController from "./controllers/finance-dashboard.controller.js";
import * as scheduledEmailController from "./controllers/scheduled-email.controller.js";
import * as budgetController from "./controllers/budget.controller.js";

const paymentProofUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

const router: RouterType = Router();

router.use(authenticate as any);
router.use(requireAnyPermission([...FINANCE_VIEW_ANY]) as any);

router.get(
  "/invoices",
  requireAnyPermission([...INVOICE_VIEW_ANY]) as any,
  asyncHandler(invoiceController.get_invoices) as RequestHandler,
);

router.get(
  "/invoices/:id",
  requireAnyPermission([...INVOICE_VIEW_ANY]) as any,
  asyncHandler(invoiceController.get_invoices_id) as RequestHandler,
);

router.get(
  "/invoices/:id/preview",
  requireAnyPermission([...INVOICE_VIEW_ANY]) as any,
  asyncHandler(invoiceController.get_invoices_id_preview) as RequestHandler,
);

router.get(
  "/invoices/:id/pdf",
  requireAnyPermission([...INVOICE_VIEW_ANY]) as any,
  asyncHandler(invoiceController.get_invoices_id_pdf) as RequestHandler,
);

router.post(
  "/invoices",
  requireAnyPermission([...INVOICE_MANAGE_ANY]) as any,
  validateBody(createInvoiceSchema),
  asyncHandler(invoiceController.post_invoices) as RequestHandler,
);

router.put(
  "/invoices/:id",
  requireAnyPermission([...INVOICE_MANAGE_ANY]) as any,
  validateBody(updateInvoiceSchema),
  asyncHandler(invoiceController.put_invoices_id) as RequestHandler,
);

router.delete(
  "/invoices/:id",
  requireAnyPermission([...INVOICE_MANAGE_ANY]) as any,
  asyncHandler(invoiceController.delete_invoices_id) as RequestHandler,
);

router.post(
  "/invoices/:id/submit",
  requireAnyPermission([...INVOICE_MANAGE_ANY]) as any,
  asyncHandler(invoiceController.post_invoices_id_submit) as RequestHandler,
);

router.post(
  "/invoices/:id/approve",
  requireAnyPermission([...INVOICE_APPROVE_ANY]) as any,
  asyncHandler(invoiceController.post_invoices_id_approve) as RequestHandler,
);

router.post(
  "/invoices/:id/reject",
  requireAnyPermission([...INVOICE_APPROVE_ANY]) as any,
  validateBody(rejectSchema),
  asyncHandler(invoiceController.post_invoices_id_reject) as RequestHandler,
);

router.post(
  "/invoices/:id/cancel",
  requireAnyPermission([...INVOICE_MANAGE_ANY]) as any,
  asyncHandler(invoiceController.post_invoices_id_cancel) as RequestHandler,
);

router.post(
  "/invoices/:id/mark-sent",
  requireAnyPermission([...INVOICE_MANAGE_ANY]) as any,
  asyncHandler(invoiceController.post_invoices_id_mark_sent) as RequestHandler,
);

router.get(
  "/payments",
  requireAnyPermission([...PAYMENT_VIEW_ANY]) as any,
  asyncHandler(paymentController.get_payments) as RequestHandler,
);

router.get(
  "/invoices/:id/payments",
  requireAnyPermission([...PAYMENT_VIEW_ANY]) as any,
  asyncHandler(paymentController.get_invoices_id_payments) as RequestHandler,
);

router.post(
  "/payments/upload-proof",
  requireAnyPermission([...PAYMENT_MANAGE_ANY]) as any,
  paymentProofUpload.single("file"),
  asyncHandler(paymentController.post_payments_upload_proof) as RequestHandler,
);

router.post(
  "/invoices/:id/payments",
  requireAnyPermission([...PAYMENT_MANAGE_ANY]) as any,
  validateBody(createPaymentSchema),
  asyncHandler(paymentController.post_invoices_id_payments) as RequestHandler,
);

router.put(
  "/payments/:id",
  requireAnyPermission([...PAYMENT_MANAGE_ANY]) as any,
  validateBody(updatePaymentSchema),
  asyncHandler(paymentController.put_payments_id) as RequestHandler,
);

router.get(
  "/expenses",
  requireAnyPermission([...EXPENSE_VIEW_ANY]) as any,
  asyncHandler(expenseController.get_expenses) as RequestHandler,
);

router.get(
  "/expenses/:id",
  requireAnyPermission([...EXPENSE_VIEW_ANY]) as any,
  asyncHandler(expenseController.get_expenses_id) as RequestHandler,
);

router.post(
  "/expenses",
  requireAnyPermission([...EXPENSE_MANAGE_ANY]) as any,
  validateBody(createExpenseSchema),
  asyncHandler(expenseController.post_expenses) as RequestHandler,
);

router.put(
  "/expenses/:id",
  requireAnyPermission([...EXPENSE_MANAGE_ANY]) as any,
  validateBody(updateExpenseSchema),
  asyncHandler(expenseController.put_expenses_id) as RequestHandler,
);

router.post(
  "/expenses/:id/approve",
  requireAnyPermission([...EXPENSE_APPROVE_ANY]) as any,
  asyncHandler(expenseController.post_expenses_id_approve) as RequestHandler,
);

router.post(
  "/expenses/:id/reject",
  requireAnyPermission([...EXPENSE_APPROVE_ANY]) as any,
  validateBody(rejectSchema),
  asyncHandler(expenseController.post_expenses_id_reject) as RequestHandler,
);

router.get(
  "/expense-categories",
  requireAnyPermission([...EXPENSE_VIEW_ANY]) as any,
  asyncHandler(expenseController.get_expense_categories) as RequestHandler,
);

router.post(
  "/expense-categories",
  requireAnyPermission([...EXPENSE_MANAGE_ANY]) as any,
  validateBody(createExpenseCategorySchema),
  asyncHandler(expenseController.post_expense_categories) as RequestHandler,
);

router.put(
  "/expense-categories/:id",
  requireAnyPermission([...EXPENSE_MANAGE_ANY]) as any,
  validateBody(updateExpenseCategorySchema),
  asyncHandler(expenseController.put_expense_categories_id) as RequestHandler,
);

router.get(
  "/approvals",
  requireAnyPermission([...INVOICE_APPROVE_ANY, ...EXPENSE_APPROVE_ANY]) as any,
  asyncHandler(approvalController.get_approvals) as RequestHandler,
);

router.get(
  "/approvals/count",
  requireAnyPermission([...INVOICE_APPROVE_ANY, ...EXPENSE_APPROVE_ANY]) as any,
  asyncHandler(approvalController.get_approvals_count) as RequestHandler,
);

router.post(
  "/approvals/bulk-approve",
  requireAnyPermission([...INVOICE_APPROVE_ANY, ...EXPENSE_APPROVE_ANY]) as any,
  validateBody(bulkApproveSchema),
  asyncHandler(approvalController.post_approvals_bulk_approve) as RequestHandler,
);

router.get(
  "/email-requests",
  requireAnyPermission([...INVOICE_MANAGE_ANY]) as any,
  asyncHandler(emailRequestController.get_email_requests) as RequestHandler,
);

router.get(
  "/email-requests/:id",
  requireAnyPermission([...INVOICE_VIEW_ANY]) as any,
  asyncHandler(emailRequestController.get_email_requests_id) as RequestHandler,
);

router.post(
  "/email-requests",
  requireAnyPermission([...INVOICE_MANAGE_ANY]) as any,
  validateBody(createEmailRequestSchema),
  asyncHandler(emailRequestController.post_email_requests) as RequestHandler,
);

router.put(
  "/email-requests/:id",
  requireAnyPermission([...INVOICE_MANAGE_ANY]) as any,
  validateBody(updateEmailRequestSchema),
  asyncHandler(emailRequestController.put_email_requests_id) as RequestHandler,
);

router.post(
  "/email-requests/:id/submit",
  requireAnyPermission([...INVOICE_MANAGE_ANY]) as any,
  validateBody(updateEmailRequestSchema),
  asyncHandler(emailRequestController.post_email_requests_id_submit) as RequestHandler,
);

router.post(
  "/email-requests/:id/approve",
  requireAnyPermission([...INVOICE_APPROVE_ANY]) as any,
  asyncHandler(emailRequestController.post_email_requests_id_approve) as RequestHandler,
);

router.post(
  "/email-requests/:id/reject",
  requireAnyPermission([...INVOICE_APPROVE_ANY]) as any,
  validateBody(rejectSchema),
  asyncHandler(emailRequestController.post_email_requests_id_reject) as RequestHandler,
);

router.post(
  "/email-requests/:id/send",
  requireAnyPermission([...INVOICE_MANAGE_ANY]) as any,
  asyncHandler(emailRequestController.post_email_requests_id_send) as RequestHandler,
);

router.post(
  "/email-requests/:id/schedule",
  requireAnyPermission([...INVOICE_MANAGE_ANY]) as any,
  validateBody(scheduleEmailSchema),
  asyncHandler(emailRequestController.post_email_requests_id_schedule) as RequestHandler,
);

router.get(
  "/recurring",
  requireAnyPermission([...INVOICE_VIEW_ANY]) as any,
  asyncHandler(recurringController.get_recurring) as RequestHandler,
);

router.get(
  "/recurring/:id",
  requireAnyPermission([...INVOICE_VIEW_ANY]) as any,
  asyncHandler(recurringController.get_recurring_id) as RequestHandler,
);

router.post(
  "/recurring",
  requireAnyPermission([...INVOICE_MANAGE_ANY]) as any,
  validateBody(createRecurringScheduleSchema),
  asyncHandler(recurringController.post_recurring) as RequestHandler,
);

router.put(
  "/recurring/:id",
  requireAnyPermission([...INVOICE_MANAGE_ANY]) as any,
  validateBody(updateRecurringScheduleSchema),
  asyncHandler(recurringController.put_recurring_id) as RequestHandler,
);

router.post(
  "/recurring/:id/pause",
  requireAnyPermission([...INVOICE_MANAGE_ANY]) as any,
  asyncHandler(recurringController.post_recurring_id_pause) as RequestHandler,
);

router.post(
  "/recurring/:id/resume",
  requireAnyPermission([...INVOICE_MANAGE_ANY]) as any,
  asyncHandler(recurringController.post_recurring_id_resume) as RequestHandler,
);

router.delete(
  "/recurring/:id",
  requireAnyPermission([...INVOICE_MANAGE_ANY]) as any,
  asyncHandler(recurringController.delete_recurring_id) as RequestHandler,
);

router.get(
  "/dashboard",
  requireAnyPermission([...FINANCE_VIEW_ANY]) as any,
  asyncHandler(financeDashboardController.get_dashboard) as RequestHandler,
);

router.get(
  "/dashboard/revenue-trend",
  requireAnyPermission([...FINANCE_VIEW_ANY]) as any,
  asyncHandler(financeDashboardController.get_dashboard_revenue_trend) as RequestHandler,
);

router.get(
  "/dashboard/invoice-status",
  requireAnyPermission([...FINANCE_VIEW_ANY]) as any,
  asyncHandler(financeDashboardController.get_dashboard_invoice_status) as RequestHandler,
);

router.get(
  "/dashboard/outstanding-clients",
  requireAnyPermission([...FINANCE_VIEW_ANY]) as any,
  asyncHandler(financeDashboardController.get_dashboard_outstanding_clients) as RequestHandler,
);

router.get(
  "/dashboard/activity",
  requireAnyPermission([...FINANCE_VIEW_ANY]) as any,
  asyncHandler(financeDashboardController.get_dashboard_activity) as RequestHandler,
);

router.get(
  "/analytics",
  requireAnyPermission([...FINANCE_VIEW_ANY]) as any,
  asyncHandler(financeDashboardController.get_analytics) as RequestHandler,
);

router.get(
  "/scheduled-emails",
  requireAnyPermission([...FINANCE_VIEW_ANY]) as any,
  asyncHandler(scheduledEmailController.get_scheduled_emails) as RequestHandler,
);

router.post(
  "/scheduled-emails/:id/cancel",
  requireAnyPermission([...INVOICE_MANAGE_ANY]) as any,
  asyncHandler(scheduledEmailController.post_scheduled_emails_id_cancel) as RequestHandler,
);

router.post(
  "/scheduled-emails/:id/reschedule",
  requireAnyPermission([...INVOICE_MANAGE_ANY]) as any,
  validateBody(scheduleEmailSchema),
  asyncHandler(scheduledEmailController.post_scheduled_emails_id_reschedule) as RequestHandler,
);

router.post(
  "/cron/process-scheduled-emails",
  requirePermission("finance:manage") as any,
  asyncHandler(scheduledEmailController.post_cron_process_scheduled_emails) as RequestHandler,
);

router.post(
  "/cron/process-recurring-invoices",
  requirePermission("finance:manage") as any,
  asyncHandler(scheduledEmailController.post_cron_process_recurring_invoices) as RequestHandler,
);

router.post(
  "/cron/update-overdue",
  requirePermission("finance:manage") as any,
  asyncHandler(scheduledEmailController.post_cron_update_overdue) as RequestHandler,
);

router.get(
  "/budgets",
  requireAnyPermission([...BUDGET_VIEW_ANY]) as any,
  asyncHandler(budgetController.get_budgets) as RequestHandler,
);

router.get(
  "/budgets/:id",
  requireAnyPermission([...BUDGET_VIEW_ANY]) as any,
  asyncHandler(budgetController.get_budgets_id) as RequestHandler,
);

router.post(
  "/budgets",
  requireAnyPermission([...BUDGET_MANAGE_ANY]) as any,
  validateBody(createBudgetSchema),
  asyncHandler(budgetController.post_budgets) as RequestHandler,
);

router.put(
  "/budgets/:id",
  requireAnyPermission([...BUDGET_MANAGE_ANY]) as any,
  validateBody(updateBudgetSchema),
  asyncHandler(budgetController.put_budgets_id) as RequestHandler,
);

router.delete(
  "/budgets/:id",
  requireAnyPermission([...BUDGET_MANAGE_ANY]) as any,
  asyncHandler(budgetController.delete_budgets_id) as RequestHandler,
);

export default router;
