import { Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "../../../types/api.types.js";
import { sendSuccess } from "../../../utils/responses.js";
import * as payrollService from "./payroll.service.js";

export const getPayrollRuns = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const runs = await payrollService.getPayrollRuns(req.query as any);
    sendSuccess(res, runs);
  } catch (error) {
    next(error);
  }
};

export const getPayrollRunById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const run = await payrollService.getPayrollRunById(req.params.id as string);
    sendSuccess(res, run);
  } catch (error) {
    next(error);
  }
};

export const initiatePayrollRun = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
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
      req.user.id,
      notes,
      cohort_name,
      employee_selection,
    );
    sendSuccess(res, run, 201);
  } catch (error) {
    next(error);
  }
};

export const submitPayrollRun = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const run = await payrollService.submitForApproval(req.params.id as string);
    sendSuccess(res, run);
  } catch (error) {
    next(error);
  }
};

export const approvePayrollRun = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const run = await payrollService.approvePayrollRun(
      req.params.id as string,
      req.user.id,
    );
    sendSuccess(res, run);
  } catch (error) {
    next(error);
  }
};

export const disbursePayrollRun = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const run = await payrollService.disbursePayroll(req.params.id as string);
    sendSuccess(res, run);
  } catch (error) {
    next(error);
  }
};

export const createCorrectionRun = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { notes } = req.body as { notes: string };
    const run = await payrollService.createCorrectionRun(
      req.params.id as string,
      req.user.id,
      notes,
    );
    sendSuccess(res, run, 201);
  } catch (error) {
    next(error);
  }
};

export const getPayrollRecords = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const records = await payrollService.getPayrollRecordsByRun(
      req.params.id as string,
    );
    sendSuccess(res, records);
  } catch (error) {
    next(error);
  }
};

export const editPayrollRecord = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const record = await payrollService.editPayrollRecord(
      req.params.id as string,
      req.body as any,
      req.user.id,
    );
    sendSuccess(res, record);
  } catch (error) {
    next(error);
  }
};

export const getSalaryBands = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const bands = await payrollService.getSalaryBands(
      req.query.department as string | undefined,
    );
    sendSuccess(res, bands);
  } catch (error) {
    next(error);
  }
};

export const createSalaryBand = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const band = await payrollService.createSalaryBand(
      req.body as any,
      req.user.id,
    );
    sendSuccess(res, band, 201);
  } catch (error) {
    next(error);
  }
};

export const updateSalaryBand = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const band = await payrollService.updateSalaryBand(
      req.params.id as string,
      req.body as any,
    );
    sendSuccess(res, band);
  } catch (error) {
    next(error);
  }
};

export const deleteSalaryBand = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    await payrollService.deleteSalaryBand(req.params.id as string);
    sendSuccess(res, { deleted: true });
  } catch (error) {
    next(error);
  }
};

export const getIncrements = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const proposals = await payrollService.getIncrementProposals(
      req.query.employee_id as string | undefined,
    );
    sendSuccess(res, proposals);
  } catch (error) {
    next(error);
  }
};

export const proposeIncrement = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const proposal = await payrollService.proposeIncrement(
      req.body as any,
      req.user.id,
    );
    sendSuccess(res, proposal, 201);
  } catch (error) {
    next(error);
  }
};

export const approveIncrement = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await payrollService.approveIncrement(
      req.params.id as string,
      req.user.id,
    );
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
};

export const rejectIncrement = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { reason } = req.body as { reason: string };
    const result = await payrollService.rejectIncrement(
      req.params.id as string,
      req.user.id,
      reason,
    );
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
};

export const getMyPayslips = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const payslips = await payrollService.getEmployeePayslips(req.user.id);
    sendSuccess(res, payslips);
  } catch (error) {
    next(error);
  }
};

export const getPayslipPdf = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const record = await payrollService.getPayslipRecordById(
      req.params.id as string,
      req.user,
    );
    const pdfBuffer = await payrollService.generatePayslipPdfBuffer(
      record,
      "Ophanim Technologies",
    );

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="payslip-${record.month}-${record.employee_id}.pdf"`,
    );
    res.send(pdfBuffer);
  } catch (error) {
    next(error);
  }
};

export const getPayrollAnalytics = async (
  _req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const analytics = await payrollService.getPayrollAnalytics();
    sendSuccess(res, analytics);
  } catch (error) {
    next(error);
  }
};
