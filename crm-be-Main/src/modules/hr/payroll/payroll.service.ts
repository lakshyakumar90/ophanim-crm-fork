import { supabaseAdmin } from "../../../config/supabase.js";
import { ApiError } from "../../../utils/responses.js";
import { ERROR_CODES } from "../../../utils/error-codes.js";
import { PAYROLL_STATUSES } from "../../../config/constants.js";
import type { AuthUser } from "../../../types/api.types.js";

type EmployeeSelection =
  | { type: "all" }
  | { type: "departments"; departments: string[] }
  | { type: "teams"; teams: string[] }
  | { type: "manual"; employee_ids: string[] };

// ============================================================
// Utility — State Guard (Fix #2)
// Every state transition checks the previous state in the service layer.
// The route layer also enforces this via the guard before calling service.
// ============================================================

async function getRunOrThrow(id: string) {
  const { data, error } = await supabaseAdmin
    .from("payroll_runs")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) throw ApiError.notFound("Payroll run");
  return data;
}

function assertRunStatus(run: any, expectedStatus: string, action: string) {
  if (run.status !== expectedStatus) {
    throw new ApiError(
      ERROR_CODES.VALIDATION_ERROR,
      `Cannot ${action}: run must be in '${expectedStatus}' status, currently '${run.status}'`,
    );
  }
}

function assertRunNotDisbursed(run: any) {
  if (run.status === PAYROLL_STATUSES.DISBURSED) {
    throw new ApiError(
      ERROR_CODES.VALIDATION_ERROR,
      "Cannot modify a disbursed payroll run",
    );
  }
}

async function resolveEmployeeIdsForRun(selection?: EmployeeSelection): Promise<string[]> {
  const mode = selection?.type ?? "all";

  if (mode === "manual") {
    const ids = (selection as { type: "manual"; employee_ids: string[] }).employee_ids || [];
    if (ids.length === 0) return [];
    const { data } = await supabaseAdmin
      .from("users")
      .select("id")
      .in("id", ids)
      .eq("is_active", true)
      .neq("role", "admin");
    return Array.from(new Set((data || []).map((u: any) => u.id)));
  }

  if (mode === "departments") {
    const departments = (selection as { type: "departments"; departments: string[] }).departments || [];
    if (departments.length === 0) return [];
    const { data: usersByDept } = await supabaseAdmin
      .from("users")
      .select("id")
      .in("department_id", departments)
      .eq("is_active", true)
      .neq("role", "admin");
    return Array.from(new Set((usersByDept || []).map((u: any) => u.id)));
  }

  if (mode === "teams") {
    const teams = (selection as { type: "teams"; teams: string[] }).teams || [];
    if (teams.length === 0) return [];
    const { data: usersByTeam } = await supabaseAdmin
      .from("users")
      .select("id")
      .in("team_id", teams)
      .eq("is_active", true)
      .neq("role", "admin");
    return Array.from(new Set((usersByTeam || []).map((u: any) => u.id)));
  }

  // all (default)
  const { data: usersAll } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("is_active", true)
    .neq("role", "admin");

  return Array.from(new Set((usersAll || []).map((u: any) => u.id)));
}

// ============================================================
// Calculate individual employee payroll
// ============================================================

