import { z } from "zod";

export const payrollRunIdParamSchema = z.object({
  id: z.string().uuid("Invalid payroll run ID"),
});

export const payrollRecordIdParamSchema = z.object({
  id: z.string().uuid("Invalid payroll record ID"),
});

export const payrollSalaryBandIdParamSchema = z.object({
  id: z.string().uuid("Invalid salary band ID"),
});

export const payrollIncrementIdParamSchema = z.object({
  id: z.string().uuid("Invalid increment proposal ID"),
});

// ============================================================
// Payroll Run Schemas
// ============================================================

export const initiatePayrollRunSchema = z.object({
  month: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Month must be in YYYY-MM format"),
  notes: z.string().optional(),
  cohort_name: z.string().trim().min(1).max(120).optional(),
  employee_selection: z
    .discriminatedUnion("type", [
      z.object({ type: z.literal("all") }),
      z.object({
        type: z.literal("departments"),
        departments: z.array(z.string().uuid()).min(1, "Select at least one department"),
      }),
      z.object({
        type: z.literal("teams"),
        teams: z.array(z.string().uuid()).min(1, "Select at least one team"),
      }),
      z.object({
        type: z.literal("manual"),
        employee_ids: z.array(z.string().uuid()).min(1, "Select at least one employee"),
      }),
    ])
    .optional(),
});

export const submitForApprovalSchema = z.object({
  notes: z.string().optional(),
});

export const approvePayrollRunSchema = z.object({
  notes: z.string().optional(),
});

export const disbursePayrollRunSchema = z.object({
  notes: z.string().optional(),
});

export const createCorrectionRunSchema = z.object({
  original_run_id: z.string().uuid(),
  notes: z.string().min(1, "Notes are required for correction runs"),
});

// ============================================================
// Payroll Record Schemas
// ============================================================

export const editPayrollRecordSchema = z.object({
  earnings: z
    .object({
      basic: z.number().nonnegative().optional(),
      hra: z.number().nonnegative().optional(),
      allowances: z.number().nonnegative().optional(),
      bonus: z.number().nonnegative().optional(),
      incentive: z.number().nonnegative().optional(),
    })
    .optional(),
  deductions: z
    .object({
      tds: z.number().nonnegative().optional(),
      pf: z.number().nonnegative().optional(),
      esi: z.number().nonnegative().optional(),
      lop: z.number().nonnegative().optional(),
      advance_recovery: z.number().nonnegative().optional(),
      manual: z.number().nonnegative().optional(),
    })
    .optional(),
  reason: z.string().min(1, "Reason is required when editing a payroll record"),
});

// ============================================================
// Salary Band Schemas
// ============================================================

export const createSalaryBandSchema = z.object({
  designation: z.string().min(1, "Designation is required"),
  department: z.string().optional(),
  min_ctc: z.number().positive("Min CTC must be positive"),
  max_ctc: z.number().positive("Max CTC must be positive"),
  components_template: z
    .union([
      z.object({
        basic_pct: z.number().min(0).max(100).optional(),
        hra_pct: z.number().min(0).max(100).optional(),
        allowance_pct: z.number().min(0).max(100).optional(),
      }),
      z.array(z.any()),
    ])
    .optional(),
});

export const updateSalaryBandSchema = createSalaryBandSchema.partial();

// ============================================================
// Increment Schemas
// ============================================================

export const proposeIncrementSchema = z.object({
  employee_id: z.string().uuid(),
  proposed_ctc: z.number().positive("Proposed CTC must be positive"),
  effective_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Effective date must be YYYY-MM-DD"),
  reason: z.string().min(1, "Reason is required"),
});

export const approveIncrementSchema = z.object({
  notes: z.string().optional(),
});

export const rejectIncrementSchema = z.object({
  reason: z.string().min(1, "Rejection reason is required"),
});

// ============================================================
// Query Schemas
// ============================================================

export const listPayrollRunsQuerySchema = z.object({
  status: z.enum(["draft", "submitted", "approved", "disbursed"]).optional(),
  is_correction: z
    .string()
    .transform((v) => v === "true")
    .optional(),
});

export const payrollSalaryBandsQuerySchema = z.object({
  department: z.string().optional(),
});

export const payrollIncrementsQuerySchema = z.object({
  employee_id: z.string().uuid().optional(),
});

export const payrollCorrectionSchema = z.object({
  notes: z.string().min(1, "Notes are required for correction runs"),
});
