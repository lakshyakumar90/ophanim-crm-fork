import { supabaseAdmin } from "../config/supabase.js";
import { ApiError } from "../utils/responses.js";
import { ERROR_CODES } from "../utils/error-codes.js";
import type { AuthUser } from "../types/api.types.js";

// ============================================================
// Utility
// ============================================================

function computeHireMetrics(candidates: any[]) {
  const hired = candidates.filter((c) => c.stage === "hired");
  const totalDays = hired.reduce((sum: number, c: any) => {
    if (c.applied_at && c.updated_at) {
      const diff = new Date(c.updated_at).getTime() - new Date(c.applied_at).getTime();
      return sum + diff / (1000 * 60 * 60 * 24);
    }
    return sum;
  }, 0);
  return {
    hired: hired.length,
    avgTimeToHire: hired.length ? Math.round(totalDays / hired.length) : null,
  };
}

// ============================================================
// JOB POSTINGS
// ============================================================

export async function getJobPostings(filters: {
  status?: string;
  department?: string;
  search?: string;
}) {
  let query = supabaseAdmin
    .from("job_postings")
    .select("*, posted_by_user:users!posted_by(id, full_name)")
    .order("created_at", { ascending: false });

  if (filters.status) query = query.eq("status", filters.status);
  if (filters.department) query = query.eq("department", filters.department);
  if (filters.search) query = query.ilike("title", `%${filters.search}%`);

  const { data, error } = await query;
  if (error) throw new ApiError(ERROR_CODES.INTERNAL_ERROR, error.message);
  return data || [];
}

export async function getJobPostingById(id: string) {
  const { data, error } = await supabaseAdmin
    .from("job_postings")
    .select("*, posted_by_user:users!posted_by(id, full_name)")
    .eq("id", id)
    .single();

  if (error || !data) throw ApiError.notFound("Job posting");
  return data;
}

export async function createJobPosting(
  input: Record<string, unknown>,
  userId: string,
) {
  const { data, error } = await supabaseAdmin
    .from("job_postings")
    .insert({ ...input, posted_by: userId })
    .select()
    .single();

  if (error) throw new ApiError(ERROR_CODES.INTERNAL_ERROR, error.message);
  return data;
}

export async function updateJobPosting(id: string, input: Record<string, unknown>) {
  await getJobPostingById(id); // 404 if not found

  const { data, error } = await supabaseAdmin
    .from("job_postings")
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) throw new ApiError(ERROR_CODES.INTERNAL_ERROR, error.message);
  return data;
}

// ============================================================
// CANDIDATES
// ============================================================

export async function getCandidates(filters: {
  job_posting_id?: string;
  stage?: string;
  search?: string;
  page?: number;
  limit?: number;
}) {
  const page = filters.page || 1;
  const limit = Math.min(filters.limit || 20, 100);
  const offset = (page - 1) * limit;

  let query = supabaseAdmin
    .from("candidates")
    .select("*, job_postings(id, title)", { count: "exact" })
    .order("applied_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (filters.job_posting_id) query = query.eq("job_posting_id", filters.job_posting_id);
  if (filters.stage) query = query.eq("stage", filters.stage);
  if (filters.search)
    query = query.or(`full_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`);

  const { data, error, count } = await query;
  if (error) throw new ApiError(ERROR_CODES.INTERNAL_ERROR, error.message);

  return {
    data: data || [],
    total: count || 0,
    page,
    limit,
    totalPages: Math.ceil((count || 0) / limit),
  };
}

export async function getCandidateById(id: string) {
  const { data, error } = await supabaseAdmin
    .from("candidates")
    .select("*, job_postings(id, title), interviews(*)")
    .eq("id", id)
    .single();

  if (error || !data) throw ApiError.notFound("Candidate");
  const interviews = Array.isArray((data as any).interviews)
    ? (data as any).interviews
    : [];
  const scored = interviews.filter((i: any) => typeof i.score === "number");
  const average_score = scored.length
    ? Number(
        (
          scored.reduce((sum: number, i: any) => sum + Number(i.score), 0) /
          scored.length
        ).toFixed(2),
      )
    : null;
  return { ...data, average_score };
}

export async function createCandidate(
  input: Record<string, unknown>,
) {
  const { data, error } = await supabaseAdmin
    .from("candidates")
    .insert({ ...input, stage: "applied", stage_history: [] })
    .select()
    .single();

  if (error) throw new ApiError(ERROR_CODES.INTERNAL_ERROR, error.message);
  return data;
}

export async function updateCandidate(id: string, input: Record<string, unknown>) {
  await getCandidateById(id); // 404 guard

  const { data, error } = await supabaseAdmin
    .from("candidates")
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) throw new ApiError(ERROR_CODES.INTERNAL_ERROR, error.message);
  return data;
}

