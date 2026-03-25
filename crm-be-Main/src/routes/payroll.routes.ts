import { Router, type Request, type Response } from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import { requirePermission, requireAnyPermission } from "../middleware/authorization.middleware.js";
import { validateBody, validateParams, validateQuery } from "../middleware/validation.middleware.js";
import { asyncHandler } from "../middleware/error.middleware.js";
import { sendSuccess, ApiError } from "../utils/responses.js";
import { ERROR_CODES } from "../utils/error-codes.js";
import { PAYROLL_STATUSES } from "../config/constants.js";
import * as payrollService from "../services/payroll.service.js";
import {
  initiatePayrollRunSchema,
  editPayrollRecordSchema,
  createSalaryBandSchema,
  updateSalaryBandSchema,
  proposeIncrementSchema,
  rejectIncrementSchema,
  listPayrollRunsQuerySchema,
  payrollRunIdParamSchema,
  payrollRecordIdParamSchema,
  payrollSalaryBandIdParamSchema,
  payrollIncrementIdParamSchema,
  payrollSalaryBandsQuerySchema,
  payrollIncrementsQuerySchema,
  payrollCorrectionSchema,
} from "../validators/payroll.validator.js";
import type { AuthenticatedRequest } from "../types/api.types.js";

const router: Router = Router();

// All payroll routes require authentication
router.use(authenticate as any);

// ============================================================
// STATUS GUARD MIDDLEWARE (Fix #2 — enforced at route level too)
// ============================================================

function requireRunStatus(expectedStatus: string, action: string) {
  return asyncHandler(async (req: Request, _res: any, next: any) => {
    const runId = req.params.id || req.params.runId;
    if (!runId) return next();

    const { data: run } = await (
      await import("../config/supabase.js")
    ).supabaseAdmin
      .from("payroll_runs")
      .select("status")
      .eq("id", runId)
      .single();

    if (run && run.status !== expectedStatus) {
      throw new ApiError(
        ERROR_CODES.VALIDATION_ERROR,
        `Cannot ${action}: run must be in '${expectedStatus}' status, currently '${run.status}'`,
      );
    }
    next();
  });
}

// ============================================================
// PAYROLL RUNS
// ============================================================

// GET /payroll/runs
router.get(
  "/runs",
  requireAnyPermission(["payroll:view", "payroll:manage", "payroll:approve"]) as any,
  validateQuery(listPayrollRunsQuerySchema),
  asyncHandler(async (req: Request, res: Response) => {
    const runs = await payrollService.getPayrollRuns(req.query as any);
    sendSuccess(res, runs);
  }),
);

// GET /payroll/runs/:id
router.get(
  "/runs/:id",
  requireAnyPermission(["payroll:view", "payroll:manage", "payroll:approve"]) as any,
  validateParams(payrollRunIdParamSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const run = await payrollService.getPayrollRunById(req.params.id as string);
    sendSuccess(res, run);
  }),
);

// POST /payroll/runs
router.post(
  "/runs",
  requirePermission("payroll:manage") as any,
  validateBody(initiatePayrollRunSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as unknown as AuthenticatedRequest;
    const { month, notes, cohort_name, employee_selection } = req.body as {
      month: string;
      notes?: string;
      cohort_name?: string;
      employee_selection?:
        | { type: "all" }
        | { type: "departments"; departments: string[] }
        | { type: "teams"; teams: string[] }
        | { type: "manual"; employee_ids: string[] };
    };
    const run = await payrollService.initiatePayrollRun(
      month,
      authReq.user.id,
      notes,
      cohort_name,
      employee_selection,
    );
    sendSuccess(res, run, 201);
  }),
);

// POST /payroll/runs/:id/submit — draft → submitted
router.post(
  "/runs/:id/submit",
  requirePermission("payroll:manage") as any,
  validateParams(payrollRunIdParamSchema),
  requireRunStatus(PAYROLL_STATUSES.DRAFT, "submit") as any,
  asyncHandler(async (req: Request, res: Response) => {
    const run = await payrollService.submitForApproval(req.params.id as string);
    sendSuccess(res, run);
  }),
);

// POST /payroll/runs/:id/approve — submitted → approved (payroll:approve only)
router.post(
  "/runs/:id/approve",
  requirePermission("payroll:approve") as any,
  validateParams(payrollRunIdParamSchema),
  requireRunStatus(PAYROLL_STATUSES.SUBMITTED, "approve") as any,
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as unknown as AuthenticatedRequest;
    const run = await payrollService.approvePayrollRun(req.params.id as string, authReq.user.id);
    sendSuccess(res, run);
  }),
);

// POST /payroll/runs/:id/disburse — approved → disbursed (payroll:approve only)
router.post(
  "/runs/:id/disburse",
  requirePermission("payroll:approve") as any,
  validateParams(payrollRunIdParamSchema),
  requireRunStatus(PAYROLL_STATUSES.APPROVED, "disburse") as any, // route-level guard
  asyncHandler(async (req: Request, res: Response) => {
    // Service also asserts status=approved (Fix #2 — both layers)
    const run = await payrollService.disbursePayroll(req.params.id as string);
    sendSuccess(res, run);
  }),
);

// POST /payroll/runs/:id/correction
router.post(
  "/runs/:id/correction",
  requirePermission("payroll:manage") as any,
  validateParams(payrollRunIdParamSchema),
  validateBody(payrollCorrectionSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as unknown as AuthenticatedRequest;
    const { notes } = req.body as { notes: string };
    const run = await payrollService.createCorrectionRun(req.params.id as string, authReq.user.id, notes);
    sendSuccess(res, run, 201);
  }),
);