async function calculateEmployeePayroll(
  employeeId: string,
  month: string,
): Promise<{
  earnings: Record<string, number>;
  grossPay: number;
  deductions: Record<string, number>;
  totalDeductions: number;
  netPay: number;
  attendanceSummary: Record<string, number>;
}> {
  // Get employee profile for CTC and salary components
  const { data: profile, error: profileErr } = await supabaseAdmin
    .from("employee_profiles")
    .select("current_ctc, salary_components")
    .eq("user_id", employeeId)
    .single();

  let currentCtc: number | null = null;
  if (!profileErr && profile && typeof profile.current_ctc === "number" && profile.current_ctc > 0) {
    currentCtc = profile.current_ctc;
  }

  if (!currentCtc) {
    const { data: latestComp } = await supabaseAdmin
      .from("employee_compensation_history")
      .select("new_ctc")
      .eq("employee_id", employeeId)
      .order("effective_date", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latestComp && typeof (latestComp as any).new_ctc === "number" && (latestComp as any).new_ctc > 0) {
      currentCtc = (latestComp as any).new_ctc;
    }
  }

  if (!currentCtc) {
    const { data: latestApprovedInc } = await supabaseAdmin
      .from("increment_proposals")
      .select("proposed_ctc")
      .eq("employee_id", employeeId)
      .eq("status", "approved")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (
      latestApprovedInc &&
      typeof (latestApprovedInc as any).proposed_ctc === "number" &&
      (latestApprovedInc as any).proposed_ctc > 0
    ) {
      currentCtc = (latestApprovedInc as any).proposed_ctc;
    }
  }

  if (!currentCtc) {
    throw new ApiError(
      ERROR_CODES.VALIDATION_ERROR,
      `Cannot calculate payroll for employee ${employeeId}: missing approved CTC`,
    );
  }

  const monthlyCTC = currentCtc / 12;
  const components = (profile?.salary_components as any) || {};

  const normalizePct = (raw: unknown, fallback: number): number => {
    if (raw === null || raw === undefined) return fallback;
    const num = Number(raw);
    if (!Number.isFinite(num)) return fallback;
    const ratio = num > 1 ? num / 100 : num;
    return Math.max(0, Math.min(1, ratio));
  };

  // Get attendance data for the month
  const monthStart = `${month}-01`;
  const monthEnd = new Date(
    parseInt(month.split("-")[0] as string),
    parseInt(month.split("-")[1] as string),
    0,
  )
    .toISOString()
    .split("T")[0];

  const { data: attendanceRows } = await supabaseAdmin
    .from("attendance")
    .select("status")
    .eq("user_id", employeeId)
    .gte("date", monthStart)
    .lte("date", monthEnd as string);

  const attendance = attendanceRows || [];
  const workingDays = attendance.filter(
    (a: any) => !["holiday"].includes(a.status),
  ).length;
  const presentDays = attendance.filter(
    (a: any) => ["present", "late"].includes(a.status),
  ).length;
  const halfDays = attendance.filter((a: any) => a.status === "half_day").length;
  const lopDays = Math.max(0, workingDays - presentDays - halfDays * 0.5);

  // Compute earnings from salary component percentages.
  // Support both ratio form (0.5) and percent form (50) from legacy/new writers.
  let basicPct = normalizePct(components.basic_pct, 0.5);
  let hraPct = normalizePct(components.hra_pct, 0.2);
  let allowancePct =
    components.allowance_pct === null || components.allowance_pct === undefined
      ? Math.max(0, 1 - basicPct - hraPct)
      : normalizePct(components.allowance_pct, 0.3);

  // Keep monthly pay composition stable and prevent negative components.
  const ratioSum = basicPct + hraPct + allowancePct;
  if (ratioSum > 0) {
    basicPct /= ratioSum;
    hraPct /= ratioSum;
    allowancePct /= ratioSum;
  }

  const basic = Math.round(monthlyCTC * basicPct);
  const hra = Math.round(monthlyCTC * hraPct);
  const allowances = Math.max(0, Math.round(monthlyCTC * allowancePct));
  const grossPay = basic + hra + allowances;

  // Deductions
  const pfRate = 0.12; // 12% of basic
  const pf = Math.round(basic * pfRate);
  const tds = Math.round(grossPay * 0.05); // simplified 5% TDS (real TDS is complex)
  const esiBenefit = grossPay <= 21000 ? Math.round(grossPay * 0.0075) : 0;
  const lopDeduction = workingDays > 0 ? Math.round((grossPay / workingDays) * lopDays) : 0;

  const totalDeductions = pf + tds + esiBenefit + lopDeduction;
  const netPay = grossPay - totalDeductions;

  return {
    earnings: { basic, hra, allowances },
    grossPay,
    deductions: { pf, tds, esi: esiBenefit, lop: lopDeduction, advance_recovery: 0, manual: 0 },
    totalDeductions,
    netPay: Math.max(0, netPay),
    attendanceSummary: { workingDays, presentDays, halfDays, lopDays },
  };
}

// ============================================================
// PAYROLL RUNS
// ============================================================

export async function getPayrollRuns(filters: { status?: string; is_correction?: boolean }) {
  let query = supabaseAdmin
    .from("payroll_runs")
    .select("*, initiated_by_user:users!initiated_by(id, full_name), approved_by_user:users!approved_by(id, full_name)")
    .order("created_at", { ascending: false });

  if (filters.status) query = query.eq("status", filters.status);
  if (typeof filters.is_correction === "boolean")
    query = query.eq("is_correction", filters.is_correction);

  const { data, error } = await query;
  if (error) throw new ApiError(ERROR_CODES.INTERNAL_ERROR, error.message);
  return data || [];
}

