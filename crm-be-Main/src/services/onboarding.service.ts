import { supabaseAdmin } from "../config/supabase.js";
import { ApiError } from "../utils/responses.js";
import { ERROR_CODES } from "../utils/error-codes.js";
import { CHECKLIST_TYPES, CHECKLIST_TASK_STATUSES } from "../config/constants.js";
import type { AuthUser } from "../types/api.types.js";

// ============================================================
// Utility
// ============================================================

// Fix #5: completion_rate is computed at query time — NEVER stored
function computeCompletionRate(tasks: any[]): number {
  if (!tasks || tasks.length === 0) return 0;
  const done = tasks.filter((t) => t.status === CHECKLIST_TASK_STATUSES.DONE).length;
  return Math.round((done / tasks.length) * 100);
}

function enrichChecklistWithComputedFields(checklist: any) {
  const tasks = (checklist.tasks as any[]) || [];
  return {
    ...checklist,
    completion_rate: computeCompletionRate(tasks),
    total_tasks: tasks.length,
    done_tasks: tasks.filter((t) => t.status === CHECKLIST_TASK_STATUSES.DONE).length,
  };
}

async function ensureOnboardingChecklistForProbationEmployee(employeeId: string) {
  const { data: existing, error: existingError } = await supabaseAdmin
    .from("onboarding_checklists")
    .select("id")
    .eq("employee_id", employeeId)
    .eq("type", CHECKLIST_TYPES.ONBOARDING)
    .limit(1);

  if (existingError) {
    throw new ApiError(ERROR_CODES.INTERNAL_ERROR, existingError.message);
  }

  if ((existing || []).length > 0) return;

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("employee_profiles")
    .select("hr_status, date_of_joining")
    .eq("user_id", employeeId)
    .maybeSingle();

  if (profileError) {
    throw new ApiError(ERROR_CODES.INTERNAL_ERROR, profileError.message);
  }

  if (!profile || profile.hr_status !== "probation") return;

  await createChecklist({
    employee_id: employeeId,
    type: CHECKLIST_TYPES.ONBOARDING,
    joining_date: profile.date_of_joining || undefined,
  });
}

async function ensureOnboardingChecklistsForProbationEmployees() {
  const { data: profiles, error: profilesError } = await supabaseAdmin
    .from("employee_profiles")
    .select("user_id, hr_status, date_of_joining")
    .eq("hr_status", "probation");

  if (profilesError) {
    throw new ApiError(ERROR_CODES.INTERNAL_ERROR, profilesError.message);
  }

  const probationProfiles = (profiles || []).filter((p: any) => p.user_id);
  if (probationProfiles.length === 0) return;

  const userIds = probationProfiles.map((p: any) => p.user_id);

  const { data: existing, error: existingError } = await supabaseAdmin
    .from("onboarding_checklists")
    .select("employee_id")
    .eq("type", CHECKLIST_TYPES.ONBOARDING)
    .in("employee_id", userIds);

  if (existingError) {
    throw new ApiError(ERROR_CODES.INTERNAL_ERROR, existingError.message);
  }

  const existingUserIds = new Set((existing || []).map((row: any) => row.employee_id));

  const pending = probationProfiles.filter((p: any) => !existingUserIds.has(p.user_id));
  if (pending.length === 0) return;

  for (const profile of pending) {
    await createChecklist({
      employee_id: profile.user_id,
      type: CHECKLIST_TYPES.ONBOARDING,
      joining_date: profile.date_of_joining || undefined,
    });
  }
}


// ============================================================
// TEMPLATES
// ============================================================

export async function getOnboardingTemplates(type?: string, department?: string) {
  let query = supabaseAdmin
    .from("onboarding_templates")
    .select("*")
    .order("name", { ascending: true });

  if (type) query = query.eq("type", type);
  if (department) query = query.eq("department", department);

  const { data, error } = await query;
  if (error) throw new ApiError(ERROR_CODES.INTERNAL_ERROR, error.message);
  return data || [];
}

export async function getTemplateById(id: string) {
  const { data, error } = await supabaseAdmin
    .from("onboarding_templates")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) throw ApiError.notFound("Onboarding template");
  return data;
}

export async function createTemplate(input: Record<string, unknown>, userId: string) {
  const { data, error } = await supabaseAdmin
    .from("onboarding_templates")
    .insert({ ...input, created_by: userId })
    .select()
    .single();

  if (error) throw new ApiError(ERROR_CODES.INTERNAL_ERROR, error.message);
  return data;
}

export async function updateTemplate(id: string, input: Record<string, unknown>) {
  await getTemplateById(id);

  const { data, error } = await supabaseAdmin
    .from("onboarding_templates")
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) throw new ApiError(ERROR_CODES.INTERNAL_ERROR, error.message);
  return data;
}

