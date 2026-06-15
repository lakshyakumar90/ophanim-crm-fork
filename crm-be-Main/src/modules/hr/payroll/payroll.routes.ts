import { Router, type Router as RouterType, type RequestHandler } from "express";
import { authenticate } from "../../../middleware/auth.middleware.js";
import {
  requirePermission,
  requireAnyPermission,
} from "../../../middleware/authorization.middleware.js";
import {
  validateBody,
  validateParams,
  validateQuery,
} from "../../../middleware/validation.middleware.js";
import { asyncHandler } from "../../../middleware/error.middleware.js";
import { PAYROLL_STATUSES } from "../../../config/constants.js";
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
} from "./payroll.validator.js";
import * as payrollController from "./payroll.controller.js";

function requireRunStatus(expectedStatus: string, action: string) {
  return asyncHandler(async (req, _res, next) => {
    const runId = req.params.id || req.params.runId;
    if (!runId) return next();

    const { data: run } = await (
      await import("../../../config/supabase.js")
    ).supabaseAdmin
      .from("payroll_runs")
      .select("status")
      .eq("id", runId)
      .single();

    if (run && run.status !== expectedStatus) {
      const { ApiError } = await import("../../../utils/responses.js");
      const { ERROR_CODES } = await import("../../../utils/error-codes.js");
      throw new ApiError(
        ERROR_CODES.VALIDATION_ERROR,
        `Cannot ${action}: run must be in '${expectedStatus}' status, currently '${run.status}'`,
      );
    }
    next();
  });
}

const router: RouterType = Router();

router.use(authenticate as any);

router.get(
  "/runs",
  requireAnyPermission(["payroll:view", "payroll:manage", "payroll:approve"]) as any,
  validateQuery(listPayrollRunsQuerySchema),
  asyncHandler(payrollController.getPayrollRuns) as RequestHandler,
);

router.get(
  "/runs/:id",
  requireAnyPermission(["payroll:view", "payroll:manage", "payroll:approve"]) as any,
  validateParams(payrollRunIdParamSchema),
  asyncHandler(payrollController.getPayrollRunById) as RequestHandler,
);

router.post(
  "/runs",
  requirePermission("payroll:manage") as any,
  validateBody(initiatePayrollRunSchema),
  asyncHandler(payrollController.initiatePayrollRun) as RequestHandler,
);

router.post(
  "/runs/:id/submit",
  requirePermission("payroll:manage") as any,
  validateParams(payrollRunIdParamSchema),
  requireRunStatus(PAYROLL_STATUSES.DRAFT, "submit") as any,
  asyncHandler(payrollController.submitPayrollRun) as RequestHandler,
);

router.post(
  "/runs/:id/approve",
  requirePermission("payroll:approve") as any,
  validateParams(payrollRunIdParamSchema),
  requireRunStatus(PAYROLL_STATUSES.SUBMITTED, "approve") as any,
  asyncHandler(payrollController.approvePayrollRun) as RequestHandler,
);

router.post(
  "/runs/:id/disburse",
  requirePermission("payroll:approve") as any,
  validateParams(payrollRunIdParamSchema),
  requireRunStatus(PAYROLL_STATUSES.APPROVED, "disburse") as any,
  asyncHandler(payrollController.disbursePayrollRun) as RequestHandler,
);

router.post(
  "/runs/:id/correction",
  requirePermission("payroll:manage") as any,
  validateParams(payrollRunIdParamSchema),
  validateBody(payrollCorrectionSchema),
  asyncHandler(payrollController.createCorrectionRun) as RequestHandler,
);

router.get(
  "/runs/:id/records",
  requireAnyPermission(["payroll:view", "payroll:manage", "payroll:approve"]) as any,
  validateParams(payrollRunIdParamSchema),
  asyncHandler(payrollController.getPayrollRecords) as RequestHandler,
);

router.put(
  "/records/:id",
  requirePermission("payroll:manage") as any,
  validateParams(payrollRecordIdParamSchema),
  validateBody(editPayrollRecordSchema),
  asyncHandler(payrollController.editPayrollRecord) as RequestHandler,
);

router.get(
  "/salary-bands",
  requireAnyPermission(["payroll:view", "payroll:manage", "payroll:approve"]) as any,
  validateQuery(payrollSalaryBandsQuerySchema),
  asyncHandler(payrollController.getSalaryBands) as RequestHandler,
);

router.post(
  "/salary-bands",
  requirePermission("payroll:manage") as any,
  validateBody(createSalaryBandSchema),
  asyncHandler(payrollController.createSalaryBand) as RequestHandler,
);

router.put(
  "/salary-bands/:id",
  requirePermission("payroll:manage") as any,
  validateParams(payrollSalaryBandIdParamSchema),
  validateBody(updateSalaryBandSchema),
  asyncHandler(payrollController.updateSalaryBand) as RequestHandler,
);

router.delete(
  "/salary-bands/:id",
  requirePermission("payroll:manage") as any,
  validateParams(payrollSalaryBandIdParamSchema),
  asyncHandler(payrollController.deleteSalaryBand) as RequestHandler,
);

router.get(
  "/increments",
  requireAnyPermission(["payroll:view", "payroll:manage", "payroll:approve"]) as any,
  validateQuery(payrollIncrementsQuerySchema),
  asyncHandler(payrollController.getIncrements) as RequestHandler,
);

router.post(
  "/increments",
  requirePermission("payroll:manage") as any,
  validateBody(proposeIncrementSchema),
  asyncHandler(payrollController.proposeIncrement) as RequestHandler,
);

router.post(
  "/increments/:id/approve",
  requirePermission("payroll:approve") as any,
  validateParams(payrollIncrementIdParamSchema),
  asyncHandler(payrollController.approveIncrement) as RequestHandler,
);

router.post(
  "/increments/:id/reject",
  requirePermission("payroll:approve") as any,
  validateParams(payrollIncrementIdParamSchema),
  validateBody(rejectIncrementSchema),
  asyncHandler(payrollController.rejectIncrement) as RequestHandler,
);

router.get(
  "/payslips/me",
  asyncHandler(payrollController.getMyPayslips) as RequestHandler,
);

router.get(
  "/payslips/:id/pdf",
  validateParams(payrollRecordIdParamSchema),
  asyncHandler(payrollController.getPayslipPdf) as RequestHandler,
);

router.get(
  "/analytics",
  requireAnyPermission(["payroll:view", "payroll:manage", "payroll:approve"]) as any,
  asyncHandler(payrollController.getPayrollAnalytics) as RequestHandler,
);

export default router;
