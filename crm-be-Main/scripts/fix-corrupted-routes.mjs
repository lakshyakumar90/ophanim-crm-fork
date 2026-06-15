import fs from "fs";

function fixCorruptedRoutes(filePath, controllerName, handlerNames) {
  const src = fs.readFileSync(filePath, "utf8");

  const routeRe =
    /router\.(get|post|put|patch|delete)\(\s*\n\s*["'`]([^"'`]+)["'`]/g;
  const routes = [];
  let m;
  while ((m = routeRe.exec(src))) routes.push({ method: m[1], path: m[2] });

  const blocks = src.split(/router\.(get|post|put|patch|delete)\(/).slice(1);
  const middlewares = [];
  for (const block of blocks) {
    const lines = block.split("\n").slice(1);
    const mw = [];
    for (const line of lines) {
      const t = line.trim();
      if (t.startsWith(`asyncHandler(${controllerName}Controller.`)) break;
      if (t.startsWith(`asyncHandler(${controllerName}.`)) break;
      if (!t || t === "," || t === "),") continue;
      if (
        t.startsWith("const ") ||
        t.startsWith("await ") ||
        t.startsWith("send") ||
        t.startsWith("if ") ||
        t.startsWith("throw ") ||
        t.startsWith("}") ||
        t.includes("req.body") ||
        t.includes("req.query") ||
        t.includes("req.params") ||
        t.includes("res.")
      ) {
        continue;
      }
      if (
        t.startsWith("require") ||
        t.startsWith("validate") ||
        t.includes("Upload") ||
        t.includes("upload.")
      ) {
        mw.push(t.replace(/,\s*$/, ""));
      }
    }
    middlewares.push(mw);
  }

  const isHr = filePath.endsWith("hr.routes.ts");
  const isFinance = filePath.includes("finance");
  const isPayroll = filePath.includes("payroll");
  const isPerformance = filePath.includes("performance");

  let imports = "";

  if (isPayroll) {
    imports = `import { Router, type Router as RouterType, type RequestHandler } from "express";
import { authenticate } from "../../middleware/auth.middleware.js";
import { requirePermission, requireAnyPermission } from "../../middleware/authorization.middleware.js";
import { validateBody, validateParams, validateQuery } from "../../middleware/validation.middleware.js";
import { asyncHandler } from "../../middleware/error.middleware.js";
import { PAYROLL_STATUSES } from "../../config/constants.js";
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
      await import("../../config/supabase.js")
    ).supabaseAdmin
      .from("payroll_runs")
      .select("status")
      .eq("id", runId)
      .single();

    if (run && run.status !== expectedStatus) {
      const { ApiError } = await import("../../utils/responses.js");
      const { ERROR_CODES } = await import("../../utils/error-codes.js");
      throw new ApiError(
        ERROR_CODES.VALIDATION_ERROR,
        \`Cannot \${action}: run must be in '\${expectedStatus}' status, currently '\${run.status}'\`,
      );
    }
    next();
  });
}
`;
  } else if (isPerformance) {
    imports = `import { Router, type Router as RouterType, type RequestHandler } from "express";
import { authenticate } from "../../middleware/auth.middleware.js";
import { requirePermission, requireAnyPermission } from "../../middleware/authorization.middleware.js";
import { validateBody, validateParams, validateQuery } from "../../middleware/validation.middleware.js";
import { asyncHandler } from "../../middleware/error.middleware.js";
import {
  createReviewCycleSchema,
  updateReviewCycleSchema,
  setGoalsSchema,
  selfAssessmentSchema,
  managerReviewSchema,
  peerFeedbackSchema,
  calibrationSchema,
  directorApprovalSchema,
  reviewAcknowledgementSchema,
  performanceCycleIdParamSchema,
  performanceReviewIdParamSchema,
  performanceCycleReviewsParamSchema,
  performanceCyclesQuerySchema,
  performanceAnalyticsQuerySchema,
} from "./performance.validator.js";
import * as performanceController from "./performance.controller.js";
`;
  } else if (isHr) {
    imports = `import { Router, type Router as RouterType, type RequestHandler } from "express";
import multer from "multer";
import { authenticate } from "../../middleware/auth.middleware.js";
import { requireAnyPermission } from "../../middleware/authorization.middleware.js";
import { validateBody, validateParams, validateQuery } from "../../middleware/validation.middleware.js";
import { asyncHandler } from "../../middleware/error.middleware.js";
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
} from "./documents.validator.js";
import * as hrController from "./hr.controller.js";

const hrDocumentUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
});
`;
  } else if (isFinance) {
    imports = `import { Router, type Router as RouterType, type RequestHandler, type NextFunction, type Request, type Response } from "express";
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
import * as financeController from "./finance.controller.js";

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
`;
  }

  const ctrl = isPayroll
    ? "payrollController"
    : isPerformance
      ? "performanceController"
      : isHr
        ? "hrController"
        : "financeController";

  let out = `${imports}\nconst router: RouterType = Router();\n\nrouter.use(authenticate as any);\n\n`;

  for (let i = 0; i < routes.length; i++) {
    const { method, path } = routes[i];
    const handler = handlerNames[i];
    const mw = middlewares[i] || [];
    out += `router.${method}(\n  "${path}",\n`;
    for (const line of mw) {
      out += `  ${line},\n`;
    }
    out += `  asyncHandler(${ctrl}.${handler}) as RequestHandler,\n);\n\n`;
  }
  out += "export default router;\n";
  fs.writeFileSync(filePath, out);
  console.log("fixed", filePath, routes.length);
}

const payrollNames =
  "getPayrollRuns,getPayrollRunById,initiatePayrollRun,submitPayrollRun,approvePayrollRun,disbursePayrollRun,createCorrectionRun,getPayrollRecords,editPayrollRecord,getSalaryBands,createSalaryBand,updateSalaryBand,deleteSalaryBand,getIncrements,proposeIncrement,approveIncrement,rejectIncrement,getMyPayslips,getPayslipPdf,getPayrollAnalytics".split(
    ",",
  );
fixCorruptedRoutes(
  "src/modules/hr/payroll.routes.ts",
  "payroll",
  payrollNames,
);

const perfNames =
  "getReviewCycles,getReviewCycleById,createReviewCycle,updateReviewCycle,deleteReviewCycle,getCycleReviews,getMyReviews,getPeerFeedbackTargets,getReminderCounts,getReviewById,getPeerFeedbackSubmissions,setGoals,submitSelfAssessment,submitManagerReview,submitPeerFeedback,runCalibration,approveCycleResults,releaseResults,acknowledgeReview,getPerformanceAnalytics".split(
    ",",
  );
fixCorruptedRoutes(
  "src/modules/hr/performance.routes.ts",
  "performance",
  perfNames,
);

const hrSrc = fs.readFileSync("src/modules/hr/hr.routes.ts", "utf8");
const hrNames = [];
const hrRe =
  /router\.(get|post|put|patch|delete)\(\s*[\n\s]*["'`]([^"'`]+)/g;
let hm;
while ((hm = hrRe.exec(hrSrc))) {
  hrNames.push(
    hm[1] +
      "_" +
      hm[2].replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_|_$/g, ""),
  );
}
fixCorruptedRoutes("src/modules/hr/hr.routes.ts", "hr", hrNames);

const finSrc = fs.readFileSync("src/modules/finance/finance.routes.ts", "utf8");
const finNames = [];
const finRe =
  /router\.(get|post|put|patch|delete)\(\s*[\n\s]*["'`]([^"'`]+)/g;
let fm;
while ((fm = finRe.exec(finSrc))) {
  finNames.push(
    fm[1] +
      "_" +
      fm[2].replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_|_$/g, ""),
  );
}
fixCorruptedRoutes("src/modules/finance/finance.routes.ts", "finance", finNames);