// ============================================================
// CHECKLISTS
// ============================================================

export async function getActiveChecklists(type?: string) {
  if (!type || type === CHECKLIST_TYPES.ONBOARDING) {
    await ensureOnboardingChecklistsForProbationEmployees();
  }

  let query = supabaseAdmin
    .from("onboarding_checklists")
    .select("*, employee:users!employee_id(id, full_name, avatar_url, email)")
    .order("created_at", { ascending: false });

  if (type) query = query.eq("type", type);

  const { data, error } = await query;
  if (error) throw new ApiError(ERROR_CODES.INTERNAL_ERROR, error.message);

  // Fix #5: compute completion_rate at query time
  return (data || []).map(enrichChecklistWithComputedFields);
}

export async function getChecklistByEmployee(employeeId: string) {
  await ensureOnboardingChecklistForProbationEmployee(employeeId);

  const { data, error } = await supabaseAdmin
    .from("onboarding_checklists")
    .select("*, template:onboarding_templates!template_id(id, name)")
    .eq("employee_id", employeeId)
    .order("created_at", { ascending: false });

  if (error) throw new ApiError(ERROR_CODES.INTERNAL_ERROR, error.message);

  // Fix #5: compute completion_rate at query time for each checklist
  return (data || []).map(enrichChecklistWithComputedFields);
}

export async function getChecklistById(id: string) {
  const { data, error } = await supabaseAdmin
    .from("onboarding_checklists")
    .select("*, employee:users!employee_id(id, full_name), template:onboarding_templates!template_id(id, name)")
    .eq("id", id)
    .single();

  if (error || !data) throw ApiError.notFound("Onboarding checklist");

  return enrichChecklistWithComputedFields(data);
}

export async function getOffboardingChecklistForPdf(checklistId: string, authUser: AuthUser) {
  const { data, error } = await supabaseAdmin
    .from("onboarding_checklists")
    .select("*, employee:users!employee_id(id, full_name, email, job_title)")
    .eq("id", checklistId)
    .single();

  if (error || !data) {
    throw ApiError.notFound("Onboarding checklist");
  }

  if ((data as any).type !== CHECKLIST_TYPES.OFFBOARDING) {
    throw new ApiError(ERROR_CODES.VALIDATION_ERROR, "PDF is available only for offboarding checklists");
  }

  const canViewAny =
    authUser.role === "admin" ||
    authUser.permissions.includes("crm:admin") ||
    authUser.permissions.includes("onboarding:view") ||
    authUser.permissions.includes("onboarding:manage") ||
    authUser.permissions.includes("hr:view") ||
    authUser.permissions.includes("hr:manage");

  if (!canViewAny && (data as any).employee_id !== authUser.id) {
    throw new ApiError(ERROR_CODES.FORBIDDEN, "Access denied");
  }

  return enrichChecklistWithComputedFields(data);
}