export async function moveCandidateStage(
  id: string,
  newStage: string,
  movedByUserId: string,
  notes?: string,
) {
  const candidate = await getCandidateById(id);

  // Prevent hired candidates from being moved again
  if (candidate.stage === "hired") {
    throw new ApiError(ERROR_CODES.VALIDATION_ERROR, "Hired candidates cannot be moved to another stage");
  }

  const stageHistoryEntry = {
    from_stage: candidate.stage,
    to_stage: newStage,
    moved_by: movedByUserId,
    moved_at: new Date().toISOString(),
    notes: notes || null,
  };

  const updatedHistory = [...((candidate.stage_history as any[]) || []), stageHistoryEntry];

  const { data, error } = await supabaseAdmin
    .from("candidates")
    .update({
      stage: newStage,
      stage_history: updatedHistory as any,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) throw new ApiError(ERROR_CODES.INTERNAL_ERROR, error.message);

  // Trigger hire flow
  if (newStage === "hired") {
    await onHireTrigger(id, candidate);
  }

  return data;
}

// ============================================================
// ON-HIRE TRIGGER (Fix #1)
// Flow: Create users row → Create employee_profiles row → Update candidate
// ============================================================

async function onHireTrigger(candidateId: string, candidate: any) {
  try {
    // 1. Create Supabase Auth user (temp password, must reset on first login)
    const tempPassword = `Ophanim@${Math.random().toString(36).slice(2, 10)}!`;
    const { data: authUser, error: authErr } = await supabaseAdmin.auth.admin.createUser({
      email: candidate.email,
      password: tempPassword,
      email_confirm: true, // skip email verification for HR-created accounts
    });

    if (authErr || !authUser.user) {
      throw new ApiError(ERROR_CODES.INTERNAL_ERROR, `Failed to create auth user: ${authErr?.message}`);
    }

    const userId = authUser.user.id;

    // 2. Create users table row
    const { error: userErr } = await supabaseAdmin
      .from("users")
      .insert({
        id: userId,
        email: candidate.email,
        full_name: candidate.full_name,
        role: "employee",
        is_active: true,
      });

    if (userErr) throw new ApiError(ERROR_CODES.INTERNAL_ERROR, `Failed to create user record: ${userErr.message}`);

    // 3. Create employee_profiles row pre-filled from candidate
    const { error: profileErr } = await supabaseAdmin
      .from("employee_profiles")
      .insert({
        user_id: userId,
        hr_status: "probation",
        designation: candidate.offer?.designation || null,
      });

    if (profileErr) throw new ApiError(ERROR_CODES.INTERNAL_ERROR, `Failed to create employee profile: ${profileErr.message}`);

    // 4. Link candidate to new user
    await supabaseAdmin
      .from("candidates")
      .update({ converted_to_user_id: userId, updated_at: new Date().toISOString() })
      .eq("id", candidateId);

    // 5. Notify the new hire. Onboarding is now created manually by HR from the onboarding module.
    await supabaseAdmin.from("notifications").insert({
      user_id: userId,
      title: "Welcome to the team! 🎉",
      message: "Your profile has been created. HR will initiate your onboarding shortly.",
      type: "system",
      priority: "high",
    });

  } catch (err) {
    // Log but don't throw — candidate stage is already updated
    console.error("[HR] onHireTrigger failed:", err);
  }
}

// ============================================================
// INTERVIEWS
// ============================================================

export async function getInterviewsForCandidate(candidateId: string) {
  const { data, error } = await supabaseAdmin
    .from("interviews")
    .select("*, interviewer:users!interviewer_id(id, full_name, avatar_url)")
    .eq("candidate_id", candidateId)
    .order("round", { ascending: true });

  if (error) throw new ApiError(ERROR_CODES.INTERNAL_ERROR, error.message);
  return data || [];
}

export async function scheduleInterview(candidateId: string, input: Record<string, unknown>) {
  // Ensure candidate exists
  await getCandidateById(candidateId);

  const { data, error } = await supabaseAdmin
    .from("interviews")
    .insert({ ...input, candidate_id: candidateId, status: "scheduled" })
    .select()
    .single();

  if (error) throw new ApiError(ERROR_CODES.INTERNAL_ERROR, error.message);
  return data;
}

export async function updateInterview(id: string, input: Record<string, unknown>) {
  // interviews table has no updated_at column (see 001_hr_department_schema.sql)
  const { data, error } = await supabaseAdmin
    .from("interviews")
    .update({ ...input })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      throw ApiError.notFound("Interview");
    }
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
  }
  if (!data) throw ApiError.notFound("Interview");
  return data;
}