export async function getPayrollRunById(id: string) {
  const { data, error } = await supabaseAdmin
    .from("payroll_runs")
    .select("*, initiated_by_user:users!initiated_by(id, full_name), approved_by_user:users!approved_by(id, full_name)")
    .eq("id", id)
    .single();

  if (error || !data) throw ApiError.notFound("Payroll run");
  return data;
}

export async function initiatePayrollRun(
  month: string,
  userId: string,
  notes?: string,
  cohortName?: string,
  employeeSelection?: EmployeeSelection,
) {
  const normalizedCohort = cohortName?.trim() || null;

  // Check for existing non-correction run for this month + cohort
  let existingQuery = supabaseAdmin
    .from("payroll_runs")
    .select("id, status")
    .eq("month", month)
    .eq("is_correction", false)
    .limit(1);

  existingQuery = normalizedCohort
    ? existingQuery.eq("cohort_name", normalizedCohort)
    : existingQuery.is("cohort_name", null);

  const { data: existingRows } = await existingQuery;

  if (existingRows && existingRows.length > 0) {
    const existing = existingRows[0] as any;
    throw new ApiError(
      ERROR_CODES.VALIDATION_ERROR,
      `A payroll run for ${month} already exists for cohort '${normalizedCohort || "all"}' (status: ${existing.status})`,
    );
  }

  const employeeIds = await resolveEmployeeIdsForRun(employeeSelection);

  if (employeeIds.length === 0) {
    throw new ApiError(ERROR_CODES.VALIDATION_ERROR, "No active employees found for selected filters");
  }

  // Create draft run
  const { data: run, error: runErr } = await supabaseAdmin
    .from("payroll_runs")
    .insert({
      month,
      initiated_by: userId,
      status: PAYROLL_STATUSES.DRAFT,
      notes,
      is_correction: false,
      cohort_name: normalizedCohort,
      employee_selection: employeeSelection || { type: "all" },
    })
    .select()
    .single();

  if (runErr || !run) throw new ApiError(ERROR_CODES.INTERNAL_ERROR, runErr?.message || "Failed to create run");

  // Calculate and create draft records for each employee
  const recordInserts = await Promise.all(
    employeeIds.map(async (employeeId) => {
      const calc = await calculateEmployeePayroll(employeeId, month);
      return {
        payroll_run_id: run.id,
        employee_id: employeeId,
        month,
        earnings: calc.earnings,
        gross_pay: calc.grossPay,
        deductions: calc.deductions,
        total_deductions: calc.totalDeductions,
        net_pay: calc.netPay,
        attendance_summary: calc.attendanceSummary,
        edits: [],
      };
    }),
  );

  const { error: recErr } = await supabaseAdmin.from("payroll_records").insert(recordInserts);
  if (recErr) throw new ApiError(ERROR_CODES.INTERNAL_ERROR, recErr.message);

  // Update run totals
  const totals = recordInserts.reduce(
    (acc, r) => ({
      gross: acc.gross + r.gross_pay,
      deductions: acc.deductions + r.total_deductions,
      net: acc.net + r.net_pay,
    }),
    { gross: 0, deductions: 0, net: 0 },
  );

  await supabaseAdmin
    .from("payroll_runs")
    .update({
      total_gross: totals.gross,
      total_deductions: totals.deductions,
      total_net: totals.net,
      updated_at: new Date().toISOString(),
    })
    .eq("id", run.id);

  return { ...run, total_gross: totals.gross, total_deductions: totals.deductions, total_net: totals.net };
}

export async function getPayrollRecordsByRun(runId: string) {
  await getRunOrThrow(runId);

  const { data, error } = await supabaseAdmin
    .from("payroll_records")
    .select("*, employee:users!employee_id(id, full_name, email, job_title)")
    .eq("payroll_run_id", runId)
    .order("created_at", { ascending: true });

  if (error) throw new ApiError(ERROR_CODES.INTERNAL_ERROR, error.message);
  return data || [];
}