// GET /payroll/runs/:id/records
router.get(
  "/runs/:id/records",
  requireAnyPermission(["payroll:view", "payroll:manage", "payroll:approve"]) as any,
  validateParams(payrollRunIdParamSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const records = await payrollService.getPayrollRecordsByRun(req.params.id as string);
    sendSuccess(res, records);
  }),
);

// PUT /payroll/records/:id — pre-disbursement edit
router.put(
  "/records/:id",
  requirePermission("payroll:manage") as any,
  validateParams(payrollRecordIdParamSchema),
  validateBody(editPayrollRecordSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as unknown as AuthenticatedRequest;
    const record = await payrollService.editPayrollRecord(
      req.params.id as string,
      req.body as any,
      authReq.user.id,
    );
    sendSuccess(res, record);
  }),
);

// ============================================================
// SALARY BANDS
// ============================================================

// GET /payroll/salary-bands
router.get(
  "/salary-bands",
  requireAnyPermission(["payroll:view", "payroll:manage", "payroll:approve"]) as any,
  validateQuery(payrollSalaryBandsQuerySchema),
  asyncHandler(async (req: Request, res: Response) => {
    const bands = await payrollService.getSalaryBands(req.query.department as string | undefined);
    sendSuccess(res, bands);
  }),
);

// POST /payroll/salary-bands
router.post(
  "/salary-bands",
  requirePermission("payroll:manage") as any,
  validateBody(createSalaryBandSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as unknown as AuthenticatedRequest;
    const band = await payrollService.createSalaryBand(req.body as any, authReq.user.id);
    sendSuccess(res, band, 201);
  }),
);

// PUT /payroll/salary-bands/:id
router.put(
  "/salary-bands/:id",
  requirePermission("payroll:manage") as any,
  validateParams(payrollSalaryBandIdParamSchema),
  validateBody(updateSalaryBandSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const band = await payrollService.updateSalaryBand(req.params.id as string, req.body as any);
    sendSuccess(res, band);
  }),
);

// DELETE /payroll/salary-bands/:id
router.delete(
  "/salary-bands/:id",
  requirePermission("payroll:manage") as any,
  validateParams(payrollSalaryBandIdParamSchema),
  asyncHandler(async (req: Request, res: Response) => {
    await payrollService.deleteSalaryBand(req.params.id as string);
    sendSuccess(res, { deleted: true });
  }),
);

// ============================================================
// INCREMENTS
// ============================================================

// GET /payroll/increments
router.get(
  "/increments",
  requireAnyPermission(["payroll:view", "payroll:manage", "payroll:approve"]) as any,
  validateQuery(payrollIncrementsQuerySchema),
  asyncHandler(async (req: Request, res: Response) => {
    const proposals = await payrollService.getIncrementProposals(req.query.employee_id as string | undefined);
    sendSuccess(res, proposals);
  }),
);

// POST /payroll/increments
router.post(
  "/increments",
  requirePermission("payroll:manage") as any,
  validateBody(proposeIncrementSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as unknown as AuthenticatedRequest;
    const proposal = await payrollService.proposeIncrement(req.body as any, authReq.user.id);
    sendSuccess(res, proposal, 201);
  }),
);

// POST /payroll/increments/:id/approve
router.post(
  "/increments/:id/approve",
  requirePermission("payroll:approve") as any,
  validateParams(payrollIncrementIdParamSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as unknown as AuthenticatedRequest;
    const result = await payrollService.approveIncrement(req.params.id as string, authReq.user.id);
    sendSuccess(res, result);
  }),
);

// POST /payroll/increments/:id/reject
router.post(
  "/increments/:id/reject",
  requirePermission("payroll:approve") as any,
  validateParams(payrollIncrementIdParamSchema),
  validateBody(rejectIncrementSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as unknown as AuthenticatedRequest;
    const { reason } = req.body as { reason: string };
    const result = await payrollService.rejectIncrement(req.params.id as string, authReq.user.id, reason);
    sendSuccess(res, result);
  }),
);

// ============================================================
// PAYSLIPS (self-service — any authenticated user can fetch their own)
// ============================================================

// GET /payroll/payslips/me
router.get(
  "/payslips/me",
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as unknown as AuthenticatedRequest;
    const payslips = await payrollService.getEmployeePayslips(authReq.user.id);
    sendSuccess(res, payslips);
  }),
);

// GET /payroll/payslips/:id/pdf
router.get(
  "/payslips/:id/pdf",
  validateParams(payrollRecordIdParamSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as unknown as AuthenticatedRequest;
    const record = await payrollService.getPayslipRecordById(
      req.params.id as string,
      authReq.user,
    );
    const pdfBuffer = await payrollService.generatePayslipPdfBuffer(
      record,
      "Ophanim Technologies",
    );

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=\"payslip-${record.month}-${record.employee_id}.pdf\"`,
    );
    res.send(pdfBuffer);
  }),
);

// ============================================================
// ANALYTICS
// ============================================================

// GET /payroll/analytics
router.get(
  "/analytics",
  requireAnyPermission(["payroll:view", "payroll:manage", "payroll:approve"]) as any,
  asyncHandler(async (_req: Request, res: Response) => {
    const analytics = await payrollService.getPayrollAnalytics();
    sendSuccess(res, analytics);
  }),
);

export default router;