// ============================================================
// OFFER LETTER
// ============================================================

export async function sendOffer(
  candidateId: string,
  input: { ctc: number; joining_date: string; designation: string },
) {
  const candidate = await getCandidateById(candidateId);

  if (candidate.stage === "hired" || candidate.stage === "rejected") {
    throw new ApiError(ERROR_CODES.VALIDATION_ERROR, "Cannot send offer to a hired or rejected candidate");
  }

  const offer = {
    ctc: input.ctc,
    joining_date: input.joining_date,
    designation: input.designation,
    sent_at: new Date().toISOString(),
    response: "pending",
    response_at: null,
  };

  const { data, error } = await supabaseAdmin
    .from("candidates")
    .update({ offer, stage: "offer_sent", updated_at: new Date().toISOString() })
    .eq("id", candidateId)
    .select()
    .single();

  if (error) throw new ApiError(ERROR_CODES.INTERNAL_ERROR, error.message);
  return data;
}

export async function recordOfferResponse(
  candidateId: string,
  response: "accepted" | "declined",
  userId: string,
) {
  const candidate = await getCandidateById(candidateId);

  if (candidate.stage !== "offer_sent") {
    throw new ApiError(ERROR_CODES.VALIDATION_ERROR, "Candidate must be in offer_sent stage");
  }

  const updatedOffer = { ...(candidate.offer as any), response, response_at: new Date().toISOString() };
  const newStage = response === "accepted" ? "hired" : "rejected";

  return moveCandidateStage(candidateId, newStage, userId);
}

// ============================================================
// METRICS
// ============================================================

export async function getRecruitmentMetrics() {
  const { data: postings } = await supabaseAdmin
    .from("job_postings")
    .select("id, title, status, positions_open");

  const { data: candidates } = await supabaseAdmin
    .from("candidates")
    .select("id, stage, source, applied_at, updated_at, job_posting_id");

  const allCandidates = candidates || [];
  const allPostings = postings || [];

  // Stage distribution
  const stageDistribution = allCandidates.reduce(
    (acc: Record<string, number>, c: any) => {
      acc[c.stage] = (acc[c.stage] || 0) + 1;
      return acc;
    },
    {},
  );

  // Source effectiveness
  const sourceMap = allCandidates.reduce(
    (acc: Record<string, { total: number; hired: number }>, c: any) => {
      const src = c.source || "unknown";
      if (!acc[src]) acc[src] = { total: 0, hired: 0 };
      acc[src].total++;
      if (c.stage === "hired") acc[src].hired++;
      return acc;
    },
    {},
  );

  const { hired, avgTimeToHire } = computeHireMetrics(allCandidates);

  const offerSent = allCandidates.filter(
    (c: any) => ["offer_sent", "hired", "rejected"].includes(c.stage) && (c.offer as any)?.response,
  );
  const offerAccepted = offerSent.filter((c: any) => (c.offer as any)?.response === "accepted");
  const offerAcceptanceRate = offerSent.length
    ? Math.round((offerAccepted.length / offerSent.length) * 100)
    : null;

  return {
    openPositions: allPostings.filter((p: any) => p.status === "open").length,
    totalCandidates: allCandidates.length,
    stageDistribution,
    sourceEffectiveness: sourceMap,
    totalHired: hired,
    avgTimeToHireDays: avgTimeToHire,
    offerAcceptanceRate,
  };
}