export async function editPayrollRecord(
  recordId: string,
  input: { earnings?: Record<string, number>; deductions?: Record<string, number>; reason: string },
  editorUserId: string,
) {
  const { data: record, error } = await supabaseAdmin
    .from("payroll_records")
    .select("*, payroll_runs!payroll_run_id(status)")
    .eq("id", recordId)
    .single();

  if (error || !record) throw ApiError.notFound("Payroll record");

  // Guard: reject edits on approved/disbursed runs (Fix #2)
  const run = (record as any).payroll_runs;
  if (run.status === PAYROLL_STATUSES.APPROVED || run.status === PAYROLL_STATUSES.DISBURSED) {
    throw new ApiError(
      ERROR_CODES.VALIDATION_ERROR,
      `Cannot edit records on a ${run.status} payroll run`,
    );
  }

  const currentEarnings = (record.earnings || {}) as Record<string, number>;
  const currentDeductions = (record.deductions || {}) as Record<string, number>;
  const newEarnings = { ...currentEarnings, ...(input.earnings || {}) };
  const newDeductions = { ...currentDeductions, ...(input.deductions || {}) };

  const grossPay = Object.values(newEarnings).reduce((sum, v) => sum + v, 0);
  const totalDeductions = Object.values(newDeductions).reduce((sum, v) => sum + v, 0);
  const netPay = Math.max(0, grossPay - totalDeductions);

  // Append to edits audit trail
  const editEntry = {
    field: "manual_edit",
    old_earnings: currentEarnings,
    old_deductions: currentDeductions,
    new_earnings: newEarnings,
    new_deductions: newDeductions,
    edited_by: editorUserId,
    reason: input.reason,
    timestamp: new Date().toISOString(),
  };

  const existingEdits = (record.edits as any[]) || [];

  const { data: updated, error: updErr } = await supabaseAdmin
    .from("payroll_records")
    .update({
      earnings: newEarnings,
      deductions: newDeductions,
      gross_pay: grossPay,
      total_deductions: totalDeductions,
      net_pay: netPay,
      edits: [...existingEdits, editEntry] as any,
      updated_at: new Date().toISOString(),
    })
    .eq("id", recordId)
    .select()
    .single();

  if (updErr) throw new ApiError(ERROR_CODES.INTERNAL_ERROR, updErr.message);
  return updated;
}

export async function submitForApproval(runId: string) {
  const run = await getRunOrThrow(runId);
  assertRunStatus(run, PAYROLL_STATUSES.DRAFT, "submit for approval"); // Fix #2

  const { data, error } = await supabaseAdmin
    .from("payroll_runs")
    .update({ status: PAYROLL_STATUSES.SUBMITTED, updated_at: new Date().toISOString() })
    .eq("id", runId)
    .select()
    .single();

  if (error) throw new ApiError(ERROR_CODES.INTERNAL_ERROR, error.message);
  return data;
}