export async function generateOffboardingPdfBuffer(checklist: any, companyName = "Ophanim Technologies") {
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

  const exit = (checklist.exit_details || {}) as Record<string, unknown>;
  const interview = ((exit.exit_interview_data || {}) as Record<string, unknown>) || {};

  const fmtDate = (value: unknown) => {
    const raw = typeof value === "string" ? value : "";
    if (!raw) return "-";
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return raw;
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  };

  let y = 48;
  if (logoPath) {
    try {
      doc.image(logoPath, 48, y, { fit: [42, 42], align: "left", valign: "top" });
    } catch {
      // Continue without logo if file cannot be parsed.
    }
  }

  doc.fontSize(19).fillColor("#111827").text(companyName, logoPath ? 98 : 48, y + 2, { align: "left" });
  doc.fontSize(11).fillColor("#6B7280").text("Offboarding Summary", logoPath ? 98 : 48, y + 25, { align: "left" });
  doc.fontSize(11).fillColor("#111827").text(`Checklist ID: ${String(checklist.id || "").slice(0, 8).toUpperCase()}`, 330, y + 8, {
    align: "right",
    width: 215,
  });

  y += 58;
  doc.moveTo(48, y).lineTo(547, y).strokeColor("#E5E7EB").lineWidth(1).stroke();
  y += 16;

  doc.roundedRect(48, y, 245, 96, 6).fillAndStroke("#F9FAFB", "#E5E7EB");
  doc.roundedRect(302, y, 245, 96, 6).fillAndStroke("#F9FAFB", "#E5E7EB");

  doc.fillColor("#6B7280").fontSize(9).text("EMPLOYEE", 60, y + 10);
  doc.fillColor("#111827").fontSize(11).text(checklist.employee?.full_name || "Employee", 60, y + 26);
  doc.fillColor("#4B5563").fontSize(10).text(checklist.employee?.email || "-", 60, y + 43);
  doc.fillColor("#4B5563").fontSize(10).text(checklist.employee?.job_title || "-", 60, y + 60);

  doc.fillColor("#6B7280").fontSize(9).text("OFFBOARDING DETAILS", 314, y + 10);
  doc.fillColor("#111827").fontSize(10).text(`Resignation Date: ${fmtDate(exit.resignation_date)}`, 314, y + 26);
  doc.fillColor("#111827").fontSize(10).text(`Last Working Day: ${fmtDate(exit.last_working_day)}`, 314, y + 43);
  doc.fillColor("#111827").fontSize(10).text(`Exit Type: ${String(exit.exit_type || "-")}`, 314, y + 60);

  y += 114;

  doc.roundedRect(48, y, 499, 82, 6).fillAndStroke("#FFFFFF", "#E5E7EB");
  doc.fillColor("#6B7280").fontSize(10).text("REASON", 60, y + 10);
  doc.fillColor("#111827").fontSize(10).text(String(exit.reason || "-"), 60, y + 28, {
    width: 475,
    height: 46,
  });

  y += 98;

  doc.roundedRect(48, y, 499, 150, 6).fillAndStroke("#FFFFFF", "#E5E7EB");
  doc.fillColor("#6B7280").fontSize(10).text("EXIT INTERVIEW", 60, y + 10);
  doc.fillColor("#111827").fontSize(10).text(`Completed: ${interview.completed_at ? "Yes" : "No"}`, 60, y + 30);
  doc.text(`Overall Experience: ${String(interview.overall_experience || "-")}`, 230, y + 30);
  doc.text(`Would Recommend: ${interview.would_recommend === true ? "Yes" : interview.would_recommend === false ? "No" : "-"}`, 395, y + 30, {
    width: 140,
    align: "right",
  });

  doc.fillColor("#374151").fontSize(10).text(`Reason Code: ${String(interview.reason || "-")}`, 60, y + 52);
  doc.fillColor("#6B7280").fontSize(9).text("Feedback", 60, y + 74);
  doc.fillColor("#111827").fontSize(10).text(String(interview.feedback || "-"), 60, y + 88, {
    width: 475,
    height: 22,
  });
  doc.fillColor("#6B7280").fontSize(9).text("Suggestions", 60, y + 112);
  doc.fillColor("#111827").fontSize(10).text(String(interview.suggestions || "-"), 60, y + 126, {
    width: 475,
    height: 20,
  });

  y += 168;
  doc.moveTo(48, y).lineTo(547, y).strokeColor("#E5E7EB").stroke();
  doc.fillColor("#6B7280").fontSize(9).text(
    `Generated on ${new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })} by ${companyName}.`,
    48,
    y + 10,
  );

  doc.end();
  return bufferPromise;
}

export async function createChecklist(input: {
  employee_id: string;
  template_id?: string;
  type?: string;
  joining_date?: string;
}) {
  const checklistType = input.type || CHECKLIST_TYPES.ONBOARDING;
  let tasks: any[] = [];
  let joiningDate = input.joining_date || null;
  let templateId: string | null = null;

  if (checklistType === CHECKLIST_TYPES.ONBOARDING) {
    // Onboarding is now milestone-driven (employee created + documents workflow), not task/template-driven.
    tasks = [];
    templateId = null;
  } else if (input.template_id) {
    const template = await getTemplateById(input.template_id);
    const templateTasks = (template.tasks as any[]) || [];
    const joiningTs = joiningDate ? new Date(joiningDate) : new Date();

    tasks = templateTasks.map((t: any) => {
      const dueDate = new Date(joiningTs);
      dueDate.setDate(dueDate.getDate() + (t.due_days_from_joining || 0));
      return {
        task_name: t.task_name,
        description: t.description || null,
        owner: t.owner || t.assigned_role || null,
        assigned_role: t.assigned_role || t.owner || null,
        due_date: dueDate.toISOString().split("T")[0],
        status: CHECKLIST_TASK_STATUSES.PENDING,
        completed_at: null,
        notes: null,
      };
    });
    templateId = input.template_id;
  }

  const { data, error } = await supabaseAdmin
    .from("onboarding_checklists")
    .insert({
      employee_id: input.employee_id,
      template_id: templateId,
      type: checklistType,
      joining_date: joiningDate,
      tasks: tasks as any,
    })
    .select()
    .single();

  if (error) throw new ApiError(ERROR_CODES.INTERNAL_ERROR, error.message);
  return enrichChecklistWithComputedFields(data);
}

// Called by recruitment.service.ts onHireTrigger — exported for lazy import
export async function createDefaultOnboardingChecklist(userId: string, joiningDate: string | null) {
  // Find the default onboarding template (e.g., the first general one)
  const { data: templates } = await supabaseAdmin
    .from("onboarding_templates")
    .select("id")
    .eq("type", CHECKLIST_TYPES.ONBOARDING)
    .is("department", null)
    .limit(1);

  const templateId = templates?.[0]?.id;

  return createChecklist({
    employee_id: userId,
    template_id: templateId,
    type: CHECKLIST_TYPES.ONBOARDING,
    joining_date: joiningDate || undefined,
  });
}