export async function approvePayrollRun(runId: string, approverUserId: string) {
  const run = await getRunOrThrow(runId);
  assertRunStatus(run, PAYROLL_STATUSES.SUBMITTED, "approve"); // Fix #2

  const { data, error } = await supabaseAdmin
    .from("payroll_runs")
    .update({
      status: PAYROLL_STATUSES.APPROVED,
      approved_by: approverUserId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", runId)
    .select()
    .single();

  if (error) throw new ApiError(ERROR_CODES.INTERNAL_ERROR, error.message);
  return data;
}

export async function disbursePayroll(runId: string) {
  const run = await getRunOrThrow(runId);
  // Fix #2: MUST be approved before disbursing — checked in BOTH service and route
  assertRunStatus(run, PAYROLL_STATUSES.APPROVED, "disburse");

  const now = new Date().toISOString();

  const { data, error } = await supabaseAdmin
    .from("payroll_runs")
    .update({
      status: PAYROLL_STATUSES.DISBURSED,
      disbursed_at: now,
      updated_at: now,
    })
    .eq("id", runId)
    .select()
    .single();

  if (error) throw new ApiError(ERROR_CODES.INTERNAL_ERROR, error.message);

  // Notify all employees in this run that their payslip is ready
  const records = await getPayrollRecordsByRun(runId);
  const notifications = (records as any[]).map((r) => ({
    user_id: r.employee_id,
    title: "Your payslip is ready 💰",
    message: `Payslip for ${run.month} has been disbursed. Net pay: ₹${r.net_pay?.toLocaleString("en-IN")}.`,
    type: "system",
    priority: "normal",
    action_url: "/hr/payroll/my-payslips",
  }));

  if (notifications.length > 0) {
    await supabaseAdmin.from("notifications").insert(notifications);
  }

  return data;
}

export async function createCorrectionRun(
  originalRunId: string,
  userId: string,
  notes: string,
) {
  const original = await getRunOrThrow(originalRunId);

  if (original.status !== PAYROLL_STATUSES.DISBURSED) {
    throw new ApiError(ERROR_CODES.VALIDATION_ERROR, "Correction runs can only be created for disbursed runs");
  }

  const { data: run, error } = await supabaseAdmin
    .from("payroll_runs")
    .insert({
      month: original.month,
      initiated_by: userId,
      status: PAYROLL_STATUSES.DRAFT,
      notes,
      is_correction: true,
      original_run_id: originalRunId,
    })
    .select()
    .single();

  if (error) throw new ApiError(ERROR_CODES.INTERNAL_ERROR, error.message);
  return run;
}

// ============================================================
// SALARY BANDS
// ============================================================

export async function getSalaryBands(department?: string) {
  let query = supabaseAdmin
    .from("salary_bands")
    .select("*")
    .order("designation", { ascending: true });

  if (department) query = query.eq("department", department);

  const { data, error } = await query;
  if (error) throw new ApiError(ERROR_CODES.INTERNAL_ERROR, error.message);
  return data || [];
}

export async function createSalaryBand(input: Record<string, unknown>, userId: string) {
  const { data, error } = await supabaseAdmin
    .from("salary_bands")
    .insert({ ...input, created_by: userId })
    .select()
    .single();

  if (error) throw new ApiError(ERROR_CODES.INTERNAL_ERROR, error.message);
  return data;
}

export async function updateSalaryBand(id: string, input: Record<string, unknown>) {
  const { data, error } = await supabaseAdmin
    .from("salary_bands")
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error || !data) throw ApiError.notFound("Salary band");
  return data;
}

export async function deleteSalaryBand(id: string) {
  const { error } = await supabaseAdmin.from("salary_bands").delete().eq("id", id);
  if (error) throw new ApiError(ERROR_CODES.INTERNAL_ERROR, error.message);
}

// ============================================================
// INCREMENT PROPOSALS
// ============================================================

export async function proposeIncrement(
  input: { employee_id: string; proposed_ctc: number; effective_date: string; reason: string },
  proposedByUserId: string,
) {
  // Get current CTC from profile
  const { data: profile } = await supabaseAdmin
    .from("employee_profiles")
    .select("current_ctc")
    .eq("user_id", input.employee_id)
    .single();

  const { data, error } = await supabaseAdmin
    .from("increment_proposals")
    .insert({
      employee_id: input.employee_id,
      proposed_by: proposedByUserId,
      current_ctc: profile?.current_ctc,
      proposed_ctc: input.proposed_ctc,
      effective_date: input.effective_date,
      reason: input.reason,
      status: "pending",
    })
    .select()
    .single();

  if (error) throw new ApiError(ERROR_CODES.INTERNAL_ERROR, error.message);
  return data;
}

export async function approveIncrement(proposalId: string, approverUserId: string) {
  const { data: proposal, error } = await supabaseAdmin
    .from("increment_proposals")
    .select("*")
    .eq("id", proposalId)
    .single();

  if (error || !proposal) throw ApiError.notFound("Increment proposal");

  if ((proposal as any).status !== "pending") {
    throw new ApiError(ERROR_CODES.VALIDATION_ERROR, "Proposal is not in pending status");
  }

  const prop = proposal as any;
  const changePercentage = prop.current_ctc
    ? Math.round(
        (((prop.proposed_ctc - prop.current_ctc) /
          prop.current_ctc) *
          100) *
          100,
      ) / 100
    : null;

  // Update proposal
  await supabaseAdmin
    .from("increment_proposals")
    .update({ status: "approved", approved_by: approverUserId, updated_at: new Date().toISOString() })
    .eq("id", proposalId);

  // Update employee profile CTC
  const { error: ctcUpdateErr } = await supabaseAdmin
    .from("employee_profiles")
    .update({ current_ctc: prop.proposed_ctc, updated_at: new Date().toISOString() })
    .eq("user_id", prop.employee_id);

  if (ctcUpdateErr) {
    throw new ApiError(ERROR_CODES.INTERNAL_ERROR, ctcUpdateErr.message);
  }

  // Append to immutable compensation history
  await supabaseAdmin.from("employee_compensation_history").insert({
    employee_id: prop.employee_id,
    effective_date: prop.effective_date,
    previous_ctc: prop.current_ctc,
    new_ctc: prop.proposed_ctc,
    change_percentage: changePercentage,
    reason: prop.reason,
    approved_by: approverUserId,
  });

  // Notify employee
  await supabaseAdmin.from("notifications").insert({
    user_id: prop.employee_id,
    title: "Salary increment approved 🎉",
    message: `Your salary has been updated. New CTC effective from ${prop.effective_date}.`,
    type: "system",
    priority: "high",
  });

  return { ...proposal, status: "approved", approved_by: approverUserId };
}

export async function rejectIncrement(proposalId: string, approverUserId: string, reason: string) {
  const { data, error } = await supabaseAdmin
    .from("increment_proposals")
    .update({ status: "rejected", approved_by: approverUserId, updated_at: new Date().toISOString() })
    .eq("id", proposalId)
    .select()
    .single();

  if (error || !data) throw ApiError.notFound("Increment proposal");
  return data;
}

export async function getIncrementProposals(employeeId?: string) {
  let query = supabaseAdmin
    .from("increment_proposals")
    .select("*, employee:users!employee_id(id, full_name), proposed_by_user:users!proposed_by(id, full_name)")
    .order("created_at", { ascending: false });

  if (employeeId) query = query.eq("employee_id", employeeId);

  const { data, error } = await query;
  if (error) throw new ApiError(ERROR_CODES.INTERNAL_ERROR, error.message);
  return data || [];
}

// ============================================================
// PAYSLIPS (self-service)
// ============================================================

export async function getEmployeePayslips(employeeId: string) {
  const { data, error } = await supabaseAdmin
    .from("payroll_records")
    .select("*, payroll_runs!payroll_run_id(id, month, status, disbursed_at)")
    .eq("employee_id", employeeId)
    .order("created_at", { ascending: false });

  if (error) throw new ApiError(ERROR_CODES.INTERNAL_ERROR, error.message);
  return (data || []).filter((r: any) => r.payroll_runs?.status === "disbursed");
}

export async function getPayslipRecordById(recordId: string, authUser: AuthUser) {
  const { data, error } = await supabaseAdmin
    .from("payroll_records")
    .select("*, payroll_runs!payroll_run_id(id, month, status, disbursed_at), employee:users!employee_id(id, full_name, email, job_title)")
    .eq("id", recordId)
    .single();

  if (error || !data) {
    throw ApiError.notFound("Payslip");
  }

  if (data.payroll_runs?.status !== "disbursed") {
    throw new ApiError(ERROR_CODES.VALIDATION_ERROR, "Payslip is not available until payroll is disbursed");
  }

  const canViewAny =
    authUser.role === "admin" ||
    authUser.permissions.includes("payroll:view") ||
    authUser.permissions.includes("payroll:manage") ||
    authUser.permissions.includes("payroll:approve") ||
    authUser.permissions.includes("crm:admin");

  if (!canViewAny && data.employee_id !== authUser.id) {
    throw new ApiError(ERROR_CODES.FORBIDDEN, "You are not allowed to access this payslip");
  }

  return data;
}

export async function generatePayslipPdfBuffer(record: any, companyName = "Ophanim Technologies") {
  const { createRequire } = await import("node:module");
  const pathMod = await import("node:path");
  const fs = await import("node:fs/promises");
  const require = createRequire(import.meta.url);
  const PDFDocument = require("pdfkit") as new (options?: { margin?: number; size?: string }) => any;

  const doc = new PDFDocument({ margin: 48, size: "A4" });
  const chunks: Buffer[] = [];

  const bufferPromise = new Promise<Buffer>((resolve, reject) => {
    doc.on("data", (chunk: Buffer | Uint8Array) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  const earnings = record.earnings || {};
  const deductions = record.deductions || {};
  const attendance = record.attendance_summary || {};
  const monthLabel = String(record.month || "");

  const formatInr = (value: unknown) => `INR ${Number(value || 0).toLocaleString("en-IN")}`;

  const candidateLogoPaths = [
    pathMod.resolve(process.cwd(), "../crm-fe-main/public/logo.png"),
    pathMod.resolve(process.cwd(), "crm-fe-main/public/logo.png"),
    pathMod.resolve(process.cwd(), "public/logo.png"),
  ];

  let logoPath: string | null = null;
  for (const candidate of candidateLogoPaths) {
    try {
      await fs.access(candidate);
      logoPath = candidate;
      break;
    } catch {
      // Try next candidate path.
    }
  }

  let y = 48;

  if (logoPath) {
    try {
      doc.image(logoPath, 48, y, { fit: [42, 42], align: "left", valign: "top" });
    } catch {
      // If image loading fails, continue without logo.
    }
  }

  doc.fontSize(19).fillColor("#111827").text(companyName, logoPath ? 98 : 48, y + 2, { align: "left" });
  doc.fontSize(11).fillColor("#6B7280").text("Salary Payslip", logoPath ? 98 : 48, y + 25, { align: "left" });
  doc.fontSize(11).fillColor("#111827").text(`Pay Period: ${monthLabel}`, 360, y + 8, { align: "right", width: 190 });

  y += 58;
  doc.moveTo(48, y).lineTo(547, y).strokeColor("#E5E7EB").lineWidth(1).stroke();
  y += 16;

  doc.roundedRect(48, y, 245, 76, 6).fillAndStroke("#F9FAFB", "#E5E7EB");
  doc.roundedRect(302, y, 245, 76, 6).fillAndStroke("#F9FAFB", "#E5E7EB");

  doc.fillColor("#6B7280").fontSize(9).text("EMPLOYEE", 60, y + 10);
  doc.fillColor("#111827").fontSize(11).text(record.employee?.full_name || "Employee", 60, y + 26);
  doc.fillColor("#4B5563").fontSize(10).text(record.employee?.email || "-", 60, y + 43);
  doc.fillColor("#4B5563").fontSize(10).text(record.employee?.job_title || "-", 60, y + 58);

  doc.fillColor("#6B7280").fontSize(9).text("PAYROLL DETAILS", 314, y + 10);
  doc.fillColor("#111827").fontSize(10).text(`Status: ${record.payroll_runs?.status || "disbursed"}`, 314, y + 26);
  doc.fillColor("#111827").fontSize(10).text(`Employee ID: ${String(record.employee_id || "").slice(0, 8).toUpperCase()}`, 314, y + 43);
  doc.fillColor("#111827").fontSize(10).text(`Month: ${monthLabel}`, 314, y + 58);

  y += 96;

  const sectionWidth = 245;
  const leftX = 48;
  const rightX = 302;
  const sectionPad = 12;
  const rowHeight = 16;

  const earningRows = [
    ["Basic", Number(earnings.basic || 0)],
    ["HRA", Number(earnings.hra || 0)],
    ["Allowances", Number(earnings.allowances || 0)],
    ["Incentive", Number(earnings.incentive || 0)],
    ["Bonus", Number(earnings.bonus || 0)],
  ].filter(([name, amount]) => Number(amount) !== 0 || (name !== "Bonus" && name !== "Incentive"));

  const deductionRows = [
    ["PF", Number(deductions.pf || 0)],
    ["TDS", Number(deductions.tds || 0)],
    ["ESI", Number(deductions.esi || 0)],
    ["LOP", Number(deductions.lop || 0)],
    ["Advance Recovery", Number(deductions.advance_recovery || 0)],
    ["Manual", Number(deductions.manual || 0)],
  ].filter(([, amount]) => Number(amount) !== 0);

  const sectionHeight = Math.max(164, sectionPad * 2 + Math.max(earningRows.length, deductionRows.length) * rowHeight + 58);

  doc.roundedRect(leftX, y, sectionWidth, sectionHeight, 6).fillAndStroke("#FFFFFF", "#E5E7EB");
  doc.roundedRect(rightX, y, sectionWidth, sectionHeight, 6).fillAndStroke("#FFFFFF", "#E5E7EB");

  doc.fillColor("#6B7280").fontSize(10).text("EARNINGS", leftX + sectionPad, y + sectionPad);
  let ey = y + sectionPad + 18;
  for (const [label, amount] of earningRows) {
    doc.fillColor("#374151").fontSize(10).text(String(label), leftX + sectionPad, ey);
    doc.fillColor("#111827").fontSize(10).text(formatInr(amount), leftX + sectionWidth - sectionPad - 120, ey, {
      width: 120,
      align: "right",
    });
    ey += rowHeight;
  }
  doc.moveTo(leftX + sectionPad, y + sectionHeight - 36).lineTo(leftX + sectionWidth - sectionPad, y + sectionHeight - 36).strokeColor("#E5E7EB").stroke();
  doc.fillColor("#111827").fontSize(10).text("Gross Pay", leftX + sectionPad, y + sectionHeight - 24);
  doc.fillColor("#111827").fontSize(11).text(formatInr(record.gross_pay), leftX + sectionWidth - sectionPad - 120, y + sectionHeight - 24, {
    width: 120,
    align: "right",
  });

  doc.fillColor("#6B7280").fontSize(10).text("DEDUCTIONS", rightX + sectionPad, y + sectionPad);
  let dy = y + sectionPad + 18;
  if (deductionRows.length === 0) {
    doc.fillColor("#6B7280").fontSize(10).text("No deductions", rightX + sectionPad, dy);
  } else {
    for (const [label, amount] of deductionRows) {
      doc.fillColor("#374151").fontSize(10).text(String(label), rightX + sectionPad, dy);
      doc.fillColor("#B91C1C").fontSize(10).text(formatInr(amount), rightX + sectionWidth - sectionPad - 120, dy, {
        width: 120,
        align: "right",
      });
      dy += rowHeight;
    }
  }
  doc.moveTo(rightX + sectionPad, y + sectionHeight - 36).lineTo(rightX + sectionWidth - sectionPad, y + sectionHeight - 36).strokeColor("#E5E7EB").stroke();
  doc.fillColor("#111827").fontSize(10).text("Total Deductions", rightX + sectionPad, y + sectionHeight - 24);
  doc.fillColor("#B91C1C").fontSize(11).text(formatInr(record.total_deductions), rightX + sectionWidth - sectionPad - 120, y + sectionHeight - 24, {
    width: 120,
    align: "right",
  });

  y += sectionHeight + 16;

  doc.roundedRect(48, y, 499, 52, 6).fillAndStroke("#F3F4F6", "#E5E7EB");
  doc.fillColor("#111827").fontSize(13).text("Net Pay", 62, y + 18);
  doc.fillColor("#047857").fontSize(16).text(formatInr(record.net_pay), 360, y + 16, { width: 170, align: "right" });

  y += 68;

  doc.roundedRect(48, y, 499, 78, 6).fillAndStroke("#FFFFFF", "#E5E7EB");
  doc.fillColor("#6B7280").fontSize(10).text("ATTENDANCE SUMMARY", 60, y + 10);
  doc.fillColor("#111827").fontSize(10).text(`Working Days: ${attendance.workingDays ?? attendance.working_days ?? 0}`, 60, y + 30);
  doc.text(`Present: ${attendance.presentDays ?? attendance.present_days ?? 0}`, 205, y + 30);
  doc.text(`Half Days: ${attendance.halfDays ?? attendance.half_days ?? 0}`, 325, y + 30);
  doc.text(`LOP Days: ${attendance.lopDays ?? attendance.lop_days ?? 0}`, 440, y + 30, { width: 95, align: "right" });

  y += 96;

  doc.moveTo(48, y).lineTo(547, y).strokeColor("#E5E7EB").stroke();
  doc.fillColor("#6B7280").fontSize(9).text(
    "This is a computer-generated payslip issued by Ophanim Technologies.",
    48,
    y + 10,
  );

  doc.end();
  return bufferPromise;
}

// ============================================================
// ANALYTICS
// ============================================================

export async function getPayrollAnalytics() {
  const { data: runs } = await supabaseAdmin
    .from("payroll_runs")
    .select("id, month, status, total_gross, total_net, total_deductions")
    .order("month", { ascending: false })
    .limit(12);

  const { data: records } = await supabaseAdmin
    .from("payroll_records")
    .select("employee_id, month, gross_pay, net_pay, total_deductions, employee:users!employee_id(department)")
    .order("month", { ascending: false })
    .limit(500);

  // Department cost breakdown (latest month)
  const deptCosts =
    (records || []).reduce(
      (acc: Record<string, number>, r: any) => {
        const dept = r.employee?.department || "Unknown";
        acc[dept] = (acc[dept] || 0) + r.gross_pay;
        return acc;
      },
      {},
    );

  // Anomaly detection: flag employees with >20% cost change vs prior month
  const monthGroups = (records || []).reduce(
    (acc: Record<string, any[]>, r: any) => {
      const monthStr = r.month;
      if (!acc[monthStr]) {
        acc[monthStr] = [];
      }
      acc[monthStr]!.push(r);
      return acc;
    },
    {},
  );

  const months = Object.keys(monthGroups).sort().reverse();
  const anomalies: any[] = [];
  if (months.length >= 2) {
    const current = monthGroups[months[0] as string] || [];
    const previous = monthGroups[months[1] as string] || [];
    const prevMap = Object.fromEntries(previous.map((r: any) => [r.employee_id, r.gross_pay]));
    current.forEach((r: any) => {
      const prev = prevMap[r.employee_id];
      if (prev && Math.abs((r.gross_pay - prev) / prev) > 0.2) {
        anomalies.push({
          employee_id: r.employee_id,
          current_gross: r.gross_pay,
          previous_gross: prev,
          change_pct: Math.round(((r.gross_pay - prev) / prev) * 100),
          month: months[0],
        });
      }
    });
  }

  return {
    monthlyTrend: runs || [],
    departmentCosts: deptCosts,
    anomalies,
  };
}