export async function updateChecklistTask(
  checklistId: string,
  taskIndex: number,
  input: { status: string; notes?: string },
) {
  const checklist = await getChecklistById(checklistId);
  const tasks = (checklist.tasks as any[]) || [];

  if (taskIndex < 0 || taskIndex >= tasks.length) {
    throw new ApiError(ERROR_CODES.VALIDATION_ERROR, `Task index ${taskIndex} out of bounds`);
  }

  const updatedTask = {
    ...tasks[taskIndex],
    status: input.status,
    notes: input.notes || tasks[taskIndex].notes,
    completed_at:
      input.status === CHECKLIST_TASK_STATUSES.DONE ? new Date().toISOString() : tasks[taskIndex].completed_at,
  };

  const updatedTasks = [...tasks];
  updatedTasks[taskIndex] = updatedTask;

  const { data, error } = await supabaseAdmin
    .from("onboarding_checklists")
    .update({ tasks: updatedTasks as any, updated_at: new Date().toISOString() })
    .eq("id", checklistId)
    .select()
    .single();

  if (error) throw new ApiError(ERROR_CODES.INTERNAL_ERROR, error.message);

  if (input.status === CHECKLIST_TASK_STATUSES.OVERDUE) {
    const checklistAny = checklist as any;
    await supabaseAdmin.from("notifications").insert({
      user_id: checklistAny.employee_id,
      title: "Onboarding task overdue",
      message: `A checklist task is overdue: ${updatedTask.task_name || "Task"}.`,
      type: "system",
      priority: "high",
    });
  }

  return enrichChecklistWithComputedFields(data);
}

// ============================================================
// OFFBOARDING
// ============================================================

export async function initiateOffboarding(
  employeeId: string,
  input: {
    resignation_date?: string;
    last_working_day: string;
    exit_type: string;
    reason?: string;
  },
) {
  // Find the default offboarding template
  const { data: templates } = await supabaseAdmin
    .from("onboarding_templates")
    .select("id")
    .eq("type", CHECKLIST_TYPES.OFFBOARDING)
    .limit(1);

  const templateId = templates?.[0]?.id;

  // Create offboarding checklist
  const { data: checklist, error } = await supabaseAdmin
    .from("onboarding_checklists")
    .insert({
      employee_id: employeeId,
      template_id: templateId || null,
      type: CHECKLIST_TYPES.OFFBOARDING,
      exit_details: {
        resignation_date: input.resignation_date || null,
        last_working_day: input.last_working_day,
        exit_type: input.exit_type,
        reason: input.reason || null,
        exit_interview_data: null,
      },
      tasks: [] as any,
    })
    .select()
    .single();

  if (error) throw new ApiError(ERROR_CODES.INTERNAL_ERROR, error.message);

  // Update employee status to reflect offboarding has started
  await supabaseAdmin
    .from("employee_profiles")
    .update({ hr_status: "on_leave", updated_at: new Date().toISOString() })
    .eq("user_id", employeeId);

  return enrichChecklistWithComputedFields(checklist);
}

export async function completeExitInterview(
  checklistId: string,
  exitInterviewData: Record<string, unknown>,
) {
  const checklist = await getChecklistById(checklistId);

  if ((checklist as any).type !== CHECKLIST_TYPES.OFFBOARDING) {
    throw new ApiError(ERROR_CODES.VALIDATION_ERROR, "Exit interviews are only for offboarding checklists");
  }

  const currentExitDetails = ((checklist as any).exit_details || {}) as Record<string, unknown>;
  const updatedExitDetails = {
    ...currentExitDetails,
    exit_interview_data: { ...exitInterviewData, completed_at: new Date().toISOString() },
  };

  const { data, error } = await supabaseAdmin
    .from("onboarding_checklists")
    .update({ exit_details: updatedExitDetails, updated_at: new Date().toISOString() })
    .eq("id", checklistId)
    .select()
    .single();

  if (error) throw new ApiError(ERROR_CODES.INTERNAL_ERROR, error.message);
  return enrichChecklistWithComputedFields(data);
}

export async function archiveEmployee(employeeId: string) {
  const { data, error } = await supabaseAdmin
    .from("employee_profiles")
    .update({ hr_status: "archived", updated_at: new Date().toISOString() })
    .eq("user_id", employeeId)
    .select()
    .single();

  if (error || !data) throw ApiError.notFound("Employee profile");

  // Also deactivate the user account
  await supabaseAdmin
    .from("users")
    .update({ is_active: false })
    .eq("id", employeeId);

  return data;
}
